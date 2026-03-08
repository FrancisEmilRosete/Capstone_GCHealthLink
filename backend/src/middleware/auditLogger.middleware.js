const { prisma } = require("../lib/prisma");

function resolveClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function auditLogger(actionOrResolver) {
  return (req, res, next) => {
    res.on("finish", async () => {
      if (res.statusCode >= 400) {
        return;
      }

      try {
        const action =
          typeof actionOrResolver === "function"
            ? actionOrResolver(req, res)
            : actionOrResolver;

        if (!action) {
          return;
        }

        await prisma.auditLog.create({
          data: {
            userId: req.user?.id || null,
            action,
            targetId:
              req.params?.id || req.body?.studentProfileId || req.body?.studentId || null,
            ipAddress: resolveClientIp(req),
            metadata: {
              method: req.method,
              path: req.originalUrl,
              role: req.user?.role || null,
              statusCode: res.statusCode,
            },
          },
        });
      } catch (error) {
        // Non-blocking on purpose; audit failure should not crash request lifecycle.
        console.error("auditLogger failed:", error.message);
      }
    });

    return next();
  };
}

module.exports = { auditLogger };
