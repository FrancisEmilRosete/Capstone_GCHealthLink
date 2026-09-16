<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\AesGcmCipher;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * EncryptApiPayload
 *
 * Global middleware that enforces the AES-256-GCM transport encryption
 * contract between the Next.js frontend and this Laravel API.
 *
 * Request flow:
 *   1. Client sends:  POST /api/... { "payload": "<base64url blob>" }
 *   2. Middleware decrypts the blob and replaces the request's parsed body
 *      with the plaintext data so controllers receive normal PHP arrays.
 *   3. Controller returns a normal JsonResponse.
 *   4. Middleware intercepts the response, encrypts the JSON body, and
 *      wraps it in { "payload": "<base64url blob>" } before sending.
 *
 * Routes that do NOT need encryption (e.g., health checks) should be
 * listed in $excludedPaths.
 *
 * Registration:
 *   Add to bootstrap/app.php:
 *     ->withMiddleware(function (Middleware $middleware) {
 *         $middleware->api(prepend: [
 *             \App\Http\Middleware\EncryptApiPayload::class,
 *         ]);
 *     })
 *
 * @package App\Http\Middleware
 */
class EncryptApiPayload
{
    /**
     * Paths that bypass encryption (relative to /api/).
     * Useful for uptime monitors, CSRF cookie endpoint, etc.
     */
    private array $excludedPaths = [
        'api/health',
        'api/sanctum/csrf-cookie',
    ];

    public function __construct(private readonly AesGcmCipher $cipher)
    {
    }

    /**
     * Handle an incoming request.
     *
     * @param  Request  $request
     * @param  Closure  $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // ------------------------------------------------------------------
        // 1. Check if this route is excluded from encryption
        // ------------------------------------------------------------------
        if ($this->isExcluded($request)) {
            return $next($request);
        }

        // ------------------------------------------------------------------
        // 2. Verify the client declared it is using the encrypted protocol
        // ------------------------------------------------------------------
        if (!$request->hasHeader('X-Encrypted-Request')) {
            return response()->json([
                'error' => 'Unencrypted requests are not accepted on this API.',
            ], 400);
        }

        // ------------------------------------------------------------------
        // 3. Decrypt the incoming request body
        // ------------------------------------------------------------------
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'], true)) {
            $encryptedPayload = $request->input('payload');

            if (!$encryptedPayload) {
                return response()->json([
                    'error' => 'Missing encrypted payload.',
                ], 422);
            }

            try {
                $decrypted = $this->cipher->decrypt((string) $encryptedPayload);
            } catch (\Throwable $e) {
                // Log the error server-side but do not leak details to client
                logger()->error('AES-GCM decryption failed', [
                    'error'  => $e->getMessage(),
                    'path'   => $request->path(),
                    'method' => $request->method(),
                ]);

                return response()->json([
                    'error' => 'Payload decryption failed. Invalid or tampered data.',
                ], 422);
            }

            // Replace the raw request input with the decrypted array so that
            // controllers can use $request->validated(), $request->input(), etc.
            if (is_array($decrypted)) {
                $request->replace($decrypted);
            }
        }

        // ------------------------------------------------------------------
        // 4. Pass to the next layer (controller, other middleware)
        // ------------------------------------------------------------------
        /** @var Response $response */
        $response = $next($request);

        // ------------------------------------------------------------------
        // 5. Encrypt the outgoing JSON response
        // ------------------------------------------------------------------
        if ($response instanceof JsonResponse) {
            try {
                $originalData    = $response->getData(assoc: true);
                $encryptedBlob   = $this->cipher->encrypt($originalData);

                $response->setData(['payload' => $encryptedBlob]);
            } catch (\Throwable $e) {
                logger()->critical('AES-GCM response encryption failed', [
                    'error' => $e->getMessage(),
                    'path'  => $request->path(),
                ]);

                // Return a generic 500 — do NOT leak plaintext on failure
                return response()->json(['error' => 'Internal server error.'], 500);
            }
        }

        return $response;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function isExcluded(Request $request): bool
    {
        if ($request->isMethod('OPTIONS')) {
            return true;
        }

        foreach ($this->excludedPaths as $path) {
            if ($request->is($path)) {
                return true;
            }
        }
        return false;
    }
}
