<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\InputBag;
use Symfony\Component\HttpFoundation\Response;

/**
 * EncryptApiPayloads
 *
 * Transparent AES-256-CBC + HMAC-SHA256 envelope for JSON API traffic.
 *
 * Envelope format:
 *   Positional wire format: Base64("v1.<iv>.<mac>.<data>")
 *   Internal envelope:      { "enc": "v1", "iv": "<base64>", "data": "<base64 ciphertext>", "mac": "<hex>" }
 *
 * Keys are derived from AES_PAYLOAD_KEY (must equal NEXT_PUBLIC_AES_KEY):
 *   encKey = SHA256("enc:" . secret)   (32 bytes → AES-256)
 *   macKey = SHA256("mac:" . secret)
 *   mac    = HMAC_SHA256(macKey, iv_b64 . data_b64)
 *
 * Activation: the client sends `X-Encrypted-Payload: 1`. Only those requests
 * are decrypted / have their JSON responses encrypted, so file uploads
 * (multipart), blob downloads, SSE streams and broadcasting auth keep working.
 * Set AES_PAYLOAD_ENFORCE=true to reject plaintext JSON bodies outright.
 */
class EncryptApiPayloads
{
    public const HEADER = 'X-Encrypted-Payload';

    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('aes.payload_key', '');
        if ($secret === '') {
            return $next($request); // Feature disabled when no key configured.
        }

        $wantsEncryption = $request->headers->get(self::HEADER) === '1';

        if (!$wantsEncryption) {
            if (config('aes.payload_enforce') && $request->isJson() && $request->getContent() !== '') {
                return response()->json(['message' => 'Encrypted payload required.'], 400);
            }
            return $next($request);
        }

        // ── Decrypt incoming body ───────────────────────────────────────
        $rawContent = trim($request->getContent());
        if ($rawContent !== '') {
            $envelope = self::unpackEnvelope($rawContent);
            $plain = $envelope !== null ? self::decrypt($envelope, $secret) : null;

            if ($plain === null) {
                return response()->json(['message' => 'Invalid or tampered encrypted payload.'], 400);
            }

            $data = json_decode($plain, true);
            if (!is_array($data)) {
                $data = [];
            }

            $bag = new InputBag($data);
            $request->setJson($bag);
            $request->request = $bag;
        }

        $response = $next($request);

        // ── Encrypt outgoing JSON ───────────────────────────────────────
        if ($response instanceof JsonResponse) {
            $packed = self::encrypt((string) $response->getContent(), $secret);
            $response->setData($packed);
            $response->headers->set(self::HEADER, '1');
        }

        return $response;
    }

    /** @return array{0:string,1:string} [encKey, macKey] */
    private static function keys(string $secret): array
    {
        return [
            hash('sha256', 'enc:' . $secret, true),
            hash('sha256', 'mac:' . $secret, true),
        ];
    }

    public static function packEnvelope(array $envelope): string
    {
        // Positional label-free envelope: v1.<iv>.<mac>.<data>
        // Avoids predictable JSON {"enc":...} "eyJ" prefix and contains no JSON keys.
        $raw = "{$envelope['enc']}.{$envelope['iv']}.{$envelope['mac']}.{$envelope['data']}";
        return base64_encode($raw);
    }

    public static function unpackEnvelope(mixed $raw): ?array
    {
        if (is_array($raw)) {
            return self::isValidEnvelope($raw) ? $raw : null;
        }

        if (!is_string($raw)) {
            return null;
        }

        $trimmed = trim($raw);
        if ($trimmed === '') {
            return null;
        }

        // 1. Direct JSON envelope check (handles legacy JSON objects)
        $decodedJson = json_decode($trimmed, true);
        if (is_array($decodedJson) && self::isValidEnvelope($decodedJson)) {
            return $decodedJson;
        }

        // 2. Unquote if sent as JSON string primitive ("djEu..." or legacy "eyJlbmMi...")
        $candidate = is_string($decodedJson) ? trim($decodedJson) : $trimmed;
        $candidate = trim($candidate, "\"'");

        // 3. Base64 decode envelope string
        $decodedBase64 = base64_decode($candidate, true);
        if ($decodedBase64 !== false && $decodedBase64 !== '') {
            // 3a. Positional delimiter format: v1.<iv>.<mac>.<data>
            $parts = explode('.', $decodedBase64, 4);
            if (count($parts) === 4 && $parts[0] === 'v1' && $parts[1] !== '' && $parts[2] !== '' && $parts[3] !== '') {
                $envelope = [
                    'enc'  => 'v1',
                    'iv'   => $parts[1],
                    'mac'  => $parts[2],
                    'data' => $parts[3],
                ];
                if (self::isValidEnvelope($envelope)) {
                    return $envelope;
                }
            }

            // 3b. Fallback: Base64-encoded JSON envelope
            $jsonEnvelope = json_decode($decodedBase64, true);
            if (is_array($jsonEnvelope) && self::isValidEnvelope($jsonEnvelope)) {
                return $jsonEnvelope;
            }
        }

        return null;
    }

    private static function isValidEnvelope(array $envelope): bool
    {
        return ($envelope['enc'] ?? null) === 'v1'
            && is_string($envelope['iv'] ?? null)
            && is_string($envelope['data'] ?? null)
            && is_string($envelope['mac'] ?? null);
    }

    /**
     * Encrypts plaintext string and returns a single opaque Base64 string.
     */
    public static function encrypt(string $plain, string $secret): string
    {
        $envelope = self::encryptRaw($plain, $secret);
        return self::packEnvelope($envelope);
    }

    /**
     * Encrypts plaintext string and returns the raw associative envelope array.
     *
     * @return array{enc:string,iv:string,data:string,mac:string}
     */
    public static function encryptRaw(string $plain, string $secret): array
    {
        [$encKey, $macKey] = self::keys($secret);
        $iv = random_bytes(16);
        $cipher = openssl_encrypt($plain, 'aes-256-cbc', $encKey, OPENSSL_RAW_DATA, $iv);

        $ivB64 = base64_encode($iv);
        $dataB64 = base64_encode((string) $cipher);

        return [
            'enc'  => 'v1',
            'iv'   => $ivB64,
            'data' => $dataB64,
            'mac'  => hash_hmac('sha256', $ivB64 . $dataB64, $macKey),
        ];
    }

    /**
     * Decrypts an envelope (either raw array or packed Base64 string).
     */
    public static function decrypt(array|string $envelope, string $secret): ?string
    {
        if (is_string($envelope)) {
            $unpacked = self::unpackEnvelope($envelope);
            if ($unpacked === null) {
                return null;
            }
            $envelope = $unpacked;
        }

        if (!self::isValidEnvelope($envelope)) {
            return null;
        }

        [$encKey, $macKey] = self::keys($secret);
        $expected = hash_hmac('sha256', $envelope['iv'] . $envelope['data'], $macKey);
        if (!hash_equals($expected, strtolower($envelope['mac']))) {
            return null;
        }

        $iv = base64_decode($envelope['iv'], true);
        $cipher = base64_decode($envelope['data'], true);
        if ($iv === false || $cipher === false || strlen($iv) !== 16) {
            return null;
        }

        $plain = openssl_decrypt($cipher, 'aes-256-cbc', $encKey, OPENSSL_RAW_DATA, $iv);

        return $plain === false ? null : $plain;
    }
}
