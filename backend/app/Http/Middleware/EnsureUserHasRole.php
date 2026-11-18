<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureUserHasRole
 *
 * Usage in routes:  ->middleware('role:ADMIN')  or  ->middleware('role:ADMIN,CLINIC_STAFF')
 *
 * Compares against users.role (STUDENT | CLINIC_STAFF | ADMIN).
 * Nurses, Doctors and Dentists are all CLINIC_STAFF (sub-type in clinic_staff_type).
 * Must run after auth:sanctum so $request->user() is resolved.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $allowed = array_map(static fn (string $r) => strtoupper(trim($r)), $roles);

        if (!in_array(strtoupper((string) $user->role), $allowed, true)) {
            return response()->json([
                'message' => 'Forbidden. You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
