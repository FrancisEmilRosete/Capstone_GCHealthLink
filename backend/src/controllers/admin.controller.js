const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getHealthAnalytics = async (req, res, next) => {
  try {
    // 1. Basic Stats
    const totalVisits = await prisma.clinicVisit.count();

    // 2. Top Concerns (All time)
    const topComplaints = await prisma.clinicVisit.groupBy({
      by: ['chiefComplaintEnc'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // 3. Department Heatmap
    const deptStats = await prisma.studentProfile.findMany({
      select: {
        courseDept: true,
        _count: { select: { clinicVisits: true } }
      }
    });

    const heatmap = deptStats.reduce((acc, curr) => {
      acc[curr.courseDept] = (acc[curr.courseDept] || 0) + curr._count.clinicVisits;
      return acc;
    }, {});

    // 4. 🔥 SMART OUTBREAK WATCH (Last 48 Hours)
    // We look for patterns that might indicate a spreading illness
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const recentVisits = await prisma.clinicVisit.findMany({
      where: {
        createdAt: { gte: twoDaysAgo }
      },
      include: {
        studentProfile: { select: { courseDept: true } }
      }
    });

    // Logic: If > 1 student from the same dept has the same keyword in 48hrs, FLAG IT
    const outbreakAlerts = [];
    const patternMap = {};

    recentVisits.forEach(visit => {
      const dept = visit.studentProfile.courseDept;
      const text = visit.chiefComplaintEnc.toLowerCase();
      
      // Look for keywords: fever, flu, cough, sore throat
      const keywords = ['fever', 'headache', 'flu', 'cough', 'sore throat'];
      const foundKeyword = keywords.find(k => text.includes(k));

      if (foundKeyword) {
        const key = `${dept}-${foundKeyword}`;
        patternMap[key] = (patternMap[key] || 0) + 1;

        // THRESHOLD: If 2 or more cases found in same dept in 48hrs
        if (patternMap[key] >= 2) {
          outbreakAlerts.push({
            level: "YELLOW",
            message: `Potential ${foundKeyword} cluster detected in ${dept} department.`,
            cases: patternMap[key]
          });
        }
      }
    });

    res.json({
      success: true,
      message: "School-wide health analytics and Outbreak Watch retrieved",
      data: {
        totalVisits,
        topConcerns: topComplaints.map(c => ({
          issue: c.chiefComplaintEnc,
          count: c._count.id
        })),
        departmentHeatmap: heatmap,
        outbreakWatch: outbreakAlerts.length > 0 ? outbreakAlerts : "Green - No clusters detected"
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHealthAnalytics };