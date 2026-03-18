const { PrismaClient, XrayResult, YearLevel } = require("@prisma/client");
const { encryptStringSafe } = require("../utils/encryption.util");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");

const prisma = new PrismaClient();

const YEAR_LEVEL_MAP = {
  "1st year": YearLevel.YR_1,
  "2nd year": YearLevel.YR_2,
  "3rd year": YearLevel.YR_3,
  "4th year": YearLevel.YR_4,
};

const YEAR_LEVEL_LABEL = {
  [YearLevel.YR_1]: "1st Year",
  [YearLevel.YR_2]: "2nd Year",
  [YearLevel.YR_3]: "3rd Year",
  [YearLevel.YR_4]: "4th Year",
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseYearLevel(value) {
  const normalized = normalizeText(value).toLowerCase();
  return YEAR_LEVEL_MAP[normalized] || null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateBmi(weight, heightCm) {
  const parsedWeight = parseNumber(weight);
  const parsedHeightCm = parseNumber(heightCm);

  if (!parsedWeight || !parsedHeightCm || parsedHeightCm <= 0) {
    return "";
  }

  const heightM = parsedHeightCm / 100;
  const bmi = parsedWeight / (heightM * heightM);
  return bmi.toFixed(1);
}

function mapXrayResult(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "normal") return XrayResult.NORMAL;
  if (normalized === "abnormal") return XrayResult.ABNORMAL;
  return null;
}

function toExamRow(exam) {
  return {
    id: exam.id,
    studentProfileId: exam.studentProfileId,
    studentNumber: exam.studentProfile.studentNumber,
    studentName: `${exam.studentProfile.lastName}, ${exam.studentProfile.firstName}`,
    courseDept: exam.studentProfile.courseDept,
    yearLevel: YEAR_LEVEL_LABEL[exam.yearLevel] || exam.yearLevel,
    examDate: exam.examDate,
    bmi: exam.bmi || "",
    bp: exam.bp || "",
    examinedBy: exam.examinedBy || "",
  };
}

const listPhysicalExams = async (req, res, next) => {
  try {
    const query = normalizeText(req.query.q);
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 300,
      maxLimit: 500,
    });

    let whereClause;
    if (query) {
      const matchingProfiles = await prisma.studentProfile.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { studentNumber: { contains: query, mode: "insensitive" } },
            { courseDept: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true },
        take: 5000,
      });

      const profileIds = matchingProfiles.map((profile) => profile.id);
      if (profileIds.length === 0) {
        return res.json({
          success: true,
          message: "Physical examinations retrieved successfully.",
          data: [],
          pagination: buildPaginationMeta({ page, limit, total: 0 }),
        });
      }

      whereClause = {
        studentProfileId: {
          in: profileIds,
        },
      };
    }

    const [exams, total] = await prisma.$transaction([
      prisma.physicalExamination.findMany({
        where: whereClause,
        orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          studentProfile: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              courseDept: true,
            },
          },
        },
      }),
      prisma.physicalExamination.count({ where: whereClause }),
    ]);

    const rows = exams.map(toExamRow);

    return res.json({
      success: true,
      message: "Physical examinations retrieved successfully.",
      data: rows,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (error) {
    return next(error);
  }
};

const createPhysicalExam = async (req, res, next) => {
  try {
    const studentProfileId = normalizeText(req.body?.studentProfileId);
    const yearLevel = parseYearLevel(req.body?.yearLevel);
    const examDate = parseDate(req.body?.dateOfExam || req.body?.examDate);

    if (!studentProfileId) {
      return res.status(400).json({ success: false, message: "studentProfileId is required." });
    }

    if (!yearLevel) {
      return res.status(400).json({
        success: false,
        message: "yearLevel is required and must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year.",
      });
    }

    if (!examDate) {
      return res.status(400).json({ success: false, message: "dateOfExam must be a valid date." });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { id: true, studentNumber: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const computedBmi = calculateBmi(req.body?.weight, req.body?.height);

    const exam = await prisma.physicalExamination.create({
      data: {
        studentProfileId,
        yearLevel,
        examDate,
        bp: normalizeText(req.body?.bp) || null,
        cr: normalizeText(req.body?.heartRate || req.body?.pulseRate) || null,
        rr: normalizeText(req.body?.respRate) || null,
        temp: normalizeText(req.body?.temperature) || null,
        weight: normalizeText(req.body?.weight) || null,
        height: normalizeText(req.body?.height) || null,
        bmi: normalizeText(req.body?.bmi) || computedBmi || null,
        visualAcuity: normalizeText(req.body?.visualAcuity) || null,
        skin: normalizeText(req.body?.skin) || null,
        heent: normalizeText(req.body?.heent) || null,
        chestLungs: normalizeText(req.body?.chestLungs) || null,
        heart: normalizeText(req.body?.heart) || null,
        abdomen: normalizeText(req.body?.abdomen) || null,
        extremities: normalizeText(req.body?.extremities) || null,
        others: normalizeText(req.body?.remarks) || null,
        examinedBy: normalizeText(req.body?.examinedBy) || null,
      },
      include: {
        studentProfile: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            courseDept: true,
          },
        },
      },
    });

    const hasLabData = [
      req.body?.hgb,
      req.body?.hct,
      req.body?.wbc,
      req.body?.cbcBldType,
      req.body?.urineGlucose,
      req.body?.urineProtein,
      req.body?.chestXray,
      req.body?.chestXrayFindings,
      req.body?.labOthers,
    ].some((value) => normalizeText(value));

    let labResult = null;
    if (hasLabData) {
      labResult = await prisma.labResult.create({
        data: {
          studentProfileId,
          date: examDate,
          hgb: normalizeText(req.body?.hgb) || null,
          hct: normalizeText(req.body?.hct) || null,
          wbc: normalizeText(req.body?.wbc) || null,
          bloodType: normalizeText(req.body?.cbcBldType) || null,
          glucoseSugar: normalizeText(req.body?.urineGlucose) || null,
          protein: normalizeText(req.body?.urineProtein) || null,
          xrayResult: mapXrayResult(req.body?.chestXray),
          xrayFindingsEnc: encryptStringSafe(normalizeText(req.body?.chestXrayFindings)) || null,
          othersEnc: encryptStringSafe(normalizeText(req.body?.labOthers)) || null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "RECORDED_PHYSICAL_EXAM",
        targetId: studentProfileId,
        ipAddress: req.ip,
        metadata: {
          examId: exam.id,
          studentNumber: studentProfile.studentNumber,
          hasLabData: !!labResult,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Physical examination recorded successfully.",
      data: {
        exam: toExamRow(exam),
        labResult,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listPhysicalExams,
  createPhysicalExam,
};
