const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function generateAccessToken(payload, options = {}) {
  const secret = getJwtSecret();
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || "8h";

  return jwt.sign(payload, secret, { expiresIn });
}

function verifyAccessToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
