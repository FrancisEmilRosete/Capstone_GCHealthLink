<?php

/**
 * config/aes.php
 *
 * Configuration for the AES-256-GCM transport encryption layer.
 *
 * All values are read from environment variables so they are never
 * hard-coded in source control.
 */

return [

    /*
    |--------------------------------------------------------------------------
    | AES-256-GCM Shared Secret
    |--------------------------------------------------------------------------
    |
    | A 64-character hexadecimal string representing 32 raw bytes.
    | This MUST match NEXT_PUBLIC_AES_SHARED_SECRET in the Next.js frontend.
    |
    | Generate a new secret with:
    |   php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
    |
    | Or with Node.js:
    |   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    |
    */
    'shared_secret' => env('APP_AES_SECRET'),

];
