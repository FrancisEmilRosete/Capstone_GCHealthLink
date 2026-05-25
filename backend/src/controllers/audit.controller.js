const { PrismaClient } = require("@prisma/client");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");

const prisma = new PrismaClient();

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { actionType, userId, search } = req.query;
    const userRole = req.user?.role?.toUpperCase();
    const clinicStaffType = req.user?.clinicStaffType?.toUpperCase();

    // Determine role filter
    let roleFilter = undefined;
    if (userRole === "ADMIN") {
      // Admin sees everything, no strict filter
    } else if (clinicStaffType === "NURSE") {
      roleFilter = "NURSE";
    } else if (clinicStaffType === "DOCTOR") {
      roleFilter = "DOCTOR";
    } else if (clinicStaffType === "DENTIST" || clinicStaffType === "DENTAL") {
      roleFilter = "DENTIST";
    } else {
      // Unrecognized role or a basic user - they probably shouldn't view full audit logs,
      // but if we allow it, limit to their own logs
      return res.status(403).json({ success: false, message: "Unauthorized to view system audit logs." });
    }

    const whereClause = {};

    if (roleFilter) {
      whereClause.userRole = roleFilter;
    }

    if (actionType) {
      whereClause.actionType = actionType;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search } },
        { action: { contains: search } }
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              studentProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
