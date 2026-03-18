const { verifyAccessToken } = require("../lib/jwt");
const { ROLES } = require("../lib/roles");

const VALID_ROLES = new Set(Object.values(ROLES));

function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  if (!token || token.length > 4096) {
    return null;
  }

  return token;
}

function isValidTokenPayload(decoded) {
  if (!decoded || typeof decoded !== "object") {
    return false;
  }

  const userId = typeof decoded.userId === "string" ? decoded.userId.trim() : "";
  const role = typeof decoded.role === "string" ? decoded.role.trim() : "";

  return !!userId && VALID_ROLES.has(role);
}

const protect = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const decoded = verifyAccessToken(token);

    if (!isValidTokenPayload(decoded)) {
      return res.status(401).json({ success: false, message: "Not authorized, invalid token payload" });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    const isExpired = error?.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired ? "Not authorized, token expired" : "Not authorized, token failed",
    });
  }
};

module.exports = { protect };