<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use App\Models\User;
use App\Models\VisitMedicine;
use App\Models\AuditLog;
use App\Http\Resources\StudentProfileResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * ClinicController
 *
 * Provides compatibility endpoints for the legacy /clinic/* routes
 * expected by the frontend.
 */
class ClinicController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/clinic/students
    // Maps frontend `?q=` to `?search=` for StudentController@index compatibility
    // -------------------------------------------------------------------------
    public function students(Request $request): AnonymousResourceCollection
    {
        // Re-use the query logic from StudentController, mapping 'q' to 'search'
        if ($request->has('q')) {
            $request->merge(['search' => $request->query('q')]);
        }
        
        $studentController = new StudentController();
        return $studentController->index($request);
    }

    // -------------------------------------------------------------------------
    // GET /api/clinic/search
    // Fast search for QR/scanner widget, returns mapped basic data
    // -------------------------------------------------------------------------
    public function search(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        
        $query = StudentProfile::query()
            ->with(['user']);
            
        if (!empty($q)) {
            $query->where(function ($qBuilder) use ($q) {
                $qBuilder->where('last_name', 'like', "%{$q}%")
                         ->orWhere('first_name', 'like', "%{$q}%")
                         ->orWhere('student_number', 'like', "%{$q}%");
            });
        }
        
        // Limit to 50 results for the autocomplete dropdown
        $profiles = $query->take(50)->get();
        
        $data = $profiles->map(function ($profile) {
            return [
                'id' => $profile->id,
                'studentNumber' => $profile->student_number,
                'firstName' => $profile->first_name,
                'lastName' => $profile->last_name,
                'courseDept' => $profile->course_dept,
                'age' => $profile->age,
                'sex' => $profile->sex,
                'user' => [
                    'id' => $profile->user_id,
                ]
            ];
        });
        
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/clinic/scan/{userId}
    // Looks up profile by associated user_id
    // -------------------------------------------------------------------------
    public function scan(string $userId): JsonResponse
    {
        $profile = StudentProfile::with([
            'user',
            'medicalHistory',
            'physicalExaminations'
        ])->where('user_id', $userId)->first();
        
        if (!$profile) {
            return response()->json(['error' => 'Student profile not found.'], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => new StudentProfileResource($profile),
            'emergencyAlert' => null // Optional, placeholder for future feature
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/clinic/scan-token/{token}
    // Looks up profile by user's qr_token
    // -------------------------------------------------------------------------
    public function scanToken(string $token): JsonResponse
    {
        $user = User::where('qr_token', $token)
            ->where('qr_token_expires_at', '>', now())
            ->first();
            
        if (!$user) {
            return response()->json(['error' => 'Invalid or expired QR token.'], 404);
        }
        
        $profile = StudentProfile::with([
            'user',
            'medicalHistory',
            'physicalExaminations'
        ])->where('user_id', $user->id)->first();
        
        if (!$profile) {
            return response()->json(['error' => 'Student profile not found.'], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => new StudentProfileResource($profile),
            'emergencyAlert' => null
        ]);
    }

    // -------------------------------------------------------------------------
    // PUT /api/clinic/visits/dispense/{medId}
    // Updates the status of a specific VisitMedicine record
    // -------------------------------------------------------------------------
    public function dispense(Request $request, string $medId): JsonResponse
    {
        // Actually, the new backend models VisitMedicine with a status of 'DISPENSED' automatically on creation.
        // However, if the frontend calls this to explicitly confirm, we can simulate or handle it.
        $med = VisitMedicine::find($medId);
        if (!$med) {
            return response()->json(['error' => 'Medicine record not found.'], 404);
        }
        
        $med->status = 'DISPENSED';
        $med->save();
        
        AuditLog::record('MEDICINE_DISPENSE', 'Medicine dispensed manually.', $med->id);
        
        return response()->json([
            'success' => true,
            'message' => 'Medicine dispensed.'
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/clinic/activity-logs
    // Placeholder to prevent frontend errors
    // -------------------------------------------------------------------------
    public function activityLogs(Request $request): JsonResponse
    {
        $staffType = strtoupper($request->query('staffType', 'NURSE'));
        $allowedStaffTypes = ['NURSE', 'DOCTOR', 'DENTIST'];
        if (!in_array($staffType, $allowedStaffTypes)) {
            $staffType = 'NURSE';
        }

        $perPage = (int) $request->query('limit', 200);
        $perPage = min($perPage, 500);

        // Fetch logs
        $logs = AuditLog::with(['user.studentProfile'])
            ->whereHas('user', function ($query) use ($staffType) {
                $query->where('role', 'CLINIC_STAFF')
                      ->where('clinic_staff_type', $staffType);
            })
            ->whereNotIn('action_type', ['RECORDED_CLINIC_VISIT', 'RECORDED_PHYSICAL_EXAM'])
            ->orderBy('timestamp', 'desc')
            ->paginate($perPage);

        $data = collect($logs->items())->map(function ($log) {
            $user = $log->user;
            $profile = $user ? $user->studentProfile : null;
            
            $actorName = 'Clinic Staff';
            if ($profile && ($profile->first_name || $profile->last_name)) {
                $actorName = trim("{$profile->first_name} {$profile->last_name}");
            } elseif ($user && $user->email) {
                $localPart = explode('@', $user->email)[0];
                $actorName = ucwords(str_replace(['.', '_', '-'], ' ', $localPart));
            }

            $actorRole = $user ? ($user->clinic_staff_type ?: $user->role) : 'CLINIC_STAFF';

            // Convert "SOME_ACTION" to "Some Action"
            $actionStr = $log->action ?? $log->action_type ?? 'UNKNOWN';
            $actionLabel = ucwords(str_replace('_', ' ', strtolower($actionStr)));

            return [
                'id' => $log->id,
                'action' => $actionStr,
                'actionLabel' => $actionLabel,
                'timestamp' => $log->timestamp ? $log->timestamp->toISOString() : null,
                'targetId' => $log->target_id,
                'ipAddress' => $log->ip_address,
                'metadata' => $log->metadata,
                'actorName' => $actorName,
                'actorRole' => $actorRole,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Clinic staff activity logs retrieved successfully.',
            'data' => $data,
            'pagination' => [
                'total' => $logs->total(),
                'page' => $logs->currentPage(),
                'limit' => $logs->perPage(),
                'totalPages' => $logs->lastPage(),
            ],
        ]);
    }

    public function getNurseReports(Request $request): JsonResponse
    {
        $today = now();
        $thirtyDaysAgo = now()->subDays(30);

        // Fetch visits
        $allVisits = \App\Models\ClinicVisit::with('studentProfile')->get();
        $visits30Days = $allVisits->where('visit_date', '>=', $thirtyDaysAgo);

        // Quarterly breakdown
        $quarters = ['Q1' => 0, 'Q2' => 0, 'Q3' => 0, 'Q4' => 0];
        foreach ($allVisits as $v) {
            if (!$v->visit_date) continue;
            $month = $v->visit_date->month;
            if ($month >= 8 && $month <= 10) $quarters['Q1']++;
            else if ($month >= 11 || $month === 1) $quarters['Q2']++;
            else if ($month >= 2 && $month <= 4) $quarters['Q3']++;
            else $quarters['Q4']++;
        }

        // Top concerns per department
        $deptConcerns = [];
        foreach ($allVisits as $v) {
            $dept = $v->studentProfile?->course_dept;
            $tag = $v->concern_tag;
            if (!$dept || !$tag) continue;
            
            if (!isset($deptConcerns[$dept])) $deptConcerns[$dept] = [];
            if (!isset($deptConcerns[$dept][$tag])) $deptConcerns[$dept][$tag] = 0;
            $deptConcerns[$dept][$tag]++;
        }

        $topHealthConcerns = [];
        foreach ($deptConcerns as $dept => $concerns) {
            arsort($concerns);
            $sliced = array_slice($concerns, 0, 5, true);
            $mapped = [];
            foreach ($sliced as $tag => $count) {
                $mapped[] = ['tag' => $tag, 'count' => $count];
            }
            $topHealthConcerns[] = [
                'department' => $dept,
                'concerns' => $mapped
            ];
        }

        // AI Insights
        $aiInsights = [];
        if ($quarters['Q2'] >= $quarters['Q1']) {
            $aiInsights[] = "Historically, Q2 shows an increase in clinic visits. Recommendation: Increase stock of paracetamol and cough medicine before Q2 begins.";
        }
        $overallConcerns = [];
        foreach ($deptConcerns as $dept => $concerns) {
            foreach ($concerns as $tag => $count) {
                if (!isset($overallConcerns[$tag])) $overallConcerns[$tag] = 0;
                $overallConcerns[$tag] += $count;
            }
        }
        arsort($overallConcerns);
        $topConcern = key($overallConcerns);
        if ($topConcern) {
            $aiInsights[] = "AI Analysis indicates a persistent trend in '{$topConcern}'. Consider launching a targeted health awareness campaign.";
        }

        // Inventory usage
        $dispensed = VisitMedicine::with('inventory')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->where('status', 'DISPENSED')
            ->get();
            
        $totalMedicinesDispensed = $dispensed->sum('quantity');

        $inventoryItems = \App\Models\Inventory::all();
        $inventorySummary = [
            'expired' => 0,
            'expiringSoon' => 0,
            'nearReorder' => 0,
            'outOfStock' => 0,
        ];
        
        foreach ($inventoryItems as $item) {
            $batches = \App\Models\InventoryBatch::where('inventory_id', $item->id)->get();
            $hasExpired = false;
            $hasExpiringSoon = false;
            
            foreach ($batches as $batch) {
                if (!$batch->expiration_date) continue;
                if ($batch->expiration_date < $today) $hasExpired = true;
                if ($batch->expiration_date >= $today && $batch->expiration_date <= now()->addDays(30)) $hasExpiringSoon = true;
            }
            
            if ($hasExpired) $inventorySummary['expired']++;
            if ($hasExpiringSoon) $inventorySummary['expiringSoon']++;
            if ($item->current_stock <= $item->reorder_threshold) $inventorySummary['nearReorder']++;
            if ($item->current_stock == 0) $inventorySummary['outOfStock']++;
        }

        $forecastMap = [];
        foreach ($dispensed as $d) {
            $id = $d->inventory_id;
            if (!isset($forecastMap[$id])) {
                $forecastMap[$id] = [
                    'name' => $d->inventory?->item_name,
                    'currentStock' => $d->inventory?->current_stock,
                    'unit' => $d->inventory?->unit,
                    'totalUsed' => 0
                ];
            }
            $forecastMap[$id]['totalUsed'] += $d->quantity;
        }

        $inventoryForecast = [];
        foreach ($forecastMap as $id => $item) {
            $dailyUsage = $item['totalUsed'] / 30;
            $daysUntilDepletion = $dailyUsage > 0 ? floor($item['currentStock'] / $dailyUsage) : 999;
            $inventoryForecast[] = [
                'itemName' => $item['name'],
                'currentStock' => $item['currentStock'],
                'unit' => $item['unit'],
                'dailyUsage' => round($dailyUsage, 2),
                'daysUntilDepletion' => $daysUntilDepletion
            ];
        }
        usort($inventoryForecast, fn($a, $b) => $a['daysUntilDepletion'] <=> $b['daysUntilDepletion']);

        // Mock data fallback if empty database
        if ($allVisits->isEmpty()) {
            $quartersArr = [
                ['quarter' => "Q1 (Aug-Oct)", 'visits' => 124],
                ['quarter' => "Q2 (Nov-Jan)", 'visits' => 256],
                ['quarter' => "Q3 (Feb-Apr)", 'visits' => 189],
                ['quarter' => "Q4 (May-Jul)", 'visits' => 142],
            ];
            $topHealthConcerns = [
                ['department' => "CCS", 'concerns' => [['tag' => "Eye Strain", 'count' => 48], ['tag' => "Headache", 'count' => 35]]],
                ['department' => "CEAS", 'concerns' => [['tag' => "Stomach Ache", 'count' => 28], ['tag' => "Fever", 'count' => 22]]],
            ];
            $aiInsights = [
                "Historically, Q2 shows a massive 106% increase in clinic visits. Recommendation: Proactively increase the budget and stock for paracetamol and cough medicine.",
                "AI Analysis indicates a persistent spike in 'Eye Strain' specific to the CCS department. Consider recommending 20-20-20 rule posters in computing labs."
            ];
            $totalVisits30Days = 87;
            $totalMedicinesDispensed = 134;
        } else {
            $quartersArr = [
                ['quarter' => "Q1 (Aug-Oct)", 'visits' => $quarters['Q1']],
                ['quarter' => "Q2 (Nov-Jan)", 'visits' => $quarters['Q2']],
                ['quarter' => "Q3 (Feb-Apr)", 'visits' => $quarters['Q3']],
                ['quarter' => "Q4 (May-Jul)", 'visits' => $quarters['Q4']],
            ];
            $totalVisits30Days = $visits30Days->count();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'totalVisits30Days' => $totalVisits30Days,
                'totalMedicinesDispensed' => $totalMedicinesDispensed,
                'inventoryForecast' => $inventoryForecast,
                'inventorySummary' => $inventorySummary,
                'quarterlyVisits' => $quartersArr,
                'topHealthConcernsPerDept' => $topHealthConcerns,
                'aiInsights' => $aiInsights
            ]
        ]);
    }

    public function sendEmergencyAlert(Request $request): JsonResponse
    {
        $studentProfileId = $request->input('studentProfileId');
        $incidentDetails = $request->input('incidentDetails');

        if (!$studentProfileId || !$incidentDetails) {
            return response()->json(['success' => false, 'message' => 'Student ID and incident details are required.'], 400);
        }

        $student = StudentProfile::find($studentProfileId);
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found.'], 404);
        }

        if (!$student->emergency_contact_name || !$student->emergency_contact_tel_number) {
            return response()->json([
                'success' => false,
                'message' => 'No emergency contact information on file for this student.'
            ], 400);
        }

        $simulatedSmsPayload = [
            'to' => $student->emergency_contact_tel_number,
            'recipient' => $student->emergency_contact_name,
            'sender' => 'GC HealthLink Clinic',
            'message' => "URGENT: Your student, {$student->first_name} {$student->last_name}, is currently at the Gordon College Clinic. Reason: {$incidentDetails}. Please contact the clinic immediately or proceed to the campus.",
            'timestamp' => now()->toISOString(),
            'status' => 'DELIVERED_TO_GATEWAY'
        ];

        AuditLog::record(
            'SENT_EMERGENCY_ALERT',
            'Sent emergency SMS alert',
            $studentProfileId,
            ['incidentDetails' => $incidentDetails, 'recipient' => $student->emergency_contact_name]
        );

        return response()->json([
            'success' => true,
            'message' => 'Emergency SMS alert simulated successfully.',
            'data' => $simulatedSmsPayload
        ]);
    }
}
