const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ALLOWED_SEVERITIES = new Set(["INFO", "WARNING", "CRITICAL"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDept(value) {
  const dept = normalizeText(value);
  return dept ? dept.toUpperCase() : "";
}

function normalizeAudienceList(value) {
  if (Array.isArray(value)) {
    const unique = [];
    const seen = new Set();

    for (const raw of value) {
      const normalized = normalizeDept(raw);
      if (!normalized) continue;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(normalized);
      }
    }

    return unique;
  }

  const single = normalizeDept(value);
  return single ? [single] : [];
}

function serializeAudienceTargets(targets) {
  if (!targets.length || targets.includes("ALL")) {
    return "ALL";
  }

  return targets.join(",");
}

function parseAudienceTargets(value) {
  const normalized = normalizeDept(value);
  if (!normalized || normalized === "ALL") {
    return ["ALL"];
  }

  return normalized
    .split(",")
    .map((entry) => normalizeDept(entry))
    .filter(Boolean);
}

function buildTargetDeptWhere(tokens) {
  if (!tokens.length || tokens.includes("ALL")) {
    return {};
  }

  const clauses = [];

  for (const token of tokens) {
    clauses.push({
      targetDept: {
        equals: token,
        mode: "insensitive",
      },
    });

    clauses.push({
      targetDept: {
        contains: token,
        mode: "insensitive",
      },
    });
  }

  clauses.push({
    targetDept: {
      equals: "ALL",
      mode: "insensitive",
    },
  });

  return { OR: clauses };
}

function normalizeStringArray(value, fieldName) {
  if (value === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, message: `${fieldName} must be an array.` };
  }

  if (value.length > 2000) {
    return { ok: false, message: `${fieldName} cannot have more than 2000 items.` };
  }

  const unique = [];
  const seen = new Set();

  for (const raw of value) {
    const normalized = normalizeText(raw);
    if (!normalized) {
      continue;
    }

    if (normalized.length > 120) {
      return { ok: false, message: `${fieldName} items must be 120 characters or fewer.` };
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }

  return { ok: true, value: unique };
}

// ==========================================
// 3. USER VIEW: Get notification read/dismiss state
// ==========================================
const getNotificationState = async (req, res, next) => {
  try {
    const latest = await prisma.auditLog.findFirst({
      where: {
        userId: req.user.userId,
        action: "UPDATED_NOTIFICATION_STATE",
      },
      orderBy: {
        timestamp: "desc",
      },
      select: {
        metadata: true,
      },
    });

    const metadata = latest?.metadata && typeof latest.metadata === "object" ? latest.metadata : {};
    const readIds = normalizeStringArray(metadata.readIds, "readIds").value;
    const dismissedIds = normalizeStringArray(metadata.dismissedIds, "dismissedIds").value;

    return res.json({
      success: true,
      message: "Notification state retrieved successfully.",
      data: {
        readIds,
        dismissedIds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// 4. USER ACTION: Persist notification read/dismiss state
// ==========================================
const updateNotificationState = async (req, res, next) => {
  try {
    const readIdsResult = normalizeStringArray(req.body?.readIds, "readIds");
    if (!readIdsResult.ok) {
      return res.status(400).json({ success: false, message: readIdsResult.message });
    }

    const dismissedIdsResult = normalizeStringArray(req.body?.dismissedIds, "dismissedIds");
    if (!dismissedIdsResult.ok) {
      return res.status(400).json({ success: false, message: dismissedIdsResult.message });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "UPDATED_NOTIFICATION_STATE",
        ipAddress: req.ip,
        metadata: {
          readIds: readIdsResult.value,
          dismissedIds: dismissedIdsResult.value,
        },
      },
    });

    return res.json({
      success: true,
      message: "Notification state updated successfully.",
      data: {
        readIds: readIdsResult.value,
        dismissedIds: dismissedIdsResult.value,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// 1. ADMIN/NURSE: Broadcast a new Advisory
// ==========================================
const createAdvisory = async (req, res, next) => {
  try {
    const title = normalizeText(req.body?.title);
    const message = normalizeText(req.body?.message);
    const rawTargets = normalizeAudienceList(req.body?.targetDepts);
    const fallbackTarget = normalizeDept(req.body?.targetDept);
    const targets = rawTargets.length ? rawTargets : (fallbackTarget ? [fallbackTarget] : ["ALL"]);
    const targetDept = serializeAudienceTargets(targets);
    const severity = normalizeText(req.body?.severity).toUpperCase() || "INFO";
    const adminId = req.user.userId;

    if (!title) {
      return res.status(400).json({ success: false, message: "title is required." });
    }

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required." });
    }

    if (title.length > 150) {
      return res.status(400).json({ success: false, message: "title must be 150 characters or fewer." });
    }

    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: "message must be 2000 characters or fewer." });
    }

    if (targetDept.length > 64) {
      return res.status(400).json({ success: false, message: "targetDept must be 64 characters or fewer." });
    }

    if (!ALLOWED_SEVERITIES.has(severity)) {
      return res.status(400).json({ success: false, message: "severity must be INFO, WARNING, or CRITICAL." });
    }

    const advisory = await prisma.healthAdvisory.create({
      data: {
        title,
        message,
        targetDept,
        severity,
        createdBy: adminId
      }
    });

    res.status(201).json({
      success: true,
      message: "Health advisory broadcasted successfully.",
      data: advisory
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. STUDENT VIEW: Fetch Active Advisories
// ==========================================
const getAdvisories = async (req, res, next) => {
  try {
    const requestedDept = normalizeDept(req.query?.dept);
    const role = req.user?.role;
    let whereClause = {};

    if (role === "STUDENT") {
      const student = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          studentProfile: {
            select: {
              courseDept: true,
            },
          },
        },
      });

      const studentDept = normalizeDept(student?.studentProfile?.courseDept);

      if (!studentDept) {
        whereClause = buildTargetDeptWhere(["ALL", "STUDENT"]);
      } else {
        if (requestedDept && requestedDept !== "ALL" && requestedDept !== studentDept) {
          return res.status(403).json({
            success: false,
            message: "You can only view advisories for your department.",
          });
        }

        if (requestedDept === "ALL") {
          whereClause = buildTargetDeptWhere(["ALL", "STUDENT"]);
        } else {
          whereClause = buildTargetDeptWhere(["ALL", "STUDENT", studentDept]);
        }
      }
    } else if (requestedDept) {
      whereClause = requestedDept === "ALL"
        ? buildTargetDeptWhere(["ALL"])
        : buildTargetDeptWhere(["ALL", requestedDept]);
    } else if (role === "DOCTOR") {
      whereClause = buildTargetDeptWhere(["ALL", "DOCTOR"]);
    } else if (role === "DENTAL") {
      whereClause = buildTargetDeptWhere(["ALL", "DENTAL"]);
    } else if (role === "CLINIC_STAFF") {
      whereClause = buildTargetDeptWhere(["ALL", "NURSE", "CLINIC_STAFF"]);
    } else if (role === "ADMIN") {
      whereClause = buildTargetDeptWhere(["ALL", "ADMIN"]);
    }

    const advisories = await prisma.healthAdvisory.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const normalizedAdvisories = advisories.map((advisory) => ({
      ...advisory,
      targetDept: serializeAudienceTargets(parseAudienceTargets(advisory.targetDept)),
    }));

    res.json({
      success: true,
      message: "Advisories retrieved successfully.",
      data: normalizedAdvisories
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAdvisory,
  getAdvisories,
  getNotificationState,
  updateNotificationState,
};