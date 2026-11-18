<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * AiServiceClient
 *
 * Single place that builds HTTP requests to the Python FastAPI microservice.
 * - Base URL / timeout come from config('services.ai.*') (config:cache safe).
 * - Every call carries the shared secret in the X-AI-Service-Key header,
 *   which ai-service-python/main.py validates when AI_SERVICE_SECRET is set.
 */
class AiServiceClient
{
    public const HEADER = 'X-AI-Service-Key';

    public static function request(): PendingRequest
    {
        $request = Http::baseUrl(rtrim((string) config('services.ai.url'), '/'))
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('services.ai.timeout', 15));

        $secret = (string) config('services.ai.secret', '');
        if ($secret !== '') {
            $request = $request->withHeaders([self::HEADER => $secret]);
        }

        return $request;
    }
}
