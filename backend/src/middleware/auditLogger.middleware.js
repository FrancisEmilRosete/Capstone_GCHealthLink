const { prisma } = require("../lib/prisma");

function resolveClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

const actionDebounceMap = new Map();

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

        // Filter out low-value telemetry/navigation logs
        if (action.startsWith("VIEWED_") || action.startsWith("ADMIN_VIEWED_")) {
          return;
        }

        const candidateUserId = req.user?.userId || null;

        // Prevent duplicate rapid-fire logging of the same action
        if (candidateUserId) {
          const debounceKey = `${candidateUserId}:${action}`;
          if (actionDebounceMap.has(debounceKey)) {
            return; // Ignore rapid succession
          }
          actionDebounceMap.set(debounceKey, true);
          setTimeout(() => actionDebounceMap.delete(debounceKey), 2000);
        }

        // Tokens can reference stale user IDs after DB reset/reseed.
        // Only persist userId if the account still exists.
        let safeUserId = null;
        if (candidateUserId) {
          const existingUser = await prisma.user.findUnique({
            where: { id: candidateUserId },
            select: { id: true },
          });
          safeUserId = existingUser?.id || null;
        }

        await prisma.auditLog.create({
          data: {
            userId: safeUserId,
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
