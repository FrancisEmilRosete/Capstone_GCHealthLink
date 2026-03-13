const { PrismaClient } = require("@prisma/client");
const PDFDocument = require("pdfkit");
const { buildHealthAnalyticsPayload } = require("./admin.controller");

const prisma = new PrismaClient();

function outbreakToText(outbreakWatch) {
  if (typeof outbreakWatch === "string") {
    return outbreakWatch;
  }

  if (!Array.isArray(outbreakWatch) || outbreakWatch.length === 0) {
    return "Green - No clusters detected";
  }

  return outbreakWatch
    .map((alert) => `${alert.level}: ${alert.message} (${alert.cases})`)
    .join(" | ");
}

function writeSectionTitle(doc, title) {
  doc.moveDown(0.8);
  doc.fontSize(12).fillColor("#0F766E").text(title);
  doc.moveDown(0.2);
  doc.fillColor("#111827");
}

const exportMonthlyReportPdf = async (req, res, next) => {
  try {
    const [visits, concernGroups] = await prisma.$transaction([
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
    ]);

    const analytics = buildHealthAnalyticsPayload(visits, concernGroups);
    const generatedAt = new Date();
    const fileName = `gc-healthlink-report-${generatedAt.toISOString().slice(0, 10)}.pdf`;

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "EXPORTED_ADMIN_REPORT",
        targetId: null,
        ipAddress: req.ip,
        metadata: {
          reportType: "MONTHLY_ANALYTICS",
          generatedAt: generatedAt.toISOString(),
          totalVisits: analytics.totalVisits,
        },
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

    const doc = new PDFDocument({ margin: 42, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).fillColor("#0F172A").text("GC HealthLink Analytics Report");
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#475569").text(`Generated: ${generatedAt.toLocaleString("en-US")}`);

    writeSectionTitle(doc, "Overview");
    doc.fontSize(10).text(`Total Visits: ${analytics.totalVisits}`);
    doc.fontSize(10).text(`Outbreak Watch: ${outbreakToText(analytics.outbreakWatch)}`);

    writeSectionTitle(doc, "Resource Prediction");
    doc.fontSize(10).text(`Busiest Hour: ${analytics.resourcePrediction.busiestHour.hour} (${analytics.resourcePrediction.busiestHour.count} visits)`);
    doc.fontSize(10).text(`Busiest Day: ${analytics.resourcePrediction.busiestDay.day} (${analytics.resourcePrediction.busiestDay.count} visits)`);
    doc.fontSize(10).text(`Recent Trend: ${analytics.resourcePrediction.recentTrend.direction} (${analytics.resourcePrediction.recentTrend.percentChange}%)`);
    doc.fontSize(10).text(`Expected Visits (next 7 days): ${analytics.resourcePrediction.expectedVisitsNext7Days}`);
    doc.fontSize(10).text(`Recommended Staffing: ${analytics.resourcePrediction.recommendedStaffing}`);

    writeSectionTitle(doc, "Monthly Visits (Last 12 Months)");
    if (analytics.monthlyVisits.length === 0) {
      doc.fontSize(10).text("No monthly visit data available.");
    } else {
      analytics.monthlyVisits.forEach((item) => {
        doc.fontSize(10).text(`${item.month}: ${item.count}`);
      });
    }

    writeSectionTitle(doc, "Top Health Concerns");
    if (analytics.topConcerns.length === 0) {
      doc.fontSize(10).text("No top concern data available.");
    } else {
      analytics.topConcerns.forEach((item) => {
        doc.fontSize(10).text(`${item.tag}: ${item.count}`);
      });
    }

    writeSectionTitle(doc, "Department Heatmap");
    const departmentRows = Object.entries(analytics.departmentHeatmap).sort((a, b) => b[1] - a[1]);
    if (departmentRows.length === 0) {
      doc.fontSize(10).text("No department data available.");
    } else {
      departmentRows.forEach(([department, count]) => {
        doc.fontSize(10).text(`${department}: ${count}`);
      });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { exportMonthlyReportPdf };
