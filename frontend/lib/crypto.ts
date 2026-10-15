/**
 * API PAYLOAD CRYPTO
 * ──────────────────────────────────────────────────────────────
 * AES-256-CBC + HMAC-SHA256 envelope, mirrored by the Laravel
 * middleware App\Http\Middleware\EncryptApiPayloads.
 *
 *   { enc: 'v1', iv: <base64>, data: <base64>, mac: <hex> }
 *
 * encKey = SHA256('enc:' + secret), macKey = SHA256('mac:' + secret)
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

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return !!value
    && typeof value === 'object'
    && (value as any).enc === 'v1'
    && typeof (value as any).iv === 'string'
    && typeof (value as any).data === 'string'
    && typeof (value as any).mac === 'string';
}

export function encryptApiPayload(payload: unknown): EncryptedEnvelope {
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

export function decryptApiPayload<T = unknown>(envelope: EncryptedEnvelope): T {
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
