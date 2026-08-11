/**
 * AES-256-GCM Encryption / Decryption
 * 
 * Wire format: base64url( IV[12 bytes] || ciphertext || authTag[16 bytes] )
 * Mirrors the Laravel backend `App\Services\AesGcmCipher`.
 */

const ALGO = 'AES-GCM';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HKDF_SALT = new TextEncoder().encode('GCHealthLink-Salt-v1');
const HKDF_INFO = new TextEncoder().encode('GCHealthLink-AES-GCM-v1');

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(b64url: string): ArrayBuffer {
  let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

let derivedKeyPromise: Promise<CryptoKey> | null = null;

async function getDerivedKey(): Promise<CryptoKey> {
  if (derivedKeyPromise) return derivedKeyPromise;
  
  const hexSecret = process.env.NEXT_PUBLIC_AES_SHARED_SECRET || '';
  if (hexSecret.length !== 64) {
    throw new Error('NEXT_PUBLIC_AES_SHARED_SECRET must be a 64-character hex string');
  }
  
  const ikm = hexToBytes(hexSecret);
  
  derivedKeyPromise = (async () => {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      ikm as any,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: HKDF_SALT as any,
        info: HKDF_INFO as any,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  })();
  
  return derivedKeyPromise;
}

/**
 * Encrypts an arbitrary JSON payload and returns the base64url blob.
 */
export async function encryptApiPayload(data: unknown): Promise<string> {
  const key = await getDerivedKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: ALGO, iv: iv as any },
    key,
    plaintext as any
  );
  
  const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuffer), iv.length);
  
  return base64UrlEncode(combined.buffer);
}

/**
 * Decrypts a base64url blob back into its original JSON object.
 */
export async function decryptApiPayload(blob: string): Promise<unknown> {
  const key = await getDerivedKey();
  const buffer = base64UrlDecode(blob);
  
  if (buffer.byteLength < IV_BYTES + TAG_BYTES) {
    throw new Error('Encrypted payload too short');
  }
  
  const iv = buffer.slice(0, IV_BYTES);
  const ciphertext = buffer.slice(IV_BYTES);
  
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: ALGO, iv: (new Uint8Array(iv)) as any },
    key,
    ciphertext as any
  );
  
  const plaintext = new TextDecoder().decode(plaintextBuffer);
  return JSON.parse(plaintext);
}
