const { PrismaClient } = require("@prisma/client");
const QRCode = require("qrcode"); 
const crypto = require("crypto");
const { decryptStringSafe } = require("../utils/encryption.util");
const { encryptStringSafe } = require("../utils/encryption.util");
const { hashPassword } = require("../utils/password.util");
const {
  VALID_DEPARTMENT_CODES,
  normalizeDepartmentCode,
  getCoursesByDepartmentCode,
  isValidDepartmentCode,
  isValidCourseForDepartment,
} = require("../constants/departments");
const prisma = new PrismaClient();

const STUDENT_YEAR_LEVEL_MAP = {
  "yr. 1": "YR_1",
  "yr 1": "YR_1",
  "yr.1": "YR_1",
  "yr1": "YR_1",
  "1": "YR_1",
  "1st year": "YR_1",
  "yr. 2": "YR_2",
  "yr 2": "YR_2",
  "yr.2": "YR_2",
  "yr2": "YR_2",
  "2": "YR_2",
  "2nd year": "YR_2",
  "yr. 3": "YR_3",
  "yr 3": "YR_3",
  "yr.3": "YR_3",
  "yr3": "YR_3",
  "3": "YR_3",
  "3rd year": "YR_3",
  "yr. 4": "YR_4",
  "yr 4": "YR_4",
  "yr.4": "YR_4",
  "yr4": "YR_4",
  "4": "YR_4",
  "4th year": "YR_4",
};

const REGISTRATION_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QR_TOKEN_SECRET = normalizeText(process.env.QR_TOKEN_SECRET)
  || normalizeText(process.env.JWT_SECRET)
  || "gc-healthlink-static-qr";

const CONDITION_TO_FIELD = {
  allergy: "allergyEnc",
  asthma: "asthmaEnc",
  chickenpox: "chickenPoxEnc",
  diabetes: "diabetesEnc",
  dysmenorrhea: "dysmenorrheaEnc",
  epilepsy: "epilepsySeizureEnc",
  "heart disorder": "heartDisorderEnc",
  hepatitis: "hepatitisEnc",
  hypertension: "hypertensionEnc",
  measles: "measlesEnc",
  mumps: "mumpsEnc",
  "anxiety disorder": "anxietyDisorderEnc",
  "panic attack": "panicAttackHyperventilationEnc",
  pneumonia: "pneumoniaEnc",
  ptb: "ptbPrimaryComplexEnc",
  "typhoid fever": "typhoidFeverEnc",
  covid19: "covid19Enc",
  covid: "covid19Enc",
  uti: "urinaryTractInfectionEnc",
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBirthday(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseAge(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 120) {
    return null;
  }

  return parsed;
}

function parseStudentYearLevel(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  return STUDENT_YEAR_LEVEL_MAP[normalized] || null;
}

function normalizeConditionName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readConditionSet(rawConditions) {
  if (!Array.isArray(rawConditions)) {
    return new Set();
  }

  return new Set(
    rawConditions
      .map((item) => normalizeConditionName(item))
      .filter(Boolean)
  );
}

function hasCondition(conditionSet, key) {
  if (conditionSet.has(key)) {
    return true;
  }

  if (key === "ptb") {
    return [...conditionSet].some((value) => value.includes("ptb") || value.includes("tuberculosis"));
  }

  if (key === "covid19" || key === "covid") {
    return [...conditionSet].some((value) => value.includes("covid"));
  }

  if (key === "panic attack") {
    return [...conditionSet].some((value) => value.includes("panic"));
  }

  if (key === "heart disorder") {
    return [...conditionSet].some((value) => value.includes("heart"));
  }

  return false;
}

function buildMedicalHistoryPayload(medical = {}, surgical = {}) {
  const conditionSet = readConditionSet(medical.conditions);
  const payload = {};

  for (const [conditionName, field] of Object.entries(CONDITION_TO_FIELD)) {
    const conditionValue = hasCondition(conditionSet, conditionName) ? "yes" : "no";
    payload[field] = encryptStringSafe(conditionValue);
  }

  const allergies = normalizeText(medical.allergies);
  if (allergies) {
    payload.allergyEnc = encryptStringSafe(allergies);
  }

  const hasSurgery = surgical.hasSurgery;
  if (hasSurgery === true) {
    payload.hasPastOperationEnc = encryptStringSafe("yes");
  } else if (hasSurgery === false) {
    payload.hasPastOperationEnc = encryptStringSafe("no");
  } else {
    payload.hasPastOperationEnc = encryptStringSafe("");
  }

  const operations = Array.isArray(surgical.entries)
    ? surgical.entries
        .map((entry) => {
          const opName = normalizeText(entry?.operation || entry?.name);
          const year = normalizeText(entry?.year);
          if (!opName && !year) {
            return "";
          }
          return year ? `${opName} (${year})` : opName;
        })
        .filter(Boolean)
    : [];

  const immunizations = normalizeText(medical.immunizations);

  const medicalNotes = [
    normalizeText(medical.existingConditions) && `Existing conditions: ${normalizeText(medical.existingConditions)}`,
    normalizeText(medical.others) && `Others: ${normalizeText(medical.others)}`,
    normalizeText(medical.bloodType) && `Blood type: ${normalizeText(medical.bloodType)}`,
    immunizations && `Immunizations: ${immunizations}`,
    operations.length > 0 && `Operations: ${operations.join("; ")}`,
  ].filter(Boolean);

  payload.operationNatureAndDateEnc = encryptStringSafe(medicalNotes.join(" | "));

  return payload;
}

function extractOperationSummary(rawNotes) {
  const decryptedNotes = decryptStringSafe(rawNotes) || "";

  const bloodTypeMatch = decryptedNotes.match(/Blood type:\s*([^|]+)/i);
  const immunizationMatch = decryptedNotes.match(/Immunizations:\s*([^|]+)/i);

  const bloodType = bloodTypeMatch?.[1]?.trim() || null;
  const immunizationsRaw = immunizationMatch?.[1]?.trim() || "";
  const immunizations = immunizationsRaw
    ? immunizationsRaw.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean)
    : [];

  return {
    notes: decryptedNotes,
    bloodType,
    immunizations,
  };
}

function generateStaticQrToken(studentProfileId) {
  const profileId = normalizeText(studentProfileId);
  const nonce = crypto.randomBytes(16).toString("hex");

  return crypto
    .createHmac("sha256", QR_TOKEN_SECRET)
    .update(`${profileId}:${nonce}`)
    .digest("hex");
}

function decryptMedicalHistory(history) {
  if (!history) return history;

  const operationSummary = extractOperationSummary(history.operationNatureAndDateEnc);

  return {
    ...history,
    allergyEnc: decryptStringSafe(history.allergyEnc),
    asthmaEnc: decryptStringSafe(history.asthmaEnc),
    diabetesEnc: decryptStringSafe(history.diabetesEnc),
    hypertensionEnc: decryptStringSafe(history.hypertensionEnc),
    anxietyDisorderEnc: decryptStringSafe(history.anxietyDisorderEnc),
    operationNatureAndDateEnc: operationSummary.notes,
    bloodType: operationSummary.bloodType,
    immunizations: operationSummary.immunizations,
  };
}

// UPGRADED: Fetches full Dashboard data (Profile + History + Visits)
const getMyProfile = async (req, res, next) => {
  try {
    // We fetch the StudentProfile directly using the userId from the JWT
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        // Include the checklist (Allergies, Asthma, etc.)
        medicalHistory: true, 
        // Include all clinic visits + the medicines given + the nurse's info
        clinicVisits: {
          include: {
            dispensedMedicines: {
              include: { inventory: true }
            },
            handledBy: {
              select: { email: true } 
            }
          },
          orderBy: { visitDate: 'desc' } // Newest visits first
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: "Student profile not found. Please contact the clinic." 
      });
    }

    const hydratedProfile = {
      ...profile,
      medicalHistory: decryptMedicalHistory(profile.medicalHistory),
      clinicVisits: (profile.clinicVisits || []).map((visit) => ({
        ...visit,
        chiefComplaintEnc: decryptStringSafe(visit.chiefComplaintEnc),
      })),
    };

    res.json({ 
      success: true, 
      message: "Student dashboard retrieved successfully",
      data: hydratedProfile 
    });
  } catch (error) {
    next(error);
  }
};

// GENERATE/FETCH STATIC QR CODE TOKEN FOR THE LOGGED-IN STUDENT
const generateMyQRCode = async (req, res, next) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { studentProfile: true },
    });

    if (!student || !student.studentProfile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    let qrToken = normalizeText(student.qrToken);

    if (!qrToken) {
      qrToken = generateStaticQrToken(student.studentProfile.id);

      await prisma.user.update({
        where: { id: student.id },
        data: {
          qrToken,
        },
      });
    }

    if (!qrToken) {
      return res.status(500).json({ success: false, message: "Unable to generate QR token." });
    }

    const qrData = JSON.stringify({
      qrToken,
      studentNumber: student.studentProfile.studentNumber,
    });

    const qrCodeImage = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      data: {
        studentNumber: student.studentProfile.studentNumber,
        qrToken,
        qrCodeImage,
      }
    });
  } catch (error) {
    next(error);
  }
};

const submitRegistration = async (req, res, next) => {
  try {
    const { personal = {}, emergency = {}, medical = {}, surgical = {}, consentAgreed, credentials = {} } = req.body || {};

    const studentNumber = normalizeText(personal.studentId);
    const firstName = normalizeText(personal.firstName);
    const lastName = normalizeText(personal.lastName);
    const middleInitial = normalizeText(personal.middleInitial);
    const course = normalizeText(personal.course);
    const yearLevel = parseStudentYearLevel(personal.yearLevel);
    const departmentCode = normalizeDepartmentCode(personal.department);
    const civilStatus = normalizeText(personal.civilStatus);
    const sex = normalizeText(personal.sex);
    const contact = normalizeText(personal.contact);
    const email = normalizeText(personal.email).toLowerCase();
    const address = normalizeText(personal.address);
    const birthday = parseBirthday(personal.birthday);
    const age = parseAge(personal.age);

    if (!studentNumber || !firstName || !lastName || !departmentCode || !email) {
      return res.status(400).json({
        success: false,
        message: "studentId, firstName, lastName, department, and email are required.",
      });
    }

    if (!isValidDepartmentCode(departmentCode)) {
      return res.status(400).json({
        success: false,
        message: `department must be one of: ${VALID_DEPARTMENT_CODES.join(", ")}.`,
      });
    }

    if (!course) {
      return res.status(400).json({
        success: false,
        message: "course is required.",
      });
    }

    if (!isValidCourseForDepartment(course, departmentCode)) {
      return res.status(400).json({
        success: false,
        message: `course is invalid for department ${departmentCode}. Allowed courses: ${getCoursesByDepartmentCode(departmentCode).join("; ")}`,
      });
    }

    if (personal.yearLevel !== undefined && personal.yearLevel !== null && personal.yearLevel !== "" && !yearLevel) {
      return res.status(400).json({
        success: false,
        message: "yearLevel must be one of: Yr. 1, Yr. 2, Yr. 3, Yr. 4.",
      });
    }

    if (!REGISTRATION_EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    if (personal.age !== undefined && personal.age !== null && personal.age !== "" && age === null) {
      return res.status(400).json({ success: false, message: "age must be a whole number between 0 and 120." });
    }

    if (personal.birthday && !birthday) {
      return res.status(400).json({ success: false, message: "birthday must be a valid date." });
    }

    if (consentAgreed !== true) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the data privacy consent before submitting registration.",
      });
    }

    const isAuthenticatedStudent = req.user?.role === "STUDENT" && !!req.user?.userId;

    let user = null;
    let createdAccount = false;

    if (isAuthenticatedStudent) {
      user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { studentProfile: { select: { id: true } } },
      });

      if (!user || user.role !== "STUDENT") {
        return res.status(403).json({
          success: false,
          message: "Only student accounts can submit this registration while authenticated.",
        });
      }

      if (user.email !== email) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { email },
            include: { studentProfile: { select: { id: true } } },
          });
        } catch (error) {
          if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Email address is already in use." });
          }
          throw error;
        }
      }
    } else {
      const password = normalizeText(credentials.password);
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password is required for public registration and must be at least 8 characters.",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please sign in instead of registering again.",
        });
      }

      const existingStudentNumber = await prisma.studentProfile.findUnique({
        where: { studentNumber },
        select: { id: true },
      });
      if (existingStudentNumber) {
        return res.status(409).json({ success: false, message: "Student ID is already in use." });
      }

      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "STUDENT",
        },
        include: { studentProfile: { select: { id: true } } },
      });
      createdAccount = true;
    }

    const emergencyName = normalizeText(emergency.name || emergency.contactName);
    const emergencyRelationship = normalizeText(emergency.relationship);
    const emergencyContact = normalizeText(emergency.contact || emergency.emergencyContact);
    const emergencyAddress = normalizeText(emergency.address || emergency.emergencyAddress);

    const profilePayload = {
      studentNumber,
      firstName,
      lastName,
      mi: middleInitial || null,
      courseDept: departmentCode,
      course: course || null,
      yearLevel,
      civilStatus: civilStatus || null,
      age,
      sex: sex || null,
      birthday,
      presentAddress: address || null,
      telNumber: contact || null,
      emergencyContactName: emergencyName || null,
      emergencyRelationship: emergencyRelationship || null,
      emergencyContactAddress: emergencyAddress || null,
      emergencyContactTelNumber: emergencyContact || null,
    };

    let studentProfile;
    if (user.studentProfile?.id) {
      try {
        studentProfile = await prisma.studentProfile.update({
          where: { id: user.studentProfile.id },
          data: profilePayload,
        });
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "Student ID is already in use." });
        }
        throw error;
      }
    } else {
      try {
        studentProfile = await prisma.studentProfile.create({
          data: {
            userId: user.id,
            ...profilePayload,
          },
        });
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "Student ID is already in use." });
        }
        throw error;
      }
    }

    const medicalHistoryPayload = buildMedicalHistoryPayload(medical, surgical);
    await prisma.medicalHistory.upsert({
      where: { studentProfileId: studentProfile.id },
      update: medicalHistoryPayload,
      create: {
        studentProfileId: studentProfile.id,
        ...medicalHistoryPayload,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SUBMITTED_HEALTH_REGISTRATION",
        targetId: studentProfile.id,
        ipAddress: req.ip,
        metadata: {
          source: isAuthenticatedStudent ? "student-dashboard" : "public-register",
          createdAccount,
          studentNumber,
          department: departmentCode,
          course,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: createdAccount
        ? "Registration submitted successfully. Your account has been created."
        : "Registration submitted successfully.",
      data: {
        userId: user.id,
        studentProfileId: studentProfile.id,
        email: user.email,
        createdAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/students/by-number/:studentNumber
// Returns a student's profile, clinic visits, and appointments for the health history page.
const getStudentByNumber = async (req, res, next) => {
  try {
    const studentNumber = (req.params.studentNumber || '').trim();
    if (!studentNumber) {
      return res.status(400).json({ success: false, message: 'studentNumber is required.' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { studentNumber },
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        lastName: true,
        mi: true,
        courseDept: true,
        course: true,
        yearLevel: true,
        age: true,
        sex: true,
        birthday: true,
        presentAddress: true,
        telNumber: true,
        medicalHistory: true,
        clinicVisits: {
          orderBy: { visitDate: 'desc' },
          select: {
            id: true,
            visitDate: true,
            visitTime: true,
            chiefComplaintEnc: true,
            concernTag: true,
          },
        },
        appointments: {
          orderBy: { preferredDate: 'desc' },
          select: {
            id: true,
            preferredDate: true,
            preferredTime: true,
            serviceType: true,
            symptoms: true,
            status: true,
          },
        },
        physicalExaminations: {
          orderBy: { examDate: 'desc' },
          select: {
            id: true,
            examDate: true,
            yearLevel: true,
            bp: true,
            weight: true,
            height: true,
            bmi: true,
            examinedBy: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    return res.json({
      success: true,
      data: {
        ...profile,
        medicalHistory: decryptMedicalHistory(profile.medicalHistory),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyProfile, generateMyQRCode, submitRegistration, getStudentByNumber };