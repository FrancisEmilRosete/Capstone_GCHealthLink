<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AppointmentAvailabilityController extends Controller
{
    /**
     * GET /api/appointments/availability
     */
    public function getAvailability(Request $request): JsonResponse
    {
        if ($request->has('serviceType')) {
            $serviceType = $request->query('serviceType');
            $scope = ($serviceType === 'Dental Check-up') ? 'dental' : 'medical';
            $request->merge(['scope' => $scope]);
        }
        return $this->getConfig($request);
    }

    /**
     * GET /api/appointments/availability/config
     */
    public function getConfig(Request $request): JsonResponse
    {
        $scope = $request->input('scope', 'medical');
        $month = (int) $request->input('month', date('n'));
        $year = (int) $request->input('year', date('Y'));

        $filePath = "availability_{$scope}.json";
        $overrides = [];
        if (Storage::exists($filePath)) {
            $overrides = json_decode(Storage::get($filePath), true) ?? [];
        }

        $days = [];
        $daysInMonth = \Carbon\Carbon::create($year, $month)->daysInMonth;
        
        $appointments = \App\Models\Appointment::whereYear('preferred_date', $year)
            ->whereMonth('preferred_date', $month)
            ->whereIn('status', [\App\Models\Appointment::STATUS_WAITING, \App\Models\Appointment::STATUS_IN_PROGRESS])
            ->get(['preferred_date', 'preferred_time', 'service_type']);
            
        $bookedSlots = [];
        foreach ($appointments as $apt) {
            $aptScope = (stripos($apt->service_type, 'Dental') !== false) ? 'dental' : 'medical';
            if ($aptScope === $scope) {
                $dateStr = $apt->preferred_date->format('Y-m-d');
                $timeStr = substr($apt->preferred_time, 0, 5); // Extract HH:MM
                if (!isset($bookedSlots[$dateStr])) {
                    $bookedSlots[$dateStr] = [];
                }
                $bookedSlots[$dateStr][] = $timeStr;
            }
        }

        for ($i = 1; $i <= $daysInMonth; $i++) {
            $date = sprintf('%04d-%02d-%02d', $year, $month, $i);
            $dayOfWeek = (int) date('N', strtotime($date)); // 1 (Mon) - 7 (Sun)
            
            // Default: Available Mon-Fri (1-5), Unavailable Sat-Sun (6-7)
            $isWeekend = $dayOfWeek >= 6;

            $days[$date] = [
                'isAvailable' => !$isWeekend,
                'slots' => [],
                'isOverride' => false,
            ];

            // Apply overrides if they exist for this date
            if (isset($overrides[$date])) {
                $days[$date] = $overrides[$date];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'scope' => $scope,
                'month' => $month,
                'year' => $year,
                'days' => $days,
                'dayAvailability' => $days,
                'counts' => [],
                'bookedSlots' => $bookedSlots,
            ]
        ]);
    }

    /**
     * PUT /api/appointments/availability/config
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $request->validate([
            'scope' => 'required|string',
            'date' => 'required|date_format:Y-m-d',
            'enabled' => 'required|boolean',
            'slots' => 'array',
            'force' => 'boolean',
            'reason' => 'nullable|string',
        ]);

        $scope = $request->input('scope');
        $date = $request->input('date');
        $enabled = $request->input('enabled');
        $slots = $request->input('slots', []);
        $force = $request->input('force', false);
        $reason = $request->input('reason', '');

        // Fetch appointments for this date and scope
        $appointments = \App\Models\Appointment::whereDate('preferred_date', $date)
            ->whereIn('status', [\App\Models\Appointment::STATUS_WAITING, \App\Models\Appointment::STATUS_IN_PROGRESS])
            ->get();
            
        // Filter by scope
        $appointments = $appointments->filter(function ($apt) use ($scope) {
            $aptScope = (stripos($apt->service_type, 'Dental') !== false) ? 'dental' : 'medical';
            return $aptScope === $scope;
        });

        $droppedAppointments = [];

        if (!$enabled) {
            $droppedAppointments = $appointments->all();
        } else {
            $slotsData = array_map(function ($slot) {
                $startMins = 0; $endMins = 0;
                if (isset($slot['startTime']) && isset($slot['endTime'])) {
                    [$sH, $sM] = array_map('intval', explode(':', $slot['startTime']));
                    [$eH, $eM] = array_map('intval', explode(':', $slot['endTime']));
                    $startMins = $sH * 60 + $sM;
                    $endMins = $eH * 60 + eM;
                }
                return [
                    'startTime' => $slot['startTime'] ?? null,
                    'startMins' => $startMins,
                    'endMins' => $endMins,
                    'capacity' => $slot['capacity'] ?? 1,
                    'appointments' => []
                ];
            }, $slots);
            
            foreach ($appointments as $apt) {
                $timeStr = substr($apt->preferred_time, 0, 5);
                [$pH, $pM] = array_map('intval', explode(':', $timeStr));
                $prefMins = $pH * 60 + $pM;
                
                $matched = false;
                foreach ($slotsData as &$sData) {
                    if ($sData['startTime']) {
                        if ($prefMins >= $sData['startMins'] && $prefMins < $sData['endMins']) {
                            $sData['appointments'][] = $apt;
                            $matched = true;
                            break;
                        }
                    }
                }
                
                if (!$matched) {
                    $droppedAppointments[] = $apt;
                }
            }
            
            foreach ($slotsData as $sData) {
                if (count($sData['appointments']) > $sData['capacity']) {
                    $apts = $sData['appointments'];
                    usort($apts, fn($a, $b) => $b->created_at <=> $a->created_at);
                    $toDropCount = count($apts) - $sData['capacity'];
                    for ($i = 0; $i < $toDropCount; $i++) {
                        $droppedAppointments[] = $apts[$i];
                    }
                }
            }
        }
        
        if (count($droppedAppointments) > 0 && !$force) {
            return response()->json([
                'success' => false,
                'message' => 'Conflict with existing appointments.',
                'droppedCount' => count($droppedAppointments)
            ], 409);
        }

        if (count($droppedAppointments) > 0 && $force) {
            foreach ($droppedAppointments as $apt) {
                $apt->status = \App\Models\Appointment::STATUS_CANCELLED;
                $apt->cancellation_reason = $reason ?: 'Slot capacity reduced or removed by clinic staff.';
                $apt->save();
            }
        }

        $filePath = "availability_{$scope}.json";
        $overrides = [];
        if (Storage::exists($filePath)) {
            $overrides = json_decode(Storage::get($filePath), true) ?? [];
        }

        $overrides[$date] = [
            'isAvailable' => $enabled,
            'slots' => $slots,
            'isOverride' => true,
        ];

        Storage::put($filePath, json_encode($overrides, JSON_PRETTY_PRINT));

        \App\Models\AuditLog::record(
            'AVAILABILITY_UPDATE',
            "Availability updated for {$date} ({$scope})",
            null,
            ['date' => $date, 'enabled' => $enabled, 'slots' => $slots]
        );

        return response()->json([
            'success' => true,
            'message' => 'Availability updated successfully.',
            'droppedCount' => count($droppedAppointments),
        ]);
    }
}
