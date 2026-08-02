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

];
