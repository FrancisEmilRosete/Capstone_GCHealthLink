<?php

/**
 * config/services.php
 *
 * Third-party service credentials.
 * Add this file to the real Laravel installation (it complements the default
 * services.php that ships with Laravel — merge it if one already exists).
 */

return [

    // -------------------------------------------------------------------------
    // Google Gemini — Phase 4 AI Assistant
    // -------------------------------------------------------------------------
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model'   => env('GEMINI_MODEL', 'gemini-1.5-flash'),
    ],

    // -------------------------------------------------------------------------
    // Mailgun — for future email notifications (Phase 5)
    // -------------------------------------------------------------------------
    'mailgun' => [
        'domain'   => env('MAILGUN_DOMAIN'),
        'secret'   => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme'   => 'https',
    ],

    // -------------------------------------------------------------------------
    // Postmark — alternative mailer (Phase 5)
    // -------------------------------------------------------------------------
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    // -------------------------------------------------------------------------
    // Python FastAPI AI microservice (ai-service-python)
    // Read via config('services.ai.*') — never env() in controllers, so
    // `php artisan config:cache` keeps working.
    // `secret` is sent as the X-AI-Service-Key header and must equal
    // AI_SERVICE_SECRET in the Python service's environment.
    // -------------------------------------------------------------------------
    'ai' => [
        'url'     => env('AI_SERVICE_URL', 'http://127.0.0.1:8001'),
        'secret'  => env('AI_SERVICE_SECRET', ''),
        'timeout' => (int) env('AI_SERVICE_TIMEOUT', 15),
    ],

];
