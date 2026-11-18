<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\CollegeStudent;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * AuthController
 *
 * Handles authentication via Laravel Sanctum bearer tokens.
 * Supports dual-database authentication:
 * - Admin and Clinic Staff authenticate directly against clinic_db.
 * - Students authenticate against the simulated College MIS database (college_db)
 *   and have their basic academic information synchronized into clinic_db Just-In-Time.
 *
 * Routes (in routes/api.php):
 *   POST /api/auth/login    → login()
 *   POST /api/auth/logout   → logout()   [requires auth:sanctum]
 *   GET  /api/auth/me       → me()       [requires auth:sanctum]
 *   POST /api/auth/qr       → loginQr()  [QR token authentication]
 */
class AuthController extends Controller
{
    // -------------------------------------------------------------------------
    // POST /api/auth/login
    // -------------------------------------------------------------------------

    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = trim((string) $request->email);
        $user = User::where('email', $identifier)->first();
        $authenticated = false;

        // 1. If user is Staff or Admin in clinic_db, authenticate locally
        if ($user && !$user->isStudent()) {
            if (Hash::check($request->password, $user->password)) {
                $authenticated = true;
            }
        }

        // 2. If user is a student (or not in clinic_db yet), query the College MIS database (college_db)
        if (!$authenticated) {
            $collegeStudent = null;
            try {
                // Query college_db by email or student_number
                $collegeStudent = CollegeStudent::where('email', $identifier)
                    ->orWhere('student_number', $identifier)
                    ->first();
            } catch (\Throwable $e) {
                // If college_db is temporarily offline/unconfigured, report and allow local fallback
                report($e);
            }

            if ($collegeStudent) {
                // Verify password against College MIS record (supports bcrypt, sha256, or plaintext fallback)
                $passwordMatches = Hash::check($request->password, $collegeStudent->password)
                    || hash('sha256', $request->password) === $collegeStudent->password
                    || $request->password === $collegeStudent->password;

                if ($passwordMatches) {
                    $authenticated = true;
                    // Synchronize / JIT-provision student in clinic_db
                    $user = $this->syncCollegeStudentToClinic($collegeStudent);
                }
            } elseif ($user && $user->isStudent() && Hash::check($request->password, $user->password)) {
                // Fallback for locally seeded/demo student accounts
                $authenticated = true;
            }
        }

        if (!$authenticated || !$user) {
            AuditLog::record(
                'LOGIN_FAILED',
                "Failed login attempt for identifier: {$identifier}"
            );

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke previous tokens for this device
        $user->tokens()->where('name', 'web-spa')->delete();

        // Role-based session lifetime (security policy):
        //   STUDENT                                 → 2 hours
        //   Staff (ADMIN / NURSE / DOCTOR / DENTIST) → 8 hours
        $expirationMinutes = $user->isStudent() ? 2 * 60 : 8 * 60;
        // Role-based token lifetime (security policy):
        //   Students (STUDENT): 2 hours (120 minutes)
        //   All Staff (ADMIN and CLINIC_STAFF — including Nurse, Doctor, and Dentist): 8 hours (480 minutes)
        $expirationMinutes = $user->getTokenExpirationMinutes();

        $token = $user->createToken('web-spa', ['*'], now()->addMinutes($expirationMinutes));

        AuditLog::record('LOGIN_SUCCESS', 'User logged in.', $user->id);

        // Dynamic Cookie Security:
        // On local HTTP (XAMPP / php artisan serve), Secure=false and SameSite=lax prevents
        // browser cookie rejection. On HTTPS in production, Secure=true and SameSite=none is used.
        $isSecure = $request->isSecure() || app()->environment('production');
        $sameSite = $isSecure ? 'none' : 'lax';

        $cookie = cookie(
            name: 'auth_token',
            value: $token->plainTextToken,
            minutes: $expirationMinutes,
            path: '/',
            domain: null,
            secure: $isSecure,
            httpOnly: true,
            raw: false,
            sameSite: $sameSite
        );

        return response()->json([
            'success'      => true,
            'message'      => 'Login successful.',
            'token'        => $token->plainTextToken,
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'user'         => new UserResource($user->load('studentProfile')),
            'expires_at'   => $token->accessToken->expires_at?->toISOString(),
            'expires_in'   => $expirationMinutes * 60,
        ])->withCookie($cookie);
    }

    /**
     * Synchronize or JIT-provision a student from college_db into clinic_db.
     */
    protected function syncCollegeStudentToClinic(CollegeStudent $collegeStudent): User
    {
        return DB::transaction(function () use ($collegeStudent) {
            // 1. Ensure User exists in clinic_db
            $user = User::where('email', $collegeStudent->email)->first();

            if (!$user) {
                $user = User::create([
                    'email' => $collegeStudent->email,
                    'role'  => 'STUDENT',
                    'password' => Hash::make(Str::random(32)), // Random password; authenticates via college_db
                ]);
            }

            // 2. Ensure StudentProfile exists in clinic_db and sync latest college academic info
            $profile = StudentProfile::where('user_id', $user->id)
                ->orWhere('student_number', $collegeStudent->student_number)
                ->first();

            $middleInitial = $collegeStudent->middle_name ? mb_substr(trim($collegeStudent->middle_name), 0, 1) : null;

            if (!$profile) {
                $profile = StudentProfile::create([
                    'user_id'        => $user->id,
                    'student_number' => $collegeStudent->student_number,
                    'first_name'     => $collegeStudent->first_name,
                    'last_name'      => $collegeStudent->last_name,
                    'mi'             => $middleInitial,
                    'course'         => $collegeStudent->course,
                    'course_dept'    => $collegeStudent->course_dept,
                    'year_level'     => $collegeStudent->year_level,
                    'sex'            => $collegeStudent->sex,
                    'birthday'       => $collegeStudent->birthday,
                ]);
            } else {
                $profile->update([
                    'user_id'        => $user->id,
                    'student_number' => $collegeStudent->student_number,
                    'first_name'     => $collegeStudent->first_name,
                    'last_name'      => $collegeStudent->last_name,
                    'mi'             => $middleInitial ?: $profile->mi,
                    'course'         => $collegeStudent->course,
                    'course_dept'    => $collegeStudent->course_dept,
                    'year_level'     => $collegeStudent->year_level,
                ]);
            }

            // 3. Ensure a blank MedicalHistory shell exists for foreign key references
            if (!$profile->medicalHistory()->exists()) {
                $profile->medicalHistory()->create([]);
            }

            return $user;
        });
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/logout
    // -------------------------------------------------------------------------

    public function logout(Request $request): JsonResponse
    {
        // Delete only the current token used to make this request
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
            AuditLog::record('LOGOUT', 'User logged out.', $request->user()->id);
        }

        $isSecure = $request->isSecure() || app()->environment('production');
        $sameSite = $isSecure ? 'none' : 'lax';

        $cookie = cookie(
            name: 'auth_token',
            value: '',
            minutes: -2628000,
            path: '/',
            domain: null,
            secure: $isSecure,
            httpOnly: true,
            raw: false,
            sameSite: $sameSite
        );

        return response()->json(['message' => 'Logged out successfully.'])->withCookie($cookie);
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/me
    // -------------------------------------------------------------------------

    public function me(Request $request): JsonResponse
    {
        return response()->json(
            new UserResource($request->user()->load('studentProfile'))
        );
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/qr  — QR-code token login (for check-in kiosk)
    // -------------------------------------------------------------------------

    public function loginQr(Request $request): JsonResponse
    {
        $request->validate([
            'qr_token' => ['required', 'string'],
        ]);

        $user = User::where('qr_token', $request->qr_token)
            ->where('qr_token_expires_at', '>', now())
            ->first();

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired QR token.'], 401);
        }

        $token = $user->createToken('qr-kiosk', ['read:own'], now()->addMinutes(15));

        AuditLog::record('QR_LOGIN', 'QR login used.', $user->id);

        return response()->json([
            'user'         => new UserResource($user->load('studentProfile')),
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/qr/generate  — Generate a new QR token for a student
    // -------------------------------------------------------------------------

    public function generateQrToken(Request $request): JsonResponse
    {
        /** @var User $staffUser */
        $staffUser = $request->user();

        if (!$staffUser->isClinicStaff() && !$staffUser->isAdmin()) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'user_id' => ['required', 'ulid', 'exists:users,id'],
        ]);

        /** @var User $targetUser */
        $targetUser = User::findOrFail($request->user_id);

        $qrToken   = bin2hex(random_bytes(32));
        $expiresAt = now()->addHours(24);

        $targetUser->update([
            'qr_token'            => $qrToken,
            'qr_token_issued_at'  => now(),
            'qr_token_expires_at' => $expiresAt,
        ]);

        AuditLog::record(
            'QR_GENERATED',
            'QR token generated for user.',
            $targetUser->id,
            ['issued_by' => $staffUser->id]
        );

        return response()->json([
            'qr_token'   => $qrToken,
            'expires_at' => $expiresAt->toISOString(),
        ]);
    }
}
