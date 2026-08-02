<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * AuthController
 *
 * Handles authentication via Laravel Sanctum bearer tokens.
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
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AuditLog::record(
                'LOGIN_FAILED',
                "Failed login attempt for email: {$request->email}"
            );

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke previous tokens for this device (optional — comment out for multi-device)
        $user->tokens()->where('name', 'web-spa')->delete();

        $token = $user->createToken('web-spa', ['*'], now()->addHours(8));

        AuditLog::record('LOGIN_SUCCESS', 'User logged in.', $user->id);

        return response()->json([
            'success'      => true,
            'message'      => 'Login successful.',
            'user'         => new UserResource($user->load('studentProfile')),
            'token'        => $token->plainTextToken,
            'access_token' => $token->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $token->accessToken->expires_at?->toISOString(),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/logout
    // -------------------------------------------------------------------------

    public function logout(Request $request): JsonResponse
    {
        // Delete only the current token used to make this request
        $request->user()->currentAccessToken()->delete();

        AuditLog::record('LOGOUT', 'User logged out.', $request->user()->id);

        return response()->json(['message' => 'Logged out successfully.']);
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
