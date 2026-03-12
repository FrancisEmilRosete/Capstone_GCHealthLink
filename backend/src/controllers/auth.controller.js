const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

const LOGIN_RATE_WINDOW_MS = Number(process.env.LOGIN_RATE_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_RATE_MAX_PER_IP = Number(process.env.LOGIN_RATE_MAX_PER_IP || 30);
const LOGIN_MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5);
const LOGIN_LOCK_DURATION_MS = Number(process.env.LOGIN_LOCK_DURATION_MS || 15 * 60 * 1000);

const ipLoginAttempts = new Map();
const identityFailures = new Map();

function trimExpiredIpAttempts(now) {
  for (const [ip, timestamps] of ipLoginAttempts.entries()) {
    const valid = timestamps.filter((timestamp) => now - timestamp < LOGIN_RATE_WINDOW_MS);
    if (valid.length === 0) {
      ipLoginAttempts.delete(ip);
      continue;
    }
    ipLoginAttempts.set(ip, valid);
  }
}

function recordIpLoginAttempt(ip, now) {
  const timestamps = ipLoginAttempts.get(ip) || [];
  const valid = timestamps.filter((timestamp) => now - timestamp < LOGIN_RATE_WINDOW_MS);
  valid.push(now);
  ipLoginAttempts.set(ip, valid);
  return valid.length;
}

function trimExpiredIdentityFailures(now) {
  for (const [key, value] of identityFailures.entries()) {
    if (value.lockUntil && value.lockUntil > now) {
      continue;
    }

    if (now - value.lastFailedAt > LOGIN_RATE_WINDOW_MS) {
      identityFailures.delete(key);
    }
  }
}

function recordFailedIdentityAttempt(identityKey, now) {
  const current = identityFailures.get(identityKey) || {
    count: 0,
    lockUntil: 0,
    lastFailedAt: 0,
  };

  const isWindowExpired = now - current.lastFailedAt > LOGIN_RATE_WINDOW_MS;
  const nextCount = isWindowExpired ? 1 : current.count + 1;
  const lockUntil = nextCount >= LOGIN_MAX_FAILED_ATTEMPTS ? now + LOGIN_LOCK_DURATION_MS : 0;

  const next = {
    count: nextCount,
    lockUntil,
    lastFailedAt: now,
  };

  identityFailures.set(identityKey, next);
  return next;
}

function getIdentityState(identityKey) {
  return identityFailures.get(identityKey);
}

function clearIdentityFailures(identityKey) {
  identityFailures.delete(identityKey);
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientIp(req) {
  if (typeof req.ip === "string" && req.ip.trim()) {
    return req.ip.trim();
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

function lockedResponse(res, lockUntil, now) {
  const retryAfterSeconds = Math.max(1, Math.ceil((lockUntil - now) / 1000));
  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    success: false,
    message: `Too many failed login attempts. Try again in ${retryAfterSeconds} seconds.`,
  });
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const now = Date.now();
    const ip = getClientIp(req);

    trimExpiredIpAttempts(now);
    trimExpiredIdentityFailures(now);

    const ipRequestCount = recordIpLoginAttempt(ip, now);
    if (ipRequestCount > LOGIN_RATE_MAX_PER_IP) {
      const retryAfterSeconds = Math.max(1, Math.ceil(LOGIN_RATE_WINDOW_MS / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: "Too many login requests from this IP. Please try again later.",
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password must be provided as text values.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (!isLikelyEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT secret is not configured." });
    }

    const identityKey = `${ip}|${normalizedEmail}`;
    const identityState = getIdentityState(identityKey);
    if (identityState?.lockUntil && identityState.lockUntil > now) {
      return lockedResponse(res, identityState.lockUntil, now);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      const failure = recordFailedIdentityAttempt(identityKey, now);
      if (failure.lockUntil > now) {
        return lockedResponse(res, failure.lockUntil, now);
      }
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const failure = recordFailedIdentityAttempt(identityKey, now);
      if (failure.lockUntil > now) {
        return lockedResponse(res, failure.lockUntil, now);
      }
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    clearIdentityFailures(identityKey);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login };