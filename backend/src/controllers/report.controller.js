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

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATED REPORTS MODULE — generateReport
// GET /api/v1/reports/generate?type=&range=&date=
// ─────────────────────────────────────────────────────────────────────────────


const { prisma: sharedPrisma } = require('../lib/prisma');
const { getDateBoundaries } = require('../utils/reportDateRange');
const { decryptString }     = require('../utils/encryption.util');
const { generateInsights }  = require('../utils/reportInsights.util');

const VALID_REPORT_TYPES = new Set([
  'medical_consultation',
  'physical_examination',
  'dental_consultation',
  'dental_examination',
]);

const VALID_RANGES = new Set([
  'daily', 'weekly', 'monthly', 'quarterly', 'semi-annually', 'yearly',
]);

// ── RBAC type guard ──────────────────────────────────────────────────────────
/**
 * Returns { allowed: true } or { allowed: false, message }
 * based on the staff sub-type and the requested report type.
 *
 * DOCTOR  → block dental types
 * DENTIST → block medical types
 * NURSE   → allow all
 */
function checkTypeAccess(staffType, reportType) {
  const st = (staffType || '').toUpperCase();
  if (st === 'DOCTOR') {
    if (reportType === 'dental_consultation' || reportType === 'dental_examination') {
      return { allowed: false, message: 'Doctors are not authorized to access dental reports.' };
    }
  }
  if (st === 'DENTIST') {
    if (reportType === 'medical_consultation' || reportType === 'physical_examination') {
      return { allowed: false, message: 'Dentists are not authorized to access medical reports.' };
    }
  }
  return { allowed: true };
}

// ── Shared sex normalizer ────────────────────────────────────────────────────
function normSex(value) {
  const s = (value || '').trim().toLowerCase();
  if (s === 'male'   || s === 'm') return 'male';
  if (s === 'female' || s === 'f') return 'female';
  return 'unknown';
}

// ── A. Medical Consultation ──────────────────────────────────────────────────
/**
 * Columns: COMPLAINTS | SEX (M) | SEX (F) | TOTAL #
 * Rows:    one per distinct concernTag in the date window
 *          (only visits handled by NURSE or DOCTOR staff)
 */
async function buildMedicalConsultationReport(periods) {
  const start = periods[0].start;
  const end   = periods[periods.length - 1].end;

  const visits = await sharedPrisma.clinicVisit.findMany({
    where: {
      visitDate: { gte: start, lte: end },
      handledBy: { clinicStaffType: { in: ['NURSE', 'DOCTOR'] } },
    },
    select: {
      concernTag:     true,
      visitDate:      true,
      studentProfile: { select: { sex: true } },
    },
  });

  // Table 1: Temporal Distribution
  const table1 = periods.map((p) => {
    const inPeriod = visits.filter((v) => v.visitDate >= p.start && v.visitDate <= p.end);
    const male   = inPeriod.filter((v) => normSex(v.studentProfile?.sex) === 'male').length;
    const female = inPeriod.length - male;
    return {
      period: p.label,
      male,
      female,
      total: inPeriod.length,
    };
  });

  // Table 2: Complaints Summary (all visits in window)
  /** @type {Record<string, {male:number, female:number}>} */
  const tally = {};
  for (const v of visits) {
    const tag = v.concernTag || 'General Consultation';
    if (!tally[tag]) tally[tag] = { male: 0, female: 0 };
    const s = normSex(v.studentProfile?.sex);
    if (s === 'male')   tally[tag].male++;
    else                tally[tag].female++;
  }
  const table2 = Object.entries(tally)
    .map(([complaint, c]) => ({
      complaint,
      male:   c.male,
      female: c.female,
      total:  c.male + c.female,
    }))
    .sort((a, b) => b.total - a.total);

  return { table1, table2 };
}

// ── B. Physical Examination ──────────────────────────────────────────────────
/**
 * Columns: MONTH/PERIOD | SEX (MALE) | SEX (FEMALE) | TOTAL CERTIFIED
 * Rows:    one per period (period = month/quarter/half/year)
 */
async function buildPhysicalExaminationReport(periods) {
  const start = periods[0].start;
  const end   = periods[periods.length - 1].end;

  const exams = await sharedPrisma.physicalExamination.findMany({
    where: { examDate: { gte: start, lte: end } },
    select: {
      examDate:       true,
      studentProfile: { select: { sex: true } },
      others:         true,
    },
  });

  // Table 1: Temporal Distribution
  const table1 = periods.map((p) => {
    const inPeriod = exams.filter((e) => e.examDate >= p.start && e.examDate <= p.end);
    const male   = inPeriod.filter((e) => normSex(e.studentProfile?.sex) === 'male').length;
    const female = inPeriod.length - male;
    return {
      period: p.label,
      male,
      female,
      total: inPeriod.length,
    };
  });

  // Table 2: Findings/Reasons Summary (from 'others' field)
  /** @type {Record<string, {male:number, female:number}>} */
  const tally = {};
  for (const e of exams) {
    const reason = (e.others || 'General Clearance').trim();
    if (!tally[reason]) tally[reason] = { male: 0, female: 0 };
    const s = normSex(e.studentProfile?.sex);
    if (s === 'male')   tally[reason].male++;
    else                tally[reason].female++;
  }
  const table2 = Object.entries(tally)
    .map(([reason, c]) => ({
      reason,
      male:   c.male,
      female: c.female,
      total:  c.male + c.female,
    }))
    .sort((a, b) => b.total - a.total);

  return { table1, table2 };
}

// ── C. Dental Consultation ───────────────────────────────────────────────────
/**
 * Layout: two tables (Employees, Students).
 * Columns per table: MONTH/PERIOD | SERVICE | SEX (M) | SEX (F) | TOTAL
 *
 * Since the system only models student patients (no Employee entity),
 * the Employees table rows are returned with zero counts.
 * Service type is fixed as 'Dental Consultation/Exam' since ClinicVisit
 * does not yet store a dental-specific procedure field.
 */
async function buildDentalConsultationReport(periods) {
  const start = periods[0].start;
  const end   = periods[periods.length - 1].end;

  const visits = await sharedPrisma.clinicVisit.findMany({
    where: {
      visitDate: { gte: start, lte: end },
      handledBy: { clinicStaffType: 'DENTIST' },
    },
    select: {
      visitDate:      true,
      chiefComplaintEnc: true,
      studentProfile: { select: { sex: true } },
    },
  });

  // Table 1: Temporal Distribution (Students only, since no Employee model)
  const table1 = periods.map((p) => {
    const inPeriod = visits.filter((v) => v.visitDate >= p.start && v.visitDate <= p.end);
    const male   = inPeriod.filter((v) => normSex(v.studentProfile?.sex) === 'male').length;
    const female = inPeriod.length - male;
    return {
      period: p.label,
      male,
      female,
      total: inPeriod.length,
    };
  });

  // Table 2: Main reasons for visit (from decrypted chiefComplaintEnc)
  /** @type {Record<string, {male:number, female:number}>} */
  const tally = {};
  for (const v of visits) {
    const plaintext = safeDecrypt(v.chiefComplaintEnc);
    const reason = plaintext || 'General Dental Consultation';
    if (!tally[reason]) tally[reason] = { male: 0, female: 0 };
    const s = normSex(v.studentProfile?.sex);
    if (s === 'male')   tally[reason].male++;
    else                tally[reason].female++;
  }
  const table2 = Object.entries(tally)
    .map(([reason, c]) => ({
      reason,
      male:   c.male,
      female: c.female,
      total:  c.male + c.female,
    }))
    .sort((a, b) => b.total - a.total);

  return { table1, table2 };
}

// ── D. Dental Examination ────────────────────────────────────────────────────
/**
 * Columns: MONTH/PERIOD | DIAGNOSED DENTAL PROBLEM | SEX (M) | SEX (F) | TOTAL
 * Rows:    one per (period × dental-condition bucket)
 *
 * chiefComplaintEnc is decrypted per record and matched against keyword sets
 * to classify into dental diagnosis buckets.
 */
const DENTAL_CONDITION_RULES = [
  { label: 'Gingivitis',                keywords: ['gingivitis', 'gum disease', 'gum inflammation', 'gingival'] },
  { label: 'Caries',                    keywords: ['caries', 'cavity', 'tooth decay', 'dental caries', 'decayed'] },
  { label: 'Periodontitis / Pulpitis',  keywords: ['periodontitis', 'pulpitis', 'pulp infection', 'periodontal'] },
  { label: 'Periapical Abscess',        keywords: ['abscess', 'periapical', 'dental abscess', 'apical'] },
  { label: 'Toothache / Pain',          keywords: ['toothache', 'tooth pain', 'molar pain', 'tooth ache', 'dental pain'] },
  { label: 'Prophylaxis / Cleaning',    keywords: ['prophylaxis', 'cleaning', 'scaling', 'polishing', 'oral hygiene'] },
  { label: 'Extraction',                keywords: ['extraction', 'tooth extraction', 'cabut', 'remove tooth'] },
];

function classifyDentalCondition(plaintext) {
  const lower = (plaintext || '').toLowerCase();
  for (const { label, keywords } of DENTAL_CONDITION_RULES) {
    if (keywords.some((k) => lower.includes(k))) return label;
  }
  return 'Other Dental Concern';
}

function safeDecrypt(ciphertext) {
  if (!ciphertext) return '';
  try { return decryptString(ciphertext) || ''; }
  catch { return ''; }
}

async function buildDentalExaminationReport(periods) {
  const start = periods[0].start;
  const end   = periods[periods.length - 1].end;

  const visits = await sharedPrisma.clinicVisit.findMany({
    where: {
      visitDate: { gte: start, lte: end },
      handledBy: { clinicStaffType: 'DENTIST' },
    },
    select: {
      visitDate:        true,
      chiefComplaintEnc: true,
      studentProfile:   { select: { sex: true } },
    },
  });

  // Table 1: Temporal Distribution
  const table1 = periods.map((p) => {
    const inPeriod = visits.filter((v) => v.visitDate >= p.start && v.visitDate <= p.end);
    const male   = inPeriod.filter((v) => normSex(v.studentProfile?.sex) === 'male').length;
    const female = inPeriod.length - male;
    return {
      period: p.label,
      male,
      female,
      total: inPeriod.length,
    };
  });

  // Table 2: Diagnosed dental problems (per period, merged for summary)
  /** @type {Record<string, {male:number, female:number}>} */
  const tally = {};
  for (const v of visits) {
    const plaintext = safeDecrypt(v.chiefComplaintEnc);
    const condition = classifyDentalCondition(plaintext);
    if (!tally[condition]) tally[condition] = { male: 0, female: 0 };
    const s = normSex(v.studentProfile?.sex);
    if (s === 'male')   tally[condition].male++;
    else                tally[condition].female++;
  }
  const table2 = Object.entries(tally)
    .map(([condition, c]) => ({
      condition,
      male:   c.male,
      female: c.female,
      total:  c.male + c.female,
    }))
    .sort((a, b) => b.total - a.total);

  return { table1, table2 };
}

// ── Main handler ─────────────────────────────────────────────────────────────
const generateReport = async (req, res, next) => {
  try {
    const { type, range, date } = req.query;
    const staffType = req.user?.clinicStaffType;

    // ─ Input validation ─────────────────────────────────────
    if (!type || !VALID_REPORT_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid "type". Must be one of: ${[...VALID_REPORT_TYPES].join(', ')}`,
      });
    }
    if (!range || !VALID_RANGES.has(range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid "range". Must be one of: ${[...VALID_RANGES].join(', ')}`,
      });
    }

    // ─ RBAC type guard ──────────────────────────────────────
    const access = checkTypeAccess(staffType, type);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    // ─ Compute periods ──────────────────────────────────────
    const periods = getDateBoundaries(range, date);


    // ─ Delegate to aggregation builder ──────────────────────
    let tables;
    switch (type) {
      case 'medical_consultation':
        tables = await buildMedicalConsultationReport(periods);
        break;
      case 'physical_examination':
        tables = await buildPhysicalExaminationReport(periods);
        break;
      case 'dental_consultation':
        tables = await buildDentalConsultationReport(periods);
        break;
      case 'dental_examination':
        tables = await buildDentalExaminationReport(periods);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unhandled report type.' });
    }

    // ─ Automated Insights ──────────────────────────────────
    const insights = generateInsights({
      table1: tables.table1,
      table2: tables.table2,
      meta: {
        type,
        range,
        date: date || new Date().toISOString().slice(0, 10),
        periods: periods.map((p) => p.label),
      },
    });

    // ─ Audit log ────────────────────────────────────────────
    await sharedPrisma.auditLog.create({
      data: {
        userId:   req.user.userId,
        action:   'GENERATED_REPORT',
        targetId: null,
        ipAddress: req.ip,
        metadata: { reportType: type, range, date: date || null },
      },
    });

    return res.json({
      success: true,
      meta: {
        type,
        range,
        date:    date || new Date().toISOString().slice(0, 10),
        periods: periods.map((p) => p.label),
      },
      data: {
        table1: tables.table1,
        table2: tables.table2,
        insights,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { exportMonthlyReportPdf, generateReport };
