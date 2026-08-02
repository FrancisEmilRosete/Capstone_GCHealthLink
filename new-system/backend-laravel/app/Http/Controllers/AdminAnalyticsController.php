<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ClinicVisit;
use App\Models\Inventory;
use App\Models\VisitMedicine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function getAnalytics(Request $request)
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        
        // 1. All Visits with student profile courseDept
        $visits = ClinicVisit::with('studentProfile:id,course_dept')
            ->select('id', 'concern_tag', 'visit_date', 'visit_time', 'student_profile_id', 'created_at')
            ->get();
            
        $totalVisits = $visits->count();

        // 2. Top Concerns
        $concernGroups = ClinicVisit::select('concern_tag', DB::raw('count(*) as total'))
            ->whereNotNull('concern_tag')
            ->where('concern_tag', '!=', '')
            ->groupBy('concern_tag')
            ->orderBy('total', 'desc')
            ->limit(7)
            ->get();

        $topConcerns = $concernGroups->map(function ($group) {
            return [
                'tag' => ucwords(strtolower(str_replace(['_', '-'], ' ', trim($group->concern_tag)))),
                'count' => $group->total
            ];
        })->toArray();

        // 3. Department Heatmap
        $departmentHeatmap = [];
        foreach ($visits as $visit) {
            $dept = $visit->studentProfile?->course_dept ? trim($visit->studentProfile->course_dept) : 'Unspecified';
            if ($dept === '') $dept = 'Unspecified';
            
            if (!isset($departmentHeatmap[$dept])) {
                $departmentHeatmap[$dept] = 0;
            }
            $departmentHeatmap[$dept]++;
        }

        // 4. Outbreak Watch
        $outbreakWatch = $this->createOutbreakWatch($visits);

        // 5. Monthly & Weekly Visits
        $monthlyVisits = $this->createMonthlySeries($visits);
        $weeklyVisits = $this->createWeeklySeries($visits);

        // 6. Resource Prediction
        $resourcePrediction = $this->createResourcePrediction($visits);

        // 7. Inventory Summary & Projected Stockouts
        $inventoryItems = Inventory::select('id', 'item_name', 'current_stock', 'reorder_threshold', 'expiration_date', 'unit')->get();
        $inventorySummary = [
            'expired' => 0,
            'expiringSoon' => 0,
            'nearReorder' => 0,
            'outOfStock' => 0,
        ];
        
        foreach ($inventoryItems as $item) {
            if ($item->current_stock == 0) {
                $inventorySummary['outOfStock']++;
            }
            if ($item->current_stock <= $item->reorder_threshold) {
                $inventorySummary['nearReorder']++;
            }
            if ($item->expiration_date) {
                $exp = Carbon::parse($item->expiration_date);
                if ($exp->isPast()) {
                    $inventorySummary['expired']++;
                } elseif ($exp->copy()->subDays(30)->isPast()) {
                    $inventorySummary['expiringSoon']++;
                }
            }
        }

        // Forecast / Projected Stockouts
        $dispensed = VisitMedicine::with('inventory:id,item_name,current_stock,unit')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->where('status', 'DISPENSED')
            ->get();

        $forecastMap = [];
        foreach ($dispensed as $d) {
            if (!$d->inventory) continue;
            if (!isset($forecastMap[$d->inventory_id])) {
                $forecastMap[$d->inventory_id] = [
                    'id' => $d->inventory_id,
                    'name' => $d->inventory->item_name,
                    'currentStock' => $d->inventory->current_stock,
                    'unit' => $d->inventory->unit,
                    'totalUsed' => 0
                ];
            }
            $forecastMap[$d->inventory_id]['totalUsed'] += $d->quantity;
        }

        $projectedStockouts = [];
        foreach ($forecastMap as $item) {
            $dailyUsage = $item['totalUsed'] / 30;
            $daysUntilDepletion = $dailyUsage > 0 ? floor($item['currentStock'] / $dailyUsage) : 999;
            $projectedStockouts[] = [
                'id' => $item['id'],
                'itemName' => $item['name'],
                'currentStock' => $item['currentStock'],
                'projectedDaysRemaining' => $daysUntilDepletion,
                'projectedDailyUsage' => round($dailyUsage, 2),
                'status' => $daysUntilDepletion < 7 ? 'critical' : 'warning'
            ];
        }
        usort($projectedStockouts, fn($a, $b) => $a['projectedDaysRemaining'] <=> $b['projectedDaysRemaining']);

        $resourcePrediction['projectedStockouts'] = $projectedStockouts;

        return response()->json([
            'success' => true,
            'message' => 'Admin analytics retrieved',
            'data' => [
                'totalVisits' => $totalVisits,
                'topConcerns' => $topConcerns,
                'departmentHeatmap' => $departmentHeatmap,
                'outbreakWatch' => $outbreakWatch,
                'monthlyVisits' => $monthlyVisits,
                'weeklyVisits' => $weeklyVisits,
                'resourcePrediction' => $resourcePrediction,
                'inventorySummary' => $inventorySummary,
            ]
        ]);
    }

    public function getTrends(Request $request)
    {
        $visits = ClinicVisit::all();
        $totalVisits = $visits->count();

        // concerns
        $concernGroups = ClinicVisit::select('concern_tag', DB::raw('count(*) as total'))
            ->whereNotNull('concern_tag')
            ->where('concern_tag', '!=', '')
            ->groupBy('concern_tag')
            ->orderBy('total', 'desc')
            ->limit(7)
            ->get();

        $concerns = $concernGroups->map(function ($group) {
            return [
                'tag' => ucwords(strtolower(str_replace(['_', '-'], ' ', trim($group->concern_tag)))),
                'count' => $group->total
            ];
        })->toArray();

        // monthly
        $monthly = $this->createMonthlySeries($visits);

        // weekly
        $weekly = $this->createWeeklySeries($visits);

        return response()->json([
            'success' => true,
            'message' => 'Trends retrieved',
            'data' => [
                'totalVisits' => $totalVisits,
                'monthly' => $monthly,
                'weekly' => $weekly,
                'concerns' => $concerns,
            ]
        ]);
    }

    public function getHealthConcerns(Request $request)
    {
        $visits = ClinicVisit::with('studentProfile:id,course_dept')
            ->whereNotNull('concern_tag')
            ->where('concern_tag', '!=', '')
            ->get();

        $departments = [];
        foreach ($visits as $visit) {
            $dept = $visit->studentProfile?->course_dept ? trim($visit->studentProfile->course_dept) : 'UNSPECIFIED';
            if ($dept === '') $dept = 'UNSPECIFIED';
            $tag = $visit->concern_tag;

            if (!isset($departments[$dept])) {
                $departments[$dept] = [];
            }
            if (!isset($departments[$dept][$tag])) {
                $departments[$dept][$tag] = 0;
            }
            $departments[$dept][$tag]++;
        }

        $data = [];
        foreach ($departments as $dept => $tags) {
            $concerns = [];
            foreach ($tags as $tag => $count) {
                $concerns[] = [
                    'tag' => $tag,
                    'count' => $count
                ];
            }
            usort($concerns, fn($a, $b) => $b['count'] <=> $a['count']);

            $data[] = [
                'department' => $dept,
                'concerns' => $concerns
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Health concerns retrieved',
            'data' => $data
        ]);
    }

    private function createOutbreakWatch($visits)
    {
        $now = Carbon::now();
        $recentWindowStart = $now->copy()->subHours(48);
        $baselineWindowStart = $now->copy()->subDays(14);
        $counter = [];

        foreach ($visits as $visit) {
            $date = $visit->visit_date ? Carbon::parse($visit->visit_date) : $visit->created_at;
            if ($date->isBefore($baselineWindowStart)) continue;

            $concernTag = strtoupper(trim(str_replace(['_', '-'], ' ', $visit->concern_tag ?? '')));
            // Minimal outbreak detection: only focus on typical communicable tags
            $isOutbreak = preg_match('/FEVER|COUGH|FLU|COLD|VIRUS|DIARRHEA|DENGUE/i', $concernTag);
            if (!$isOutbreak) continue;

            $dept = $visit->studentProfile?->course_dept ? trim($visit->studentProfile->course_dept) : 'Unspecified';
            if ($dept === '') $dept = 'Unspecified';
            $key = $dept . '::' . $concernTag;
            
            if (!isset($counter[$key])) {
                $counter[$key] = ['dept' => $dept, 'concernTag' => $concernTag, 'recent' => 0, 'baseline' => 0];
            }

            if ($date->isAfter($recentWindowStart)) {
                $counter[$key]['recent']++;
            } else {
                $counter[$key]['baseline']++;
            }
        }

        $alerts = [];
        foreach ($counter as $bucket) {
            $baselinePer48h = $bucket['baseline'] / 6;
            $spikeRatio = $bucket['recent'] / max(1, $baselinePer48h);

            $level = 'GREEN';
            if ($bucket['recent'] >= 4 || $spikeRatio >= 3) {
                $level = 'RED';
            } elseif ($bucket['recent'] >= 2 || $spikeRatio >= 1.8) {
                $level = 'YELLOW';
            }

            if ($level === 'GREEN') continue;

            $alerts[] = [
                'level' => $level,
                'cases' => $bucket['recent'],
                'message' => "{$bucket['concernTag']} trend in {$bucket['dept']} over the last 48 hours."
            ];
        }

        usort($alerts, function($a, $b) {
            $levels = ['RED' => 3, 'YELLOW' => 2, 'GREEN' => 1];
            $delta = $levels[$b['level']] - $levels[$a['level']];
            if ($delta !== 0) return $delta;
            return $b['cases'] - $a['cases'];
        });

        return empty($alerts) ? "Green - No clusters detected" : $alerts;
    }

    private function createMonthlySeries($visits)
    {
        $months = [];
        $now = Carbon::now();
        for ($i = 5; $i >= 0; $i--) {
            $d = $now->copy()->subMonths($i);
            $months[$d->format('M Y')] = 0;
        }

        foreach ($visits as $visit) {
            $date = $visit->visit_date ? Carbon::parse($visit->visit_date) : $visit->created_at;
            $label = $date->format('M Y');
            if (isset($months[$label])) {
                $months[$label]++;
            }
        }

        $series = [];
        foreach ($months as $month => $count) {
            $series[] = ['month' => $month, 'count' => $count];
        }
        return $series;
    }

    private function createWeeklySeries($visits)
    {
        $days = ['Sun'=>0, 'Mon'=>0, 'Tue'=>0, 'Wed'=>0, 'Thu'=>0, 'Fri'=>0, 'Sat'=>0];
        foreach ($visits as $visit) {
            $date = $visit->visit_date ? Carbon::parse($visit->visit_date) : $visit->created_at;
            if ($date->isAfter(Carbon::now()->subDays(30))) {
                $days[$date->format('D')]++;
            }
        }
        
        $series = [];
        foreach ($days as $day => $count) {
            $series[] = ['day' => $day, 'count' => $count];
        }
        return $series;
    }

    private function createResourcePrediction($visits)
    {
        if ($visits->isEmpty()) {
            return [
                'busiestHour' => ['hour' => 'N/A', 'count' => 0],
                'busiestDay' => ['day' => 'N/A', 'count' => 0],
                'recentTrend' => ['direction' => 'stable', 'percentChange' => 0],
                'expectedVisitsNext7Days' => 0,
                'recommendedStaffing' => '1 clinic staff on standby'
            ];
        }

        $hourlyCounts = array_fill(0, 24, 0);
        $weekdayCounts = array_fill(0, 7, 0);
        $now = Carbon::now();
        $recentStart = $now->copy()->subDays(14);
        $previousStart = $now->copy()->subDays(28);
        
        $recentCount = 0;
        $previousCount = 0;

        foreach ($visits as $visit) {
            $date = $visit->visit_date ? Carbon::parse($visit->visit_date) : $visit->created_at;
            
            if ($visit->visit_time) {
                $hour = (int) substr($visit->visit_time, 0, 2);
                if ($hour >= 0 && $hour < 24) $hourlyCounts[$hour]++;
            } else {
                $hourlyCounts[$date->hour]++;
            }
            
            $weekdayCounts[$date->dayOfWeek]++;

            if ($date->isAfter($recentStart)) {
                $recentCount++;
            } elseif ($date->isAfter($previousStart)) {
                $previousCount++;
            }
        }

        $busiestHour = array_search(max($hourlyCounts), $hourlyCounts);
        $busiestDay = array_search(max($weekdayCounts), $weekdayCounts);
        
        $labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        $percentChange = $previousCount === 0 
            ? ($recentCount > 0 ? 100 : 0) 
            : round((($recentCount - $previousCount) / $previousCount) * 100);
            
        $direction = 'stable';
        if ($percentChange > 12) $direction = 'up';
        if ($percentChange < -12) $direction = 'down';

        $avgDaily = $recentCount / 14;
        $growth = $previousCount > 0 ? min(1.6, max(0.6, $recentCount / $previousCount)) : ($recentCount > 0 ? 1.1 : 1);
        $expected = max(0, round($avgDaily * 7 * $growth));

        $staffing = "1 clinic staff on standby";
        if ($expected >= 70) $staffing = "3 nurses + 1 physician on rotation";
        elseif ($expected >= 35) $staffing = "2 nurses + 1 clinician on duty";
        elseif ($expected >= 14) $staffing = "1 nurse + 1 support staff";

        return [
            'busiestHour' => ['hour' => sprintf("%02d:00", $busiestHour), 'count' => $hourlyCounts[$busiestHour]],
            'busiestDay' => ['day' => $labels[$busiestDay], 'count' => $weekdayCounts[$busiestDay]],
            'recentTrend' => ['direction' => $direction, 'percentChange' => $percentChange],
            'expectedVisitsNext7Days' => $expected,
            'recommendedStaffing' => $staffing
        ];
    }
}
