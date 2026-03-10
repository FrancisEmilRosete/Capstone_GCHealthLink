const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let cachedKey = null;

function resolveKey() {
  if (cachedKey) {
    return cachedKey;
  }

  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    cachedKey = Buffer.from(rawKey, "hex");
    return cachedKey;
  }

  const base64Buffer = Buffer.from(rawKey, "base64");
  if (base64Buffer.length === 32) {
    cachedKey = base64Buffer;
    return cachedKey;
  }

  if (Buffer.byteLength(rawKey, "utf8") === 32) {
    cachedKey = Buffer.from(rawKey, "utf8");
    return cachedKey;
  }

  throw new Error(
    "ENCRYPTION_KEY must be a 32-byte UTF-8 value, 64-char hex, or base64-encoded 32-byte value"
  );
}

function encryptString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const plaintext = typeof value === "string" ? value : JSON.stringify(value);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = resolveKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptString(ciphertext) {
  if (!ciphertext) {
    return null;
  }

  const [ivRaw, authTagRaw, encryptedRaw] = ciphertext.split(".");
  if (!ivRaw || !authTagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivRaw, "base64");
  const authTag = Buffer.from(authTagRaw, "base64");
  const encrypted = Buffer.from(encryptedRaw, "base64");
  const key = resolveKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function isEncryptedPayload(value) {
  if (typeof value !== "string") {
    return false;
  }

  const parts = value.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function encryptStringSafe(value) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return encryptString(value);
  } catch {
    // Keep development usable when ENCRYPTION_KEY is not configured.
    return typeof value === "string" ? value : JSON.stringify(value);
  }
}

function decryptStringSafe(ciphertext) {
  if (ciphertext === null || ciphertext === undefined) {
    return null;
  }

  if (typeof ciphertext !== "string") {
    return String(ciphertext);
  }

  if (!isEncryptedPayload(ciphertext)) {
    return ciphertext;
  }

  try {
    return decryptString(ciphertext);
  } catch {
    // Backward compatibility for legacy/plaintext rows.
    return ciphertext;
  }
}

function encryptBoolean(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "boolean") {
    throw new Error("encryptBoolean expects a boolean, null, or undefined");
  }

  return encryptString(value ? "true" : "false");
}

function decryptBoolean(ciphertext) {
  if (!ciphertext) {
    return null;
  }

  return decryptString(ciphertext) === "true";
}

function encryptJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return encryptString(JSON.stringify(value));
}

function decryptJson(ciphertext) {
  if (!ciphertext) {
    return null;
  }

  return JSON.parse(decryptString(ciphertext));
}

module.exports = {
  encryptString,
  decryptString,
  encryptStringSafe,
  decryptStringSafe,
  isEncryptedPayload,
  encryptBoolean,
  decryptBoolean,
  encryptJson,
  decryptJson,
};
