<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Appointment\StoreAppointmentRequest;
use App\Http\Requests\Appointment\UpdateAppointmentStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * AppointmentController
 *
 * Routes:
 *   GET    /api/appointments              → index()
 *   POST   /api/appointments              → store()
 *   GET    /api/appointments/{appointment}→ show()
 *   PATCH  /api/appointments/{appointment}→ updateStatus()
 *   DELETE /api/appointments/{appointment}→ destroy()
 */
class AppointmentController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/appointments
    // -------------------------------------------------------------------------

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Appointment::query()
            ->with('studentProfile')
            ->orderBy('preferred_date')
            ->orderBy('preferred_time');

        // Staff sees all; student sees only their own
        $user = $request->user();
        if ($user->isStudent()) {
            $query->where('student_profile_id', $user->studentProfile?->id);
        }

        if ($status = $request->query('status')) {
            if (str_contains($status, ',')) {
                $query->whereIn('status', explode(',', $status));
            } else {
                $query->where('status', $status);
            }
        }

        if ($date = $request->query('date')) {
            $query->whereDate('preferred_date', $date);
        }

        if ($service = $request->query('service_type')) {
            $query->where('service_type', $service);
        }

        return AppointmentResource::collection(
            $query->paginate((int) ($request->query('per_page', 20)))
        );
    }

    // -------------------------------------------------------------------------
    // POST /api/appointments
    // -------------------------------------------------------------------------

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $appointment = Appointment::create($request->validated());

        AuditLog::record(
            'APPOINTMENT_CREATE',
            "Appointment created for {$request->preferred_date}",
            $appointment->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Appointment created successfully.',
            'data' => new AppointmentResource($appointment->load('studentProfile'))
        ], 201);
    }

    // -------------------------------------------------------------------------
    // GET /api/appointments/{appointment}
    // -------------------------------------------------------------------------

    public function show(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        // Students can only view their own appointments
        if ($user->isStudent() && $user->studentProfile?->id !== $appointment->student_profile_id) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => new AppointmentResource($appointment->load('studentProfile'))
        ]);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/appointments/{appointment}  (status update)
    // -------------------------------------------------------------------------

    public function updateStatus(
        UpdateAppointmentStatusRequest $request,
        Appointment $appointment
    ): JsonResponse {
        $oldStatus = $appointment->status;
        $appointment->update(['status' => $request->status]);

        AuditLog::record(
            'APPOINTMENT_STATUS',
            "Appointment status changed: {$oldStatus} → {$request->status}",
            $appointment->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Appointment status updated.',
            'data' => new AppointmentResource($appointment->fresh())
        ]);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/appointments/{appointment}
    // -------------------------------------------------------------------------

    public function destroy(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $request->user();

        // Students can cancel their own; staff/admin can cancel any
        $canDelete = $user->isAdmin()
            || $user->isClinicStaff()
            || ($user->isStudent() && $user->studentProfile?->id === $appointment->student_profile_id);

        if (!$canDelete) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        AuditLog::record('APPOINTMENT_CANCEL', 'Appointment cancelled.', $appointment->id);
        $appointment->update(['status' => Appointment::STATUS_CANCELLED]);

        return response()->json(['message' => 'Appointment cancelled.']);
    }

    // -------------------------------------------------------------------------
    // Explicit route registration (add to routes/api.php)
    // -------------------------------------------------------------------------
    // Route::get('appointments', [AppointmentController::class, 'index']);
    // Route::post('appointments', [AppointmentController::class, 'store']);
    // Route::get('appointments/{appointment}', [AppointmentController::class, 'show']);
    // Route::patch('appointments/{appointment}', [AppointmentController::class, 'updateStatus']);
    // Route::delete('appointments/{appointment}', [AppointmentController::class, 'destroy']);
}
