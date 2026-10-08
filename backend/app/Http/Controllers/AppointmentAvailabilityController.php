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

    public static function getDayConfig(string $dateStr, string $scope): array
    {
        $date = \Carbon\Carbon::parse($dateStr);
        $year = $date->year;
        $month = $date->month;
        
        $ov = \App\Models\AvailabilityOverride::where('scope', $scope)
            ->whereDate('date', $dateStr)
            ->first();
            
        $isOverride = (bool)$ov;
        $isAvailable = $isOverride ? (bool)$ov->is_available : !in_array($date->dayOfWeekIso, [6, 7]);
        $slots = $isOverride ? ($ov->slots ?? []) : [];
        
        $appointments = \App\Models\Appointment::with('student')
            ->whereDate('preferred_date', $dateStr)
            ->whereIn('status', [\App\Models\Appointment::STATUS_WAITING, \App\Models\Appointment::STATUS_IN_PROGRESS])
            ->get();
            
        $appointmentsByTime = [];
        foreach ($appointments as $apt) {
            $aptScope = (stripos($apt->service_type, 'Dental') !== false) ? 'dental' : 'medical';
            if ($aptScope === $scope) {
                $timeStr = substr($apt->preferred_time, 0, 5);
                $appointmentsByTime[$timeStr][] = $apt;
            }
        }
        
        foreach ($slots as &$slot) {
            $startTime = substr($slot['startTime'], 0, 5);
            $slotBookings = $appointmentsByTime[$startTime] ?? [];
            
            $slot['total_capacity'] = (int) ($slot['capacity'] ?? 0);
            $slot['booked_count'] = count($slotBookings);
            
            $slot['bookings'] = array_map(function($apt) {
                return [
                    'id' => $apt->id,
                    'status' => $apt->status,
                    'student' => $apt->student ? [
                        'id' => $apt->student->id,
                        'studentNumber' => $apt->student->student_number,
                        'firstName' => $apt->student->first_name,
                        'lastName' => $apt->student->last_name,
                        'courseDept' => $apt->student->course_dept,
                        'yearLevel' => $apt->student->year_level,
                    ] : null,
                ];
            }, $slotBookings);
        }
        
        return [
            'isAvailable' => $isAvailable,
            'isOverride' => $isOverride,
            'slots' => $slots,
        ];
    }

    /**
     * GET /api/appointments/availability/config
     */
    public function getConfig(Request $request): JsonResponse
    {
        $scope = $request->input('scope', 'medical');
        $month = (int) $request->input('month', date('n'));
        $year = (int) $request->input('year', date('Y'));

        $overridesDB = \App\Models\AvailabilityOverride::where('scope', $scope)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get();

        $overrides = [];
        foreach ($overridesDB as $ov) {
            $dateStr = $ov->date->format('Y-m-d');
            $overrides[$dateStr] = [
                'isAvailable' => (bool)$ov->is_available,
                'slots' => $ov->slots ?? [],
                'isOverride' => true,
            ];
        }

        $days = [];
        $daysInMonth = \Carbon\Carbon::create($year, $month)->daysInMonth;
        
        // Eager load the 'student' relationship to get student details
        $appointments = \App\Models\Appointment::with('student')
            ->whereYear('preferred_date', $year)
            ->whereMonth('preferred_date', $month)
            ->whereIn('status', [\App\Models\Appointment::STATUS_WAITING, \App\Models\Appointment::STATUS_IN_PROGRESS])
            ->get();
            
        $bookedSlots = [];
        $appointmentsByDateAndTime = [];

        foreach ($appointments as $apt) {
            $aptScope = (stripos($apt->service_type, 'Dental') !== false) ? 'dental' : 'medical';
            if ($aptScope === $scope) {
                $dateStr = $apt->preferred_date->format('Y-m-d');
                $timeStr = substr($apt->preferred_time, 0, 5); // Extract HH:MM
                
                if (!isset($bookedSlots[$dateStr])) {
                    $bookedSlots[$dateStr] = [];
                }
                $bookedSlots[$dateStr][] = $timeStr;

                if (!isset($appointmentsByDateAndTime[$dateStr])) {
                    $appointmentsByDateAndTime[$dateStr] = [];
                }
                if (!isset($appointmentsByDateAndTime[$dateStr][$timeStr])) {
                    $appointmentsByDateAndTime[$dateStr][$timeStr] = [];
                }
                $appointmentsByDateAndTime[$dateStr][$timeStr][] = $apt;
            }
        }

        for ($i = 1; $i <= $daysInMonth; $i++) {
            $date = sprintf('%04d-%02d-%02d', $year, $month, $i);
            $dayOfWeek = (int) date('N', strtotime($date));
            
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

            // Enrich slots with total_capacity, booked_count, and bookings
            if (isset($days[$date]['slots']) && is_array($days[$date]['slots'])) {
                foreach ($days[$date]['slots'] as &$slot) {
                    $startTime = substr($slot['startTime'], 0, 5);
                    $slotBookings = $appointmentsByDateAndTime[$date][$startTime] ?? [];
                    
                    $slot['total_capacity'] = (int) ($slot['capacity'] ?? 0);
                    $slot['booked_count'] = count($slotBookings);
                    
                    $slot['bookings'] = array_map(function($apt) {
                        return [
                            'id' => $apt->id,
                            'status' => $apt->status,
                            'student' => $apt->student ? [
                                'id' => $apt->student->id,
                                'studentNumber' => $apt->student->student_number,
                                'firstName' => $apt->student->first_name,
                                'lastName' => $apt->student->last_name,
                                'courseDept' => $apt->student->course_dept,
                                'yearLevel' => $apt->student->year_level,
                            ] : null,
                        ];
                    }, $slotBookings);
                }
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
                    $endMins = $eH * 60 + $eM;
                }
                return [
                    'startTime' => $slot['startTime'] ?? null,
                    'endTime' => $slot['endTime'] ?? null,
                    'originalStartTime' => $slot['originalStartTime'] ?? ($slot['startTime'] ?? null),
                    'originalEndTime' => $slot['originalEndTime'] ?? ($slot['endTime'] ?? null),
                    'startMins' => $startMins,
                    'endMins' => $endMins,
                    'capacity' => $slot['capacity'] ?? 1,
                    'appointments' => []
                ];
            }, $slots);
            
            foreach ($appointments as $apt) {
                $timeStr = substr($apt->preferred_time, 0, 5);
                $matched = false;
                
                // First try matching original time
                foreach ($slotsData as &$sData) {
                    if ($sData['originalStartTime'] && $timeStr === $sData['originalStartTime']) {
                        $sData['appointments'][] = $apt;
                        $matched = true;
                        break;
                    }
                }
                
                // Fallback to strict match on new time
                if (!$matched) {
                    foreach ($slotsData as &$sData) {
                        if ($sData['startTime'] === $timeStr) {
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
            
            foreach ($slotsData as &$sData) {
                if (count($sData['appointments']) > $sData['capacity']) {
                    $apts = $sData['appointments'];
                    usort($apts, fn($a, $b) => $b->created_at <=> $a->created_at);
                    $toDropCount = count($apts) - $sData['capacity'];
                    for ($i = 0; $i < $toDropCount; $i++) {
                        $droppedAppointments[] = $apts[$i];
                    }
                    // Keep only the remaining appointments
                    $sData['appointments'] = array_slice($apts, $toDropCount);
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

        // Apply time changes and notify affected students
        if ($enabled && isset($slotsData)) {
            foreach ($slotsData as $sData) {
                $originalStartTime = $sData['originalStartTime'] ?? $sData['startTime'];
                $originalEndTime = $sData['originalEndTime'] ?? $sData['endTime'];
                
                if ($sData['startTime'] !== $originalStartTime || $sData['endTime'] !== $originalEndTime) {
                    foreach ($sData['appointments'] as $aptData) {
                        if (!isset($aptData['id'])) continue;

                        $apt = \App\Models\Appointment::with('student.user')->find($aptData['id']);
                        if (!$apt) continue;

                        // Update the appointment preferred_time
                        $apt->preferred_time = $sData['startTime'] . ':00';
                        $apt->save();

                        // Notify the student
                        $newStartTimeStr = \Carbon\Carbon::parse($sData['startTime'])->format('g:i A');
                        $newEndTimeStr = \Carbon\Carbon::parse($sData['endTime'])->format('g:i A');
                        $dateStr = \Carbon\Carbon::parse($date)->format('F j, Y');
                        
                        $message = "The time for your appointment on {$dateStr} has been updated by the clinic to {$newStartTimeStr} - {$newEndTimeStr}.";
                        
                        if ($apt->student && $apt->student->user) {
                            $apt->student->user->notify(new \App\Notifications\AppointmentTimeUpdated($message));
                            \App\Events\UserPinged::dispatch($apt->student->user->id, 'calendar', ['message' => $message]);
                        }
                    }
                }
            }
        }

        \App\Models\AvailabilityOverride::updateOrCreate(
            ['scope' => $scope, 'date' => $date],
            ['is_available' => $enabled, 'slots' => $slots]
        );

        \App\Models\AuditLog::record(
            'AVAILABILITY_UPDATE',
            "Availability updated for {$date} ({$scope})",
            null,
            ['date' => $date, 'enabled' => $enabled, 'slots' => $slots]
        );

        $dayConfig = self::getDayConfig($date, $scope);
        \App\Events\CalendarUpdated::dispatch($scope, $date, $dayConfig);

        return response()->json([
            'success' => true,
            'message' => 'Availability updated successfully.',
            'droppedCount' => count($droppedAppointments),
        ]);
    }
}
