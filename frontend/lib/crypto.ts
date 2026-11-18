/**
 * API PAYLOAD CRYPTO
 * ──────────────────────────────────────────────────────────────
 * AES-256-CBC + HMAC-SHA256 envelope, mirrored by the Laravel
 * middleware App\Http\Middleware\EncryptApiPayloads.
 *
 * Wire format (single continuous Base64 string):
 *   "djEu..." (Base64 of positional "v1.<iv>.<mac>.<data>")
 *
 * Internal envelope:
 *   { enc: 'v1', iv: <base64>, data: <base64>, mac: <hex> }
 *
 * encKey = SHA256('enc:' + SECRET), macKey = SHA256('mac:' + SECRET)
 * mac    = HMAC_SHA256(macKey, iv + data)
 *
 * ⚠ NEXT_PUBLIC_* values are bundled into client JS. This layer hides
 * plaintext from casual inspection / intermediaries, but it is NOT a
 * substitute for HTTPS and does not protect against a user inspecting
 * their own browser bundle.
 */
import CryptoJS from 'crypto-js';

const SECRET = process.env.NEXT_PUBLIC_AES_KEY ?? '';

export const ENCRYPTION_HEADER = 'X-Encrypted-Payload';
export const isPayloadEncryptionEnabled = SECRET.length > 0;

export interface EncryptedEnvelope {
  enc: 'v1';
  iv: string;
  data: string;
  mac: string;
}

const encKey = CryptoJS.SHA256('enc:' + SECRET);
const macKey = CryptoJS.SHA256('mac:' + SECRET);

export function packEnvelope(envelope: EncryptedEnvelope): string {
  // Positional label-free envelope: v1.<iv>.<mac>.<data>
  // Avoids predictable JSON {"enc":...} "eyJ" prefix and contains no JSON keys.
  const raw = `${envelope.enc}.${envelope.iv}.${envelope.mac}.${envelope.data}`;
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(raw));
}

export function unpackEnvelope(packed: unknown): EncryptedEnvelope | null {
  if (!packed) return null;

  // Backward compatibility: already a parsed object envelope
  if (typeof packed === 'object') {
    const obj = packed as any;
    if (
      obj.enc === 'v1'
      && typeof obj.iv === 'string'
      && typeof obj.data === 'string'
      && typeof obj.mac === 'string'
    ) {
      return obj as EncryptedEnvelope;
    }
    return null;
  }

  if (typeof packed !== 'string') {
    return null;
  }

  let raw = packed.trim();
  // Strip surrounding quotes if raw string was JSON serialized (e.g., "\"djEu...\"")
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.slice(1, -1);
    }
  }

  // 1. Try decoding Base64 string
  try {
    const decodedStr = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(raw));
    if (decodedStr) {
      // 1a. Positional delimiter format: v1.<iv>.<mac>.<data>
      const parts = decodedStr.split('.');
      if (parts.length >= 4 && parts[0] === 'v1') {
        const iv = parts[1];
        const mac = parts[2];
        const data = parts.slice(3).join('.');
        if (iv && mac && data) {
          return { enc: 'v1', iv, mac, data };
        }
      }

      // 1b. Fallback: Base64-encoded JSON envelope
      try {
        const parsed = JSON.parse(decodedStr);
        if (
          parsed
          && typeof parsed === 'object'
          && parsed.enc === 'v1'
          && typeof parsed.iv === 'string'
          && typeof parsed.data === 'string'
          && typeof parsed.mac === 'string'
        ) {
          return parsed as EncryptedEnvelope;
        }
      } catch {
        // ignore JSON parse error
      }
    }
  } catch {
    // ignore Base64 decode error
  }

  // 2. Direct JSON fallback (if raw was unencoded JSON string)
  try {
    const directParsed = JSON.parse(raw);
    if (
      directParsed
      && typeof directParsed === 'object'
      && directParsed.enc === 'v1'
      && typeof directParsed.iv === 'string'
      && typeof directParsed.data === 'string'
      && typeof directParsed.mac === 'string'
    ) {
      return directParsed as EncryptedEnvelope;
    }
  } catch {
    // ignore
  }

  return null;
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope | string {
  return unpackEnvelope(value) !== null;
}

export function encryptApiPayloadEnvelope(payload: unknown): EncryptedEnvelope {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ivB64 = CryptoJS.enc.Base64.stringify(iv);
  const dataB64 = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  const mac = CryptoJS.HmacSHA256(ivB64 + dataB64, macKey).toString(CryptoJS.enc.Hex);

  return { enc: 'v1', iv: ivB64, data: dataB64, mac };
}

export function encryptApiPayload(payload: unknown): string {
  return packEnvelope(encryptApiPayloadEnvelope(payload));
}

export function decryptApiPayload<T = unknown>(envelopeOrPacked: EncryptedEnvelope | string): T {
  const envelope = typeof envelopeOrPacked === 'string' || !('enc' in (envelopeOrPacked as object))
    ? unpackEnvelope(envelopeOrPacked)
    : (envelopeOrPacked as EncryptedEnvelope);

  if (!envelope) {
    throw new Error('Encrypted payload failed integrity check.');
  }

  const expected = CryptoJS.HmacSHA256(envelope.iv + envelope.data, macKey).toString(CryptoJS.enc.Hex);
  if (expected !== envelope.mac.toLowerCase()) {
    throw new Error('Encrypted payload failed integrity check.');
  }

  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(envelope.data) }),
    encKey,
    { iv: CryptoJS.enc.Base64.parse(envelope.iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
  );

  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)) as T;
}
