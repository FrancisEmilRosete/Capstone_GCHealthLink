const crypto = require('crypto');
const http = require('http');

const secret = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const rawKey = Buffer.from(secret, 'hex');
const derived = crypto.hkdfSync('sha256', rawKey, 'GCHealthLink-Salt-v1', 'GCHealthLink-AES-GCM-v1', 32);

function encrypt(data) {
  const iv = crypto.randomBytes(12);
  const payload = JSON.stringify(data);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(derived), iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, tag]);
  return combined.toString('base64url');
}

function decrypt(blob) {
  const combined = Buffer.from(blob, 'base64url');
  const iv = combined.slice(0, 12);
  const tag = combined.slice(-16);
  const ciphertext = combined.slice(12, -16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(derived), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// Test login
const loginData = { email: 'admin@gchealthlink.com', password: 'password' };
const encryptedPayload = encrypt(loginData);
const body = JSON.stringify({ payload: encryptedPayload });

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Encrypted-Request': '1',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Raw response:', data.substring(0, 200));
    try {
      const parsed = JSON.parse(data);
      if (parsed.payload) {
        const decrypted = decrypt(parsed.payload);
        console.log('Decrypted response:', JSON.stringify(decrypted, null, 2));
      } else {
        console.log('Non-encrypted response:', parsed);
      }
    } catch(e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(body);
req.end();
