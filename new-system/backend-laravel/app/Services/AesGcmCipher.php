<?php

declare(strict_types=1);

namespace App\Services;

/**
 * AesGcmCipher
 *
 * AES-256-GCM encryption / decryption for the GCHealthLink API.
 *
 * Wire format (must match the Next.js crypto.ts implementation):
 *   base64url( IV[12 bytes] || ciphertext || authTag[16 bytes] )
 *
 * The shared secret is derived via HKDF-SHA256 to mirror the Web Crypto API
 * derivation performed in the Next.js client.
 *
 * Configuration (config/aes.php):
 *   APP_AES_SECRET  — 64-character hex string (32 raw bytes)
 *
 * @package App\Services
 */
class AesGcmCipher
{
    private const ALGO       = 'aes-256-gcm';
    private const IV_BYTES   = 12;   // 96-bit IV — optimal for GCM
    private const TAG_BYTES  = 16;   // 128-bit authentication tag
    private const KEY_BYTES  = 32;   // 256-bit derived key

    // Must match the constants in the Next.js crypto.ts
    private const HKDF_SALT  = 'GCHealthLink-Salt-v1';
    private const HKDF_INFO  = 'GCHealthLink-AES-GCM-v1';

    private string $derivedKey;

    public function __construct()
    {
        $hexSecret = config('aes.shared_secret');

        if (!$hexSecret || strlen($hexSecret) !== 64) {
            throw new \RuntimeException(
                'APP_AES_SECRET must be a 64-character hex string (32 bytes). ' .
                'Generate one with: php -r "echo bin2hex(random_bytes(32));"'
            );
        }

        $rawSecret = hex2bin($hexSecret);

        // Derive the AES key via HKDF-SHA256 — mirrors Web Crypto in Next.js
        $this->derivedKey = $this->hkdfSha256(
            $rawSecret,
            self::HKDF_SALT,
            self::HKDF_INFO,
            self::KEY_BYTES
        );
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Encrypt an array / scalar and return a base64url-encoded wire blob.
     *
     * @param  mixed $data  Any JSON-serialisable value.
     * @return string       base64url( IV || ciphertext || authTag )
     */
    public function encrypt(mixed $data): string
    {
        $plaintext = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $iv        = random_bytes(self::IV_BYTES);
        $tag       = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::ALGO,
            $this->derivedKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,          // OUT — filled by openssl_encrypt
            '',            // additional authenticated data (AAD) — not used
            self::TAG_BYTES
        );

        if ($ciphertext === false) {
            throw new \RuntimeException('AES-256-GCM encryption failed: ' . openssl_error_string());
        }

        // Concatenate: IV (12) + ciphertext + authTag (16)
        $combined = $iv . $ciphertext . $tag;

        return $this->base64UrlEncode($combined);
    }

    /**
     * Decrypt a base64url wire blob and return the original decoded value.
     *
     * @param  string $blob  base64url( IV || ciphertext || authTag )
     * @return mixed         Decoded JSON value (array, string, int, etc.)
     * @throws \RuntimeException  If decryption or authentication fails.
     */
    public function decrypt(string $blob): mixed
    {
        $combined = $this->base64UrlDecode($blob);

        if (strlen($combined) < self::IV_BYTES + self::TAG_BYTES) {
            throw new \RuntimeException('Encrypted payload is too short.');
        }

        $iv         = substr($combined, 0, self::IV_BYTES);
        $tag        = substr($combined, -self::TAG_BYTES);
        $ciphertext = substr($combined, self::IV_BYTES, -self::TAG_BYTES);

        $plaintext = openssl_decrypt(
            $ciphertext,
            self::ALGO,
            $this->derivedKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            // openssl_decrypt returns false on authentication tag mismatch
            throw new \RuntimeException(
                'AES-256-GCM decryption failed — possible tampering or wrong key.'
            );
        }

        return json_decode($plaintext, true, 512, JSON_THROW_ON_ERROR);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * HKDF-SHA256 implementation.
     * PHP 8.1+ has hash_hkdf() built in — we use it directly.
     *
     * @param  string $ikm    Input key material (raw bytes).
     * @param  string $salt   Non-secret random salt (can be a static string).
     * @param  string $info   Context string (application-specific label).
     * @param  int    $length Output length in bytes.
     * @return string         Derived key (raw bytes).
     */
    private function hkdfSha256(
        string $ikm,
        string $salt,
        string $info,
        int $length
    ): string {
        return hash_hkdf('sha256', $ikm, $length, $info, $salt);
    }

    /** Encode raw bytes to base64url (no padding). */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /** Decode a base64url string to raw bytes. */
    private function base64UrlDecode(string $data): string
    {
        $padded = strtr($data, '-_', '+/');
        $pad    = strlen($padded) % 4;
        if ($pad) {
            $padded .= str_repeat('=', 4 - $pad);
        }
        $decoded = base64_decode($padded, true);
        if ($decoded === false) {
            throw new \RuntimeException('Invalid base64url payload.');
        }
        return $decoded;
    }
}
