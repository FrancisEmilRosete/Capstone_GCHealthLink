<?php

declare(strict_types=1);

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Drop-in replacement for Laravel's 'encrypted' cast that tolerates legacy
 * plaintext rows (written before field-level encryption was introduced).
 *
 * - get(): decrypts; if the stored value isn't a valid Laravel ciphertext,
 *          returns it as-is instead of throwing "The payload is invalid."
 * - set(): always encrypts, so any row that is re-saved gets migrated.
 */
class SafeEncrypted implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString((string) $value);
        } catch (DecryptException) {
            return (string) $value; // legacy plaintext
        }
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : Crypt::encryptString((string) $value);
    }
}
