const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

module.exports = { getPeakHours };