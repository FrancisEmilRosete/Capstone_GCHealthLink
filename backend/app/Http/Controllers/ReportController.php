<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ClinicVisit;
use App\Models\PhysicalExamination;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    private const VALID_REPORT_TYPES = [
        'medical_consultation',
        'physical_examination',
        'dental_consultation',
        'dental_examination'
    ];

    private const VALID_RANGES = [
        'daily', 'weekly', 'monthly', 'quarterly', 'semi-annually', 'yearly'
    ];

    private const DENTAL_CONDITION_RULES = [
        ['label' => 'Gingivitis', 'keywords' => ['gingivitis', 'gum disease', 'gum inflammation', 'gingival']],
        ['label' => 'Caries', 'keywords' => ['caries', 'cavity', 'tooth decay', 'dental caries', 'decayed']],
        ['label' => 'Periodontitis / Pulpitis', 'keywords' => ['periodontitis', 'pulpitis', 'pulp infection', 'periodontal']],
        ['label' => 'Periapical Abscess', 'keywords' => ['abscess', 'periapical', 'dental abscess', 'apical']],
        ['label' => 'Toothache / Pain', 'keywords' => ['toothache', 'tooth pain', 'molar pain', 'tooth ache', 'dental pain']],
        ['label' => 'Prophylaxis / Cleaning', 'keywords' => ['prophylaxis', 'cleaning', 'scaling', 'polishing', 'oral hygiene']],
        ['label' => 'Extraction', 'keywords' => ['extraction', 'tooth extraction', 'cabut', 'remove tooth']],
    ];

    public function generateReport(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $range = $request->query('range');
        $date = $request->query('date', now()->format('Y-m-d'));

        if (!in_array($type, self::VALID_REPORT_TYPES)) {
            return response()->json(['success' => false, 'message' => "Invalid type. Must be one of: " . implode(', ', self::VALID_REPORT_TYPES)], 400);
        }

        if (!in_array($range, self::VALID_RANGES)) {
            return response()->json(['success' => false, 'message' => "Invalid range. Must be one of: " . implode(', ', self::VALID_RANGES)], 400);
        }

        $user = $request->user();
        $staffType = strtoupper($user->clinic_staff_type ?? 'NURSE');

        if ($staffType === 'DOCTOR' && str_starts_with($type, 'dental_')) {
            return response()->json(['success' => false, 'message' => 'Doctors are not authorized to access dental reports.'], 403);
        }

        if ($staffType === 'DENTIST' && (str_starts_with($type, 'medical_') || $type === 'physical_examination')) {
            return response()->json(['success' => false, 'message' => 'Dentists are not authorized to access medical reports.'], 403);
        }

        $periods = $this->getDateBoundaries($range, $date);

        if ($type === 'medical_consultation') {
            $tables = $this->buildMedicalConsultationReport($periods);
        } elseif ($type === 'physical_examination') {
            $tables = $this->buildPhysicalExaminationReport($periods);
        } elseif ($type === 'dental_consultation') {
            $tables = $this->buildDentalConsultationReport($periods);
        } elseif ($type === 'dental_examination') {
            $tables = $this->buildDentalExaminationReport($periods);
        } else {
            return response()->json(['success' => false, 'message' => 'Unhandled report type.'], 400);
        }

        $meta = [
            'type' => $type,
            'range' => $range,
            'date' => $date,
            'periods' => array_column($periods, 'label'),
        ];

        $insights = $this->generateInsights($tables['table1'], $tables['table2'], $meta);

        AuditLog::record(
            'GENERATED_REPORT',
            'Generated ' . $type . ' report',
            null,
            ['reportType' => $type, 'range' => $range, 'date' => $date]
        );

        return response()->json([
            'success' => true,
            'meta' => $meta,
            'data' => [
                'table1' => $tables['table1'],
                'table2' => $tables['table2'],
                'insights' => $insights
            ]
        ]);
    }

    private function getDateBoundaries($range, $dateStr)
    {
        $baseDate = \Carbon\Carbon::parse($dateStr);
        $periods = [];

        if ($range === 'daily') {
            $periods[] = ['label' => $baseDate->format('M d, Y'), 'start' => $baseDate->copy()->startOfDay(), 'end' => $baseDate->copy()->endOfDay()];
        } elseif ($range === 'weekly') {
            // Mon to Sun
            $start = $baseDate->copy()->startOfWeek();
            $end = $baseDate->copy()->endOfWeek();
            $periods[] = ['label' => "{$start->format('M d')} - {$end->format('M d, Y')}", 'start' => $start, 'end' => $end];
        } elseif ($range === 'monthly') {
            // By week for the month
            $start = $baseDate->copy()->startOfMonth();
            $end = $baseDate->copy()->endOfMonth();
            $curr = $start->copy();
            $weekNum = 1;
            while ($curr <= $end) {
                $weekEnd = $curr->copy()->endOfWeek();
                if ($weekEnd > $end) $weekEnd = $end->copy();
                $periods[] = ['label' => "Week {$weekNum} ({$curr->format('M d')}-{$weekEnd->format('M d')})", 'start' => $curr->copy()->startOfDay(), 'end' => $weekEnd->copy()->endOfDay()];
                $curr = $weekEnd->copy()->addDay();
                $weekNum++;
            }
        } elseif ($range === 'quarterly') {
            // 3 months
            $start = $baseDate->copy()->firstOfQuarter();
            $end = $baseDate->copy()->lastOfQuarter();
            for ($i = 0; $i < 3; $i++) {
                $monthStart = $start->copy()->addMonths($i);
                $periods[] = ['label' => $monthStart->format('F Y'), 'start' => $monthStart->copy()->startOfMonth(), 'end' => $monthStart->copy()->endOfMonth()];
            }
        } elseif ($range === 'semi-annually') {
            // 6 months
            $monthStart = $baseDate->copy()->month <= 6 ? $baseDate->copy()->month(1)->startOfMonth() : $baseDate->copy()->month(7)->startOfMonth();
            for ($i = 0; $i < 6; $i++) {
                $curr = $monthStart->copy()->addMonths($i);
                $periods[] = ['label' => $curr->format('F Y'), 'start' => $curr->copy()->startOfMonth(), 'end' => $curr->copy()->endOfMonth()];
            }
        } elseif ($range === 'yearly') {
            // 12 months
            $start = $baseDate->copy()->startOfYear();
            for ($i = 0; $i < 12; $i++) {
                $curr = $start->copy()->addMonths($i);
                $periods[] = ['label' => $curr->format('F Y'), 'start' => $curr->copy()->startOfMonth(), 'end' => $curr->copy()->endOfMonth()];
            }
        }

        return $periods;
    }

    private function normSex($sex)
    {
        $s = strtolower(trim((string)$sex));
        if ($s === 'male' || $s === 'm') return 'male';
        if ($s === 'female' || $s === 'f') return 'female';
        return 'unknown';
    }

    private function buildMedicalConsultationReport(array $periods)
    {
        $start = $periods[0]['start'];
        $end = $periods[count($periods) - 1]['end'];

        $visits = ClinicVisit::with('studentProfile')
            ->whereBetween('visit_date', [$start, $end])
            ->whereHas('handledBy', function ($q) {
                $q->whereIn('clinic_staff_type', ['NURSE', 'DOCTOR']);
            })
            ->get();

        $table1 = [];
        foreach ($periods as $p) {
            $inPeriod = $visits->filter(function($v) use ($p) {
                return $v->visit_date >= $p['start'] && $v->visit_date <= $p['end'];
            });
            $male = $inPeriod->filter(fn($v) => $this->normSex($v->studentProfile?->sex) === 'male')->count();
            $table1[] = [
                'period' => $p['label'],
                'male' => $male,
                'female' => $inPeriod->count() - $male,
                'total' => $inPeriod->count(),
            ];
        }

        $tally = [];
        foreach ($visits as $v) {
            $tag = $v->concern_tag ?: 'General Consultation';
            if (!isset($tally[$tag])) $tally[$tag] = ['male' => 0, 'female' => 0];
            $s = $this->normSex($v->studentProfile?->sex);
            if ($s === 'male') $tally[$tag]['male']++;
            else $tally[$tag]['female']++;
        }

        $table2 = [];
        foreach ($tally as $complaint => $c) {
            $table2[] = [
                'complaint' => $complaint,
                'male' => $c['male'],
                'female' => $c['female'],
                'total' => $c['male'] + $c['female'],
            ];
        }
        usort($table2, fn($a, $b) => $b['total'] <=> $a['total']);

        return ['table1' => $table1, 'table2' => $table2];
    }

    private function buildPhysicalExaminationReport(array $periods)
    {
        $start = $periods[0]['start'];
        $end = $periods[count($periods) - 1]['end'];

        $exams = PhysicalExamination::with('studentProfile')
            ->whereBetween('exam_date', [$start, $end])
            ->get();

        $table1 = [];
        foreach ($periods as $p) {
            $inPeriod = $exams->filter(function($e) use ($p) {
                return $e->exam_date >= $p['start'] && $e->exam_date <= $p['end'];
            });
            $male = $inPeriod->filter(fn($e) => $this->normSex($e->studentProfile?->sex) === 'male')->count();
            $table1[] = [
                'period' => $p['label'],
                'male' => $male,
                'female' => $inPeriod->count() - $male,
                'total' => $inPeriod->count(),
            ];
        }

        $tally = [];
        foreach ($exams as $e) {
            $reason = trim((string)($e->others ?: 'General Clearance'));
            if (!isset($tally[$reason])) $tally[$reason] = ['male' => 0, 'female' => 0];
            $s = $this->normSex($e->studentProfile?->sex);
            if ($s === 'male') $tally[$reason]['male']++;
            else $tally[$reason]['female']++;
        }

        $table2 = [];
        foreach ($tally as $reason => $c) {
            $table2[] = [
                'reason' => $reason,
                'male' => $c['male'],
                'female' => $c['female'],
                'total' => $c['male'] + $c['female'],
            ];
        }
        usort($table2, fn($a, $b) => $b['total'] <=> $a['total']);

        return ['table1' => $table1, 'table2' => $table2];
    }

    private function buildDentalConsultationReport(array $periods)
    {
        $start = $periods[0]['start'];
        $end = $periods[count($periods) - 1]['end'];

        $visits = ClinicVisit::with('studentProfile')
            ->whereBetween('visit_date', [$start, $end])
            ->whereHas('handledBy', function ($q) {
                $q->where('clinic_staff_type', 'DENTIST');
            })
            ->get();

        $table1 = [];
        foreach ($periods as $p) {
            $inPeriod = $visits->filter(function($v) use ($p) {
                return $v->visit_date >= $p['start'] && $v->visit_date <= $p['end'];
            });
            $male = $inPeriod->filter(fn($v) => $this->normSex($v->studentProfile?->sex) === 'male')->count();
            $table1[] = [
                'period' => $p['label'],
                'male' => $male,
                'female' => $inPeriod->count() - $male,
                'total' => $inPeriod->count(),
            ];
        }

        $tally = [];
        foreach ($visits as $v) {
            $plaintext = $v->chief_complaint_enc; // We assume it's unencrypted in memory or handled automatically by accessor
            $reason = $plaintext ?: 'General Dental Consultation';
            if (!isset($tally[$reason])) $tally[$reason] = ['male' => 0, 'female' => 0];
            $s = $this->normSex($v->studentProfile?->sex);
            if ($s === 'male') $tally[$reason]['male']++;
            else $tally[$reason]['female']++;
        }

        $table2 = [];
        foreach ($tally as $reason => $c) {
            $table2[] = [
                'reason' => $reason,
                'male' => $c['male'],
                'female' => $c['female'],
                'total' => $c['male'] + $c['female'],
            ];
        }
        usort($table2, fn($a, $b) => $b['total'] <=> $a['total']);

        return ['table1' => $table1, 'table2' => $table2];
    }

    private function buildDentalExaminationReport(array $periods)
    {
        $start = $periods[0]['start'];
        $end = $periods[count($periods) - 1]['end'];

        $visits = ClinicVisit::with('studentProfile')
            ->whereBetween('visit_date', [$start, $end])
            ->whereHas('handledBy', function ($q) {
                $q->where('clinic_staff_type', 'DENTIST');
            })
            ->get();

        $table1 = [];
        foreach ($periods as $p) {
            $inPeriod = $visits->filter(function($v) use ($p) {
                return $v->visit_date >= $p['start'] && $v->visit_date <= $p['end'];
            });
            $male = $inPeriod->filter(fn($v) => $this->normSex($v->studentProfile?->sex) === 'male')->count();
            $table1[] = [
                'period' => $p['label'],
                'male' => $male,
                'female' => $inPeriod->count() - $male,
                'total' => $inPeriod->count(),
            ];
        }

        $tally = [];
        foreach ($visits as $v) {
            $plaintext = $v->chief_complaint_enc; 
            
            $condition = 'Other Dental Concern';
            $lower = strtolower((string)$plaintext);
            foreach (self::DENTAL_CONDITION_RULES as $rule) {
                foreach ($rule['keywords'] as $k) {
                    if (str_contains($lower, $k)) {
                        $condition = $rule['label'];
                        break 2;
                    }
                }
            }
            
            if (!isset($tally[$condition])) $tally[$condition] = ['male' => 0, 'female' => 0];
            $s = $this->normSex($v->studentProfile?->sex);
            if ($s === 'male') $tally[$condition]['male']++;
            else $tally[$condition]['female']++;
        }

        $table2 = [];
        foreach ($tally as $condition => $c) {
            $table2[] = [
                'condition' => $condition,
                'male' => $c['male'],
                'female' => $c['female'],
                'total' => $c['male'] + $c['female'],
            ];
        }
        usort($table2, fn($a, $b) => $b['total'] <=> $a['total']);

        return ['table1' => $table1, 'table2' => $table2];
    }
    
    private function generateInsights($table1, $table2, $meta)
    {
        $insights = [];
        $totalVisits = array_sum(array_column($table1, 'total'));
        $insights[] = "Total recorded entries for this period: {$totalVisits}.";
        
        if (!empty($table2)) {
            $top = $table2[0];
            $key = $meta['type'] === 'physical_examination' ? 'reason' : ($meta['type'] === 'dental_examination' ? 'condition' : 'complaint');
            $insights[] = "The most frequent concern was {$top[$key]} with {$top['total']} cases.";
        }
        
        return $insights;
    }
}
