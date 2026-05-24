const { PrismaClient } = require("@prisma/client");
const {
  normalizeConcernTag,
  isOutbreakConcernTag,
} = require("../utils/concernTag.util");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");
const prisma = new PrismaClient();

const ALERT_PRIORITY = { RED: 3, YELLOW: 2, GREEN: 1 };
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeDepartment(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "Unspecified";
}

function toDate(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toLocalDateKey(value) {
  const date = toDate(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveVisitDate(visit) {
  const primary = toDate(visit?.visitDate);
  if (primary) {
    return primary;
  }

  return toDate(visit?.createdAt);
}

function createMonthlySeries(visits) {
  const now = new Date();
  const buckets = [];

  for (let index = 11; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      month: monthDate.toLocaleDateString("en-US", { month: "short" }),
      count: 0,
    });
  }

  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const visit of visits) {
    const date = resolveVisitDate(visit);
    if (!date) continue;

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const hit = lookup.get(key);
    if (hit) {
      hit.count += 1;
    }
  }

  return buckets.map(({ month, count }) => ({ month, count }));
}

function createWeeklySeries(visits) {
  const now = new Date();
  const buckets = [];

  for (let index = 6; index >= 0; index -= 1) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
    const dayKey = toLocalDateKey(dayDate);
    if (!dayKey) continue;

    buckets.push({
      key: dayKey,
      day: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
    });
  }

  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const visit of visits) {
    const date = resolveVisitDate(visit);
    if (!date) continue;

    const key = toLocalDateKey(date);
    if (!key) continue;

    const hit = lookup.get(key);
    if (hit) {
      hit.count += 1;
    }
  }

  return buckets.map(({ day, count }) => ({ day, count }));
}

function createOutbreakWatch(visits) {
  const now = Date.now();
  const recentWindowStart = now - (48 * 60 * 60 * 1000);
  const baselineWindowStart = now - (14 * 24 * 60 * 60 * 1000);
  const counter = new Map();

  for (const visit of visits) {
    const date = resolveVisitDate(visit);
    if (!date) continue;

    const timestamp = date.getTime();
    if (timestamp < baselineWindowStart) continue;

    const concernTag = normalizeConcernTag(visit.concernTag);
    if (!isOutbreakConcernTag(concernTag)) continue;

    const dept = normalizeDepartment(visit.studentProfile?.courseDept);
    const key = `${dept}::${concernTag}`;
    const bucket = counter.get(key) || { dept, concernTag, recent: 0, baseline: 0 };

    if (timestamp >= recentWindowStart) {
      bucket.recent += 1;
    } else {
      bucket.baseline += 1;
    }

    counter.set(key, bucket);
  }

  const alerts = [];
  for (const bucket of counter.values()) {
    const baselinePer48h = bucket.baseline / 6;
    const spikeRatio = bucket.recent / Math.max(1, baselinePer48h || 0);

    let level = "GREEN";
    if (bucket.recent >= 4 || spikeRatio >= 3) {
      level = "RED";
    } else if (bucket.recent >= 2 || spikeRatio >= 1.8) {
      level = "YELLOW";
    }

    if (level === "GREEN") continue;

    alerts.push({
      level,
      cases: bucket.recent,
      message: `${bucket.concernTag} trend in ${bucket.dept} over the last 48 hours.`,
    });
  }

  alerts.sort((a, b) => {
    const levelDelta = ALERT_PRIORITY[b.level] - ALERT_PRIORITY[a.level];
    if (levelDelta !== 0) return levelDelta;
    return b.cases - a.cases;
  });

  return alerts.length > 0 ? alerts : "Green - No clusters detected";
}

function extractVisitHour(visit) {
  if (typeof visit.visitTime === "string" && visit.visitTime.trim()) {
    const match = visit.visitTime.match(/^(\d{1,2})/);
    if (match) {
      const hour = Number(match[1]);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
        return hour;
      }
    }
  }

  const date = resolveVisitDate(visit);
  if (!date) return null;
  return date.getHours();
}

function createResourcePrediction(visits) {
  if (visits.length === 0) {
    return {
      busiestHour: { hour: "N/A", count: 0 },
      busiestDay: { day: "N/A", count: 0 },
      recentTrend: { direction: "stable", percentChange: 0 },
      expectedVisitsNext7Days: 0,
      recommendedStaffing: "1 clinic staff on standby",
    };
  }

  const hourlyCounts = Array.from({ length: 24 }, () => 0);
  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  const now = Date.now();
  const recentStart = now - (14 * 24 * 60 * 60 * 1000);
  const previousStart = now - (28 * 24 * 60 * 60 * 1000);
  let recentCount = 0;
  let previousCount = 0;

  for (const visit of visits) {
    const hour = extractVisitHour(visit);
    if (hour !== null) {
      hourlyCounts[hour] += 1;
    }

    const date = resolveVisitDate(visit);
    if (!date) continue;

    weekdayCounts[date.getDay()] += 1;

    const timestamp = date.getTime();
    if (timestamp >= recentStart) {
      recentCount += 1;
    } else if (timestamp >= previousStart && timestamp < recentStart) {
      previousCount += 1;
    }
  }

  const busiestHourIndex = hourlyCounts.reduce((best, value, index, list) => {
    return value > list[best] ? index : best;
  }, 0);

  const busiestDayIndex = weekdayCounts.reduce((best, value, index, list) => {
    return value > list[best] ? index : best;
  }, 0);

  const percentChange = previousCount === 0
    ? (recentCount > 0 ? 100 : 0)
    : Math.round(((recentCount - previousCount) / previousCount) * 100);

  let direction = "stable";
  if (percentChange > 12) direction = "up";
  if (percentChange < -12) direction = "down";

  const averageDailyRecent = recentCount / 14;
  const growthFactor = previousCount > 0
    ? Math.min(1.6, Math.max(0.6, recentCount / previousCount))
    : (recentCount > 0 ? 1.1 : 1);

  const expectedVisitsNext7Days = Math.max(0, Math.round(averageDailyRecent * 7 * growthFactor));

  let recommendedStaffing = "1 clinic staff on standby";
  if (expectedVisitsNext7Days >= 70) {
    recommendedStaffing = "3 nurses + 1 physician on rotation";
  } else if (expectedVisitsNext7Days >= 35) {
    recommendedStaffing = "2 nurses + 1 clinician on duty";
  } else if (expectedVisitsNext7Days >= 14) {
    recommendedStaffing = "1 nurse + 1 support staff";
  }

  return {
    busiestHour: {
      hour: `${String(busiestHourIndex).padStart(2, "0")}:00`,
      count: hourlyCounts[busiestHourIndex],
    },
    busiestDay: {
      day: WEEKDAY_LABELS[busiestDayIndex],
      count: weekdayCounts[busiestDayIndex],
    },
    recentTrend: {
      direction,
      percentChange,
    },
    expectedVisitsNext7Days,
    recommendedStaffing,
  };
}

function buildTopConcernsFromGroups(concernGroups = []) {
  return concernGroups
    .map((group) => ({
      tag: normalizeConcernTag(group.concernTag),
      count: group?._count?._all || 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

function buildTopConcernsFromVisits(visits = []) {
  const concernMap = new Map();

  for (const visit of visits) {
    const tag = normalizeConcernTag(visit.concernTag);
    concernMap.set(tag, (concernMap.get(tag) || 0) + 1);
  }

  return [...concernMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

function buildHealthAnalyticsPayload(visits, concernGroups = null) {
  const totalVisits = visits.length;
  const departmentHeatmap = {};

  for (const visit of visits) {
    const dept = normalizeDepartment(visit.studentProfile?.courseDept);
    departmentHeatmap[dept] = (departmentHeatmap[dept] || 0) + 1;
  }

  const topConcerns = Array.isArray(concernGroups)
    ? buildTopConcernsFromGroups(concernGroups)
    : buildTopConcernsFromVisits(visits);

  const inventorySummary = {
    expired: 0,
    expiringSoon: 0,
    nearReorder: 0,
    outOfStock: 0,
  };

  return {
    totalVisits,
    topConcerns,
    departmentHeatmap,
    outbreakWatch: createOutbreakWatch(visits),
    monthlyVisits: createMonthlySeries(visits),
    weeklyVisits: createWeeklySeries(visits),
    resourcePrediction: createResourcePrediction(visits),
    inventorySummary,
  };
}

function toDisplayNameFromEmail(email) {
  const localPart = typeof email === "string" ? email.split("@")[0] : "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Admin User";

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 200,
      maxLimit: 2000,
    });
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role.trim().toUpperCase() : "";

    const where = {};
    if (role && role !== "ALL") {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { studentProfile: { firstName: { contains: search, mode: "insensitive" } } },
        { studentProfile: { lastName: { contains: search, mode: "insensitive" } } },
        { studentProfile: { studentNumber: { contains: search, mode: "insensitive" } } },
        { studentProfile: { courseDept: { contains: search, mode: "insensitive" } } },
        { studentProfile: { course: { contains: search, mode: "insensitive" } } },
        { studentProfile: { yearLevel: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          clinicStaffType: true,
          createdAt: true,
          studentProfile: {
            select: {
              firstName: true,
              lastName: true,
              mi: true,
              studentNumber: true,
              courseDept: true,
              course: true,
              yearLevel: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: buildPaginationMeta({ page, limit, total }),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip   = (page - 1) * limit;

    const { search, role, action, dateFrom, dateTo } = req.query;

    // Build where clause
    const where = {};

    if (action && typeof action === 'string' && action.trim()) {
      where.action = { contains: action.trim(), mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom);
      if (dateTo)   where.timestamp.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // User-level filters (search by email or role)
    const userFilter = {};
    if (search && typeof search === 'string' && search.trim()) {
      userFilter.email = { contains: search.trim(), mode: 'insensitive' };
    }
    if (role && typeof role === 'string' && role.trim() && role !== 'ALL') {
      userFilter.role = role.trim().toUpperCase();
    }
    if (Object.keys(userFilter).length > 0) {
      where.user = userFilter;
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              studentProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStudentRecords = async (req, res, next) => {
  try {
    const { search, dept } = req.query;
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '30', 10)));
    const skip  = (page - 1) * limit;

    const where = {};
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { firstName:     { contains: q, mode: 'insensitive' } },
        { lastName:      { contains: q, mode: 'insensitive' } },
        { studentNumber: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (dept && typeof dept === 'string' && dept.trim() && dept !== 'ALL') {
      where.courseDept = { contains: dept.trim(), mode: 'insensitive' };
    }

    const [students, total] = await prisma.$transaction([
      prisma.studentProfile.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          mi: true,
          courseDept: true,
          age: true,
          sex: true,
          _count: {
            select: {
              clinicVisits: true,
              physicalExaminations: true,
            },
          },
        },
      }),
      prisma.studentProfile.count({ where }),
    ]);

    res.json({
      success: true,
      message: 'Student records retrieved',
      data: {
        students,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStudentHealthDetail = async (req, res, next) => {
  try {
    const { studentProfileId } = req.params;

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        medicalHistory: true,
        physicalExaminations: { orderBy: { examDate: 'desc' } },
        labResults: { orderBy: { date: 'desc' } },
        clinicVisits: {
          orderBy: { visitDate: 'desc' },
          take: 50,
          include: {
            handledBy: { select: { email: true, role: true, clinicStaffType: true } },
          },
        },
        medicalDocuments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.json({ success: true, message: 'Student health detail retrieved', data: student });
  } catch (error) {
    next(error);
  }
};

const getAdminSessionProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found.",
      });
    }

    res.json({
      success: true,
      message: "Admin session profile retrieved successfully",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: toDisplayNameFromEmail(user.email),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getHealthAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const [allVisits, concernGroups, dispensed] = await prisma.$transaction([
      prisma.clinicVisit.findMany({
        select: {
          id: true,
          concernTag: true,
          createdAt: true,
          visitDate: true,
          visitTime: true,
          studentProfile: {
            select: {
              courseDept: true,
            },
          },
        },
      }),
      prisma.clinicVisit.groupBy({
        by: ["concernTag"],
        where: {
          concernTag: {
            not: "",
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.visitMedicine.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, status: "DISPENSED" },
        include: { inventory: { select: { itemName: true, currentStock: true, unit: true } } }
      })
    ]);

    const inventoryItems = await prisma.inventory.findMany({
      select: {
        currentStock: true,
        reorderThreshold: true,
        expirationDate: true,
      },
    });

    const forecastMap = new Map();
    for (const d of dispensed) {
      if (!forecastMap.has(d.inventoryId)) {
        forecastMap.set(d.inventoryId, { name: d.inventory.itemName, currentStock: d.inventory.currentStock, unit: d.inventory.unit, totalUsed: 0 });
      }
      forecastMap.get(d.inventoryId).totalUsed += d.quantity;
    }

    const inventoryForecast = Array.from(forecastMap.values()).map(item => {
      const dailyUsage = item.totalUsed / 30;
      let daysUntilDepletion = dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : 999;
      return {
        itemName: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        dailyUsage: parseFloat(dailyUsage.toFixed(2)),
        daysUntilDepletion
      };
    }).sort((a, b) => a.daysUntilDepletion - b.daysUntilDepletion);

    const inventorySummary = inventoryItems.reduce((summary, item) => {
      const expirationDate = item.expirationDate ? new Date(item.expirationDate) : null;
      const isExpired = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate < thirtyDaysAgo);
      const isExpiringSoon = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate >= thirtyDaysAgo && expirationDate <= new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)));

      if (isExpired) summary.expired += 1;
      if (isExpiringSoon) summary.expiringSoon += 1;
      if (item.currentStock <= item.reorderThreshold) summary.nearReorder += 1;
      if (item.currentStock === 0) summary.outOfStock += 1;

      return summary;
    }, {
      expired: 0,
      expiringSoon: 0,
      nearReorder: 0,
      outOfStock: 0,
    });

    const analytics = buildHealthAnalyticsPayload(allVisits, concernGroups);
    analytics.inventoryForecast = inventoryForecast;
    analytics.inventorySummary = inventorySummary;

    res.json({
      success: true,
      message: "School-wide health analytics and Outbreak Watch retrieved",
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealthAnalytics,
  getAdminSessionProfile,
  getUsers,
  getAuditLogs,
  getStudentRecords,
  getStudentHealthDetail,
  buildHealthAnalyticsPayload,
};