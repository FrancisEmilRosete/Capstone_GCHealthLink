const { PrismaClient, XrayResult, YearLevel } = require("@prisma/client");
const { encryptStringSafe } = require("../utils/encryption.util");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");

const prisma = new PrismaClient();

const YEAR_LEVEL_MAP = {
  "yr. 1": YearLevel.YR_1,
  "yr 1": YearLevel.YR_1,
  "yr.1": YearLevel.YR_1,
  "yr1": YearLevel.YR_1,
  "1": YearLevel.YR_1,
  "1st year": YearLevel.YR_1,
  "yr. 2": YearLevel.YR_2,
  "yr 2": YearLevel.YR_2,
  "yr.2": YearLevel.YR_2,
  "yr2": YearLevel.YR_2,
  "2": YearLevel.YR_2,
  "2nd year": YearLevel.YR_2,
  "yr. 3": YearLevel.YR_3,
  "yr 3": YearLevel.YR_3,
  "yr.3": YearLevel.YR_3,
  "yr3": YearLevel.YR_3,
  "3": YearLevel.YR_3,
  "3rd year": YearLevel.YR_3,
  "yr. 4": YearLevel.YR_4,
  "yr 4": YearLevel.YR_4,
  "yr.4": YearLevel.YR_4,
  "yr4": YearLevel.YR_4,
  "4": YearLevel.YR_4,
  "4th year": YearLevel.YR_4,
};

const YEAR_LEVEL_LABEL = {
  [YearLevel.YR_1]: "Yr. 1",
  [YearLevel.YR_2]: "Yr. 2",
  [YearLevel.YR_3]: "Yr. 3",
  [YearLevel.YR_4]: "Yr. 4",
};

const MEDICAL_HISTORY_BOOLEAN_FIELDS = [
  { inputKeys: ["asthma"], dbField: "asthmaEnc" },
  { inputKeys: ["chickenPox", "chickenpox"], dbField: "chickenPoxEnc" },
  { inputKeys: ["diabetes"], dbField: "diabetesEnc" },
  { inputKeys: ["dysmenorrhea"], dbField: "dysmenorrheaEnc" },
  { inputKeys: ["epilepsySeizure", "epilepsy"], dbField: "epilepsySeizureEnc" },
  { inputKeys: ["heartDisorder"], dbField: "heartDisorderEnc" },
  { inputKeys: ["hepatitis"], dbField: "hepatitisEnc" },
  { inputKeys: ["hypertension"], dbField: "hypertensionEnc" },
  { inputKeys: ["measles"], dbField: "measlesEnc" },
  { inputKeys: ["mumps"], dbField: "mumpsEnc" },
  { inputKeys: ["anxietyDisorder"], dbField: "anxietyDisorderEnc" },
  {
    inputKeys: ["panicAttackHyperventilation", "panicAttack"],
    dbField: "panicAttackHyperventilationEnc",
  },
  { inputKeys: ["pneumonia"], dbField: "pneumoniaEnc" },
  { inputKeys: ["ptbPrimaryComplex", "ptb"], dbField: "ptbPrimaryComplexEnc" },
  { inputKeys: ["typhoidFever"], dbField: "typhoidFeverEnc" },
  { inputKeys: ["covid19", "covid"], dbField: "covid19Enc" },
  { inputKeys: ["urinaryTractInfection", "uti"], dbField: "urinaryTractInfectionEnc" },
];

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

function hasOwn(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function resolveFieldValue(body, keys) {
  for (const key of keys) {
    if (hasOwn(body, key)) {
      return body[key];
    }
  }

  return undefined;
}

function parseBooleanInput(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["true", "yes", "y", "1", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function encryptYesNo(value) {
  const parsed = parseBooleanInput(value);
  if (parsed === null) {
    return null;
  }

  return encryptStringSafe(parsed ? "yes" : "no");
}

function buildMedicalHistoryPayload(body) {
  const payload = {};
  let hasAnyField = false;

  const allergyValue = resolveFieldValue(body, ["allergy"]);
  if (allergyValue !== undefined) {
    hasAnyField = true;
    const normalizedAllergy = normalizeText(allergyValue);
    payload.allergyEnc = normalizedAllergy ? encryptStringSafe(normalizedAllergy) : null;
  }

  for (const fieldMap of MEDICAL_HISTORY_BOOLEAN_FIELDS) {
    const rawValue = resolveFieldValue(body, fieldMap.inputKeys);
    if (rawValue === undefined) {
      continue;
    }

    hasAnyField = true;
    payload[fieldMap.dbField] = encryptYesNo(rawValue);
  }

  const pastOperationValue = resolveFieldValue(body, ["hasPastOperation"]);
  if (pastOperationValue !== undefined) {
    hasAnyField = true;
    payload.hasPastOperationEnc = encryptYesNo(pastOperationValue);
  }

  const operationDetails = resolveFieldValue(body, ["operationNatureAndDate"]);
  if (operationDetails !== undefined) {
    hasAnyField = true;
    const normalizedDetails = normalizeText(operationDetails);
    payload.operationNatureAndDateEnc = normalizedDetails ? encryptStringSafe(normalizedDetails) : null;
  }

  return hasAnyField ? payload : null;
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

function collectMissingRequiredFields(body) {
  const requiredTextFields = [
    { key: "allergy", label: "allergy" },
    { key: "bp", label: "bp" },
    { key: "cr", label: "cr" },
    { key: "rr", label: "rr" },
    { key: "temp", label: "temp" },
    { key: "weight", label: "weight" },
    { key: "height", label: "height" },
    { key: "visualAcuity", label: "visualAcuity" },
    { key: "skin", label: "skin" },
    { key: "heent", label: "heent" },
    { key: "chestLungs", label: "chestLungs" },
    { key: "heart", label: "heart" },
    { key: "abdomen", label: "abdomen" },
    { key: "extremities", label: "extremities" },
    { key: "others", label: "others" },
    { key: "examinedBy", label: "examinedBy" },
    { key: "hgb", label: "hgb" },
    { key: "hct", label: "hct" },
    { key: "wbc", label: "wbc" },
    { key: "pltCt", label: "pltCt" },
    { key: "bloodType", label: "bloodType" },
    { key: "glucoseSugar", label: "glucoseSugar" },
    { key: "protein", label: "protein" },
    { key: "labOthers", label: "labOthers" },
  ];

  const missing = [];
  for (const field of requiredTextFields) {
    if (!normalizeText(body?.[field.key])) {
      missing.push(field.label);
    }
  }

  const hasPastOperation = parseBooleanInput(body?.hasPastOperation);
  if (hasPastOperation === null) {
    missing.push("hasPastOperation");
  } else if (hasPastOperation === true && !normalizeText(body?.operationNatureAndDate)) {
    missing.push("operationNatureAndDate");
  }

  if (!parseDate(body?.cbcDate)) {
    missing.push("cbcDate");
  }
  if (!parseDate(body?.uaDate)) {
    missing.push("uaDate");
  }
  if (!parseDate(body?.chestXrayDate)) {
    missing.push("chestXrayDate");
  }
  if (!parseDate(body?.dateReceived)) {
    missing.push("dateReceived");
  }

  const xrayResult = mapXrayResult(body?.xrayResult);
  if (!xrayResult) {
    missing.push("xrayResult");
  }
  if (xrayResult === XrayResult.ABNORMAL && !normalizeText(body?.abnormalFindings)) {
    missing.push("abnormalFindings");
  }

  return missing;
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
    createdAt: exam.createdAt,
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
    const examDate = parseDate(req.body?.examDate || req.body?.dateOfExam);

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

    const missingRequiredFields = collectMissingRequiredFields(req.body);
    if (missingRequiredFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete all required physical examination fields: ${missingRequiredFields.join(", ")}.`,
      });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { id: true, studentNumber: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const medicalHistoryPayload = buildMedicalHistoryPayload(req.body);
    if (medicalHistoryPayload) {
      await prisma.medicalHistory.upsert({
        where: { studentProfileId },
        update: medicalHistoryPayload,
        create: {
          studentProfileId,
          ...medicalHistoryPayload,
        },
      });
    }

    const computedBmi = calculateBmi(req.body?.weight, req.body?.height);

    const exam = await prisma.physicalExamination.create({
      data: {
        studentProfileId,
        yearLevel,
        examDate,
        bp: normalizeText(req.body?.bp) || null,
        cr: normalizeText(req.body?.cr || req.body?.heartRate || req.body?.pulseRate) || null,
        rr: normalizeText(req.body?.rr || req.body?.respRate) || null,
        temp: normalizeText(req.body?.temp || req.body?.temperature) || null,
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
        others: normalizeText(req.body?.others || req.body?.remarks) || null,
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

    const cbcDate = parseDate(req.body?.cbcDate);
    const uaDate = parseDate(req.body?.uaDate);
    const chestXrayDate = parseDate(req.body?.chestXrayDate);
    const explicitLabDate = parseDate(req.body?.labDate || req.body?.date);
    const dateReceived = parseDate(req.body?.dateReceived);
    const resolvedLabDate = cbcDate || uaDate || chestXrayDate || explicitLabDate || examDate;

    const normalizedAbnormalFindings = normalizeText(req.body?.abnormalFindings || req.body?.chestXrayFindings);
    const normalizedLabOthers = normalizeText(req.body?.labOthers || req.body?.others);

    const hasLabData = [
      cbcDate,
      uaDate,
      chestXrayDate,
      explicitLabDate,
      dateReceived,
      req.body?.hgb,
      req.body?.hct,
      req.body?.wbc,
      req.body?.pltCt,
      req.body?.bloodType,
      req.body?.cbcBldType,
      req.body?.glucoseSugar,
      req.body?.urineGlucose,
      req.body?.protein,
      req.body?.urineProtein,
      req.body?.xrayResult,
      req.body?.chestXray,
      normalizedAbnormalFindings,
      normalizedLabOthers,
    ].some((value) => {
      if (value instanceof Date) {
        return true;
      }

      return normalizeText(value);
    });

    let labResult = null;
    if (hasLabData) {
      labResult = await prisma.labResult.create({
        data: {
          studentProfileId,
          date: resolvedLabDate,
          dateReceived: dateReceived || null,
          hgb: normalizeText(req.body?.hgb) || null,
          hct: normalizeText(req.body?.hct) || null,
          wbc: normalizeText(req.body?.wbc) || null,
          pltCt: normalizeText(req.body?.pltCt) || null,
          bloodType: normalizeText(req.body?.bloodType || req.body?.cbcBldType) || null,
          glucoseSugar: normalizeText(req.body?.glucoseSugar || req.body?.urineGlucose) || null,
          protein: normalizeText(req.body?.protein || req.body?.urineProtein) || null,
          xrayResult: mapXrayResult(req.body?.xrayResult || req.body?.chestXray),
          xrayFindingsEnc: normalizedAbnormalFindings ? encryptStringSafe(normalizedAbnormalFindings) : null,
          othersEnc: normalizedLabOthers ? encryptStringSafe(normalizedLabOthers) : null,
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
          hasMedicalHistoryUpdate: !!medicalHistoryPayload,
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
