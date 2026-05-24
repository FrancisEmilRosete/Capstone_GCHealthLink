const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeDepartment(value) {
  if (typeof value !== "string") return "UNSPECIFIED";
  const normalized = value.trim().toUpperCase();
  return normalized || "UNSPECIFIED";
}

function normalizeConcern(value) {
  if (typeof value !== "string") return "General Consultation";
  const normalized = value.trim();
  return normalized || "General Consultation";
}

// ==========================================
// 1. ADMIN/CLINIC: Get Busiest Peak Hours
// ==========================================
const getPeakHours = async (req, res, next) => {
  try {
    // Fetch all clinic visits
    const visits = await prisma.clinicVisit.findMany({
      select: { 
        visitTime: true // We only need the time for this calculation
      }
    });

    if (visits.length === 0) {
      return res.json({
        success: true,
        message: "No visit data available yet.",
        data: []
      });
    }

    // Tally up the occurrences of each visit time
    const timeTally = {};
    visits.forEach((visit) => {
      // Assuming visitTime is stored like "10:00 AM" or "14:00"
      const time = visit.visitTime;
      if (time) {
        timeTally[time] = (timeTally[time] || 0) + 1;
      }
    });

    // Convert the tally object into an array and sort it highest to lowest
    const sortedPeakHours = Object.keys(timeTally)
      .map((time) => ({
        time: time,
        studentVisits: timeTally[time]
      }))
      .sort((a, b) => b.studentVisits - a.studentVisits);

    res.json({
      success: true,
      message: "Clinic peak hours calculated successfully.",
      data: sortedPeakHours
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. ALL AUTHENTICATED USERS: Top concerns by department
// ==========================================
const getHealthConcernsByDepartment = async (req, res, next) => {
  try {
    const visits = await prisma.clinicVisit.findMany({
      select: {
        concernTag: true,
        studentProfile: {
          select: {
            courseDept: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5000,
    });

    const grouped = new Map();

    for (const visit of visits) {
      const department = normalizeDepartment(visit.studentProfile?.courseDept);
      const concern = normalizeConcern(visit.concernTag);

      if (!grouped.has(department)) {
        grouped.set(department, new Map());
      }

      const concernMap = grouped.get(department);
      concernMap.set(concern, (concernMap.get(concern) || 0) + 1);
    }

    const data = [...grouped.entries()]
      .map(([department, concernMap]) => ({
        department,
        concerns: [...concernMap.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      }))
      .sort((a, b) => {
        const aTotal = a.concerns.reduce((sum, item) => sum + item.count, 0);
        const bTotal = b.concerns.reduce((sum, item) => sum + item.count, 0);
        return bTotal - aTotal;
      });

    return res.json({
      success: true,
      message: "Top health concerns by department retrieved successfully.",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPeakHours, getHealthConcernsByDepartment };