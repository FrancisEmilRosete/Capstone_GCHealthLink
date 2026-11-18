<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CookieToBearerToken
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $currentAuth = (string) $request->header('Authorization', '');
        $hasRealBearer = str_starts_with($currentAuth, 'Bearer ')
            && !str_contains($currentAuth, 'cookie-auth')
            && strlen(trim(substr($currentAuth, 7))) > 0;

        if (!$hasRealBearer) {
            $cookieToken = $request->cookie('auth_token');
            if (!empty($cookieToken) && is_string($cookieToken)) {
                $request->headers->set('Authorization', 'Bearer ' . $cookieToken);
            } elseif (str_contains($currentAuth, 'cookie-auth')) {
                // Remove dummy placeholder if cookie is not present so Sanctum handles unauthenticated state gracefully
                $request->headers->remove('Authorization');
            }
        }

        return $next($request);
    }
}
