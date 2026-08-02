<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Student\StoreStudentRequest;
use App\Http\Requests\Student\UpdateStudentRequest;
use App\Http\Resources\StudentProfileResource;
use App\Models\AuditLog;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * StudentController
 *
 * CRUD + search for student profiles.
 *
 * Routes (apiResource binding in routes/api.php):
 *   GET    /api/students            → index()   (search + paginate)
 *   POST   /api/students            → store()
 *   GET    /api/students/{student}  → show()
 *   PUT    /api/students/{student}  → update()
 *   DELETE /api/students/{student}  → destroy() [Admin only]
 */
class StudentController extends Controller
{
    // -------------------------------------------------------------------------
    // GET /api/students
    // -------------------------------------------------------------------------

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StudentProfile::query()
            ->with(['user'])
            ->orderBy('last_name')
            ->orderBy('first_name');

        // Full-text search across name + student number
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('last_name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('student_number', 'like', "%{$search}%");
            });
        }

        // Filter by department
        if ($dept = $request->query('dept')) {
            $query->where('course_dept', $dept);
        }

        // Filter by year level
        if ($year = $request->query('year_level')) {
            $query->where('year_level', $year);
        }

        $perPage = min((int) ($request->query('per_page', 20)), 100);

        return StudentProfileResource::collection($query->paginate($perPage));
    }

    // -------------------------------------------------------------------------
    // POST /api/students
    // -------------------------------------------------------------------------

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $studentProfile = DB::transaction(function () use ($data): StudentProfile {
            // 1. Create the user account
            $user = User::create([
                'email'    => $data['email'],
                'password' => $data['password'],
                'role'     => 'STUDENT',
            ]);

            // 2. Create the student profile
            $profile = StudentProfile::create(array_merge(
                collect($data)->except(['email', 'password'])->all(),
                ['user_id' => $user->id]
            ));

            return $profile->load('user');
        });

        AuditLog::record(
            'STUDENT_CREATE',
            "Created student: {$studentProfile->full_name}",
            $studentProfile->id
        );

        return response()->json(new StudentProfileResource($studentProfile), 201);
    }

    // -------------------------------------------------------------------------
    // GET /api/students/me
    // -------------------------------------------------------------------------

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'STUDENT') {
            return response()->json(['error' => 'Only students have a student profile.'], 403);
        }

        $student = StudentProfile::where('user_id', $user->id)->firstOrFail();

        $student->load([
            'user',
            'medicalHistory',
            'physicalExaminations',
            'labResults',
            'clinicVisits.handledBy',
            'clinicVisits.dispensedMedicines.inventory',
            'appointments',
            'medicalCertificates.issuedBy',
        ]);

        return response()->json([
            'success' => true,
            'data' => new StudentProfileResource($student)
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/students/qr
    // -------------------------------------------------------------------------

    public function qr(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'STUDENT') {
            return response()->json(['error' => 'Only students have a QR code.'], 403);
        }

        $student = StudentProfile::where('user_id', $user->id)->firstOrFail();

        if (!$user->qr_token) {
            \App\Models\User::where('id', $user->id)
                ->whereNull('qr_token')
                ->update([
                    'qr_token' => \Illuminate\Support\Str::random(32),
                    'qr_token_issued_at' => now(),
                    'qr_token_expires_at' => now()->addYear(),
                ]);
            $user->refresh();
        }

        $qrData = json_encode([
            'qrToken' => $user->qr_token,
            'studentNumber' => $student->student_number,
        ]);

        $qrCodeImage = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' . urlencode($qrData);

        return response()->json([
            'success' => true,
            'data' => [
                'studentNumber' => $student->student_number,
                'qrToken' => $user->qr_token,
                'qrCodeImage' => $qrCodeImage,
            ]
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/students/{student}
    // -------------------------------------------------------------------------

    public function show(StudentProfile $student): JsonResponse
    {
        $student->load([
            'user',
            'medicalHistory',
            'physicalExaminations',
            'labResults',
            'clinicVisits.handledBy',
            'clinicVisits.dispensedMedicines.inventory',
            'appointments',
            'medicalCertificates.issuedBy',
        ]);

        return response()->json(new StudentProfileResource($student));
    }

    // -------------------------------------------------------------------------
    // PUT /api/students/{student}
    // -------------------------------------------------------------------------

    public function update(UpdateStudentRequest $request, StudentProfile $student): JsonResponse
    {
        $student->update($request->validated());

        AuditLog::record(
            'STUDENT_UPDATE',
            "Updated student profile: {$student->full_name}",
            $student->id
        );

        return response()->json(new StudentProfileResource($student->fresh('user')));
    }

    // -------------------------------------------------------------------------
    // DELETE /api/students/{student}  [Admin only]
    // -------------------------------------------------------------------------

    public function destroy(Request $request, StudentProfile $student): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'Unauthorized. Admin role required.'], 403);
        }

        $name = $student->full_name;

        DB::transaction(function () use ($student): void {
            // Cascade deletes are handled by FK constraints in the DB migration
            $student->user()->delete();  // Also deletes the profile via cascade
        });

        AuditLog::record('STUDENT_DELETE', "Deleted student: {$name}");

        return response()->json(['message' => "Student {$name} deleted successfully."]);
    }
}
