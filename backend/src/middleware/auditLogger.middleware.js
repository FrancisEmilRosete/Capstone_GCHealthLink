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
        const resolvedAction =
          typeof actionOrResolver === "function"
            ? actionOrResolver(req, res)
            : actionOrResolver;

        if (!resolvedAction) {
          return;
        }

        let actionType = "VIEW";
        let description = "";

        if (typeof resolvedAction === "string") {
          // Fallback for legacy generic strings
          actionType = "OTHER";
          description = resolvedAction;
        } else if (typeof resolvedAction === "object") {
          actionType = resolvedAction.actionType || "OTHER";
          description = resolvedAction.description || "No description provided";
        }

        // Filter out low-value telemetry/navigation logs if still using legacy strings
        if (description.startsWith("VIEWED_") || description.startsWith("ADMIN_VIEWED_")) {
          return;
        }

        const candidateUserId = req.user?.userId || null;
        const candidateUserRole = req.user?.clinicStaffType || req.user?.role || "STUDENT";

        // Prevent duplicate rapid-fire logging of the same action
        if (candidateUserId) {
          const debounceKey = `${candidateUserId}:${description}`;
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
            userRole: candidateUserRole.toUpperCase(),
            actionType,
            description,
            targetId:
              req.auditLog?.targetId
              || req.params?.id
              || req.params?.appointmentId
              || req.body?.appointmentId
              || req.body?.studentProfileId
              || req.body?.studentId
              || null,
            ipAddress: resolveClientIp(req),
            metadata: {
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
              ...(req.auditLog?.metadata && typeof req.auditLog.metadata === "object"
                ? req.auditLog.metadata
                : {}),
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

async function logSpecificAction({ req, userId, userRole, actionType, description, targetId, ipAddress, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userRole: userRole ? userRole.toUpperCase() : "SYSTEM",
        actionType,
        description,
        targetId: targetId || null,
        ipAddress: ipAddress || (req ? resolveClientIp(req) : null),
        metadata: metadata || (req ? { method: req.method, path: req.originalUrl } : {}),
      },
    });
  } catch (error) {
    console.error("logSpecificAction failed:", error.message);
  }
}

module.exports = { auditLogger, logSpecificAction };
