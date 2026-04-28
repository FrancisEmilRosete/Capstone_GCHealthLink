const {
  encryptStringSafe,
  decryptStringSafe,
} = require("../utils/encryption.util");
const { deriveConcernTag } = require("../utils/concernTag.util");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");
const { prisma, runDbTransaction } = require("../lib/prisma");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseYearLevelFilter(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;

  const map = {
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

  return map[normalized] || null;
}

function parseValidDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDispensedMedicines(value) {
  if (value === undefined || value === null) {
    return { ok: true, medicines: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, message: "dispensedMedicines must be an array." };
  }

  if (value.length > 100) {
    return { ok: false, message: "dispensedMedicines cannot contain more than 100 items." };
  }

  const aggregated = new Map();
  for (const [index, item] of value.entries()) {
    const inventoryId = normalizeText(item?.inventoryId);
    const quantity = Number(item?.quantity);

    if (!inventoryId) {
      return { ok: false, message: `dispensedMedicines[${index}].inventoryId is required.` };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, message: `dispensedMedicines[${index}].quantity must be a positive integer.` };
    }

    if (quantity > 1000) {
      return { ok: false, message: `dispensedMedicines[${index}].quantity must be 1000 or less.` };
    }

    aggregated.set(inventoryId, (aggregated.get(inventoryId) || 0) + quantity);
  }

  const medicines = [...aggregated.entries()].map(([inventoryId, quantity]) => ({
    inventoryId,
    quantity,
  }));

  for (const medicine of medicines) {
    if (medicine.quantity > 1000) {
      return {
        ok: false,
        message: `Total dispensed quantity for inventoryId ${medicine.inventoryId} must be 1000 or less.`,
      };
    }
  }

  return { ok: true, medicines };
}

function normalizeBooleanLike(value) {
  const lowered = decryptStringSafe(value)?.toLowerCase?.().trim?.() || "";
  return lowered !== "" && lowered !== "none" && lowered !== "no" && lowered !== "n/a" && lowered !== "na";
}

function extractOperationSummary(rawNotes) {
  const decryptedNotes = decryptStringSafe(rawNotes) || "";
  const bloodTypeMatch = decryptedNotes.match(/Blood type:\s*([^|]+)/i);
  const immunizationMatch = decryptedNotes.match(/Immunizations:\s*([^|]+)/i);

  const bloodType = bloodTypeMatch?.[1]?.trim() || null;
  const immunizationsRaw = immunizationMatch?.[1]?.trim() || "";
  const immunizations = immunizationsRaw
    ? immunizationsRaw.split(/[;,]/).map((value) => value.trim()).filter(Boolean)
    : [];

  return {
    notes: decryptedNotes,
    bloodType,
    immunizations,
  };
}

const MEDICAL_HISTORY_ENCRYPTED_FIELDS = [
  "allergyEnc",
  "asthmaEnc",
  "chickenPoxEnc",
  "diabetesEnc",
  "dysmenorrheaEnc",
  "epilepsySeizureEnc",
  "heartDisorderEnc",
  "hepatitisEnc",
  "hypertensionEnc",
  "measlesEnc",
  "mumpsEnc",
  "anxietyDisorderEnc",
  "panicAttackHyperventilationEnc",
  "pneumoniaEnc",
  "ptbPrimaryComplexEnc",
  "typhoidFeverEnc",
  "covid19Enc",
  "urinaryTractInfectionEnc",
  "hasPastOperationEnc",
  "operationNatureAndDateEnc",
];

function decryptMedicalHistory(history) {
  if (!history) return history;

  const operationSummary = extractOperationSummary(history.operationNatureAndDateEnc);

  const decryptedFields = {};
  for (const field of MEDICAL_HISTORY_ENCRYPTED_FIELDS) {
    decryptedFields[field] = decryptStringSafe(history[field]);
  }

  return {
    ...history,
    ...decryptedFields,
    operationNatureAndDateEnc:
      decryptedFields.operationNatureAndDateEnc || operationSummary.notes,
    bloodType: operationSummary.bloodType,
    immunizations: operationSummary.immunizations,
  };
}

function decryptLabResult(labResult) {
  if (!labResult) return labResult;

  return {
    ...labResult,
    xrayFindingsEnc: decryptStringSafe(labResult.xrayFindingsEnc),
    othersEnc: decryptStringSafe(labResult.othersEnc),
  };
}

function buildEmergencyAlert(history) {
  if (!history) {
    return null;
  }

  const risks = [];

  if (normalizeBooleanLike(history.asthmaEnc)) {
    risks.push("ASTHMA");
  }
  if (normalizeBooleanLike(history.diabetesEnc)) {
    risks.push("DIABETES");
  }
  if (normalizeBooleanLike(history.hypertensionEnc)) {
    risks.push("HYPERTENSION");
  }

  if (risks.length === 0) {
    return null;
  }

  return {
    level: "CRITICAL",
    warning: `HIGH RISK: Patient has history of ${risks.join(", ")}.`,
    instructions: "Proceed with caution and check emergency protocols.",
  };
}

async function writeScanAuditLog(req, targetUserId, reason) {
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: "VIEWED_MEDICAL_RECORD",
      targetId: targetUserId,
      ipAddress: req.ip,
      metadata: {
        reason,
        method: req.method,
      },
    },
  });
}

function mapStudentScanPayload(student) {
  const profile = {
    ...student.studentProfile,
    medicalHistory: decryptMedicalHistory(student.studentProfile?.medicalHistory || null),
    labResults: (student.studentProfile?.labResults || []).map((labResult) => decryptLabResult(labResult)),
  };

  return {
    profile,
    emergencyAlert: buildEmergencyAlert(profile.medicalHistory),
  };
}

// ==========================================
// 0. List Clinic Visits (Staff/Admin)
// ==========================================
const getVisits = async (req, res, next) => {
  try {
    const studentProfileId = normalizeText(req.query?.studentProfileId);
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 500,
      maxLimit: 1000,
    });

    const whereClause = studentProfileId ? { studentProfileId } : undefined;

    const [visitsRaw, total] = await prisma.$transaction([
      prisma.clinicVisit.findMany({
        where: whereClause,
        orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
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
          handledBy: {
            select: {
              id: true,
              email: true,
            },
          },
          dispensedMedicines: {
            include: {
              inventory: {
                select: {
                  itemName: true,
                  unit: true,
                },
              },
            },
          },
        },
      }),
      prisma.clinicVisit.count({ where: whereClause }),
    ]);

    const visits = visitsRaw.map((visit) => ({
      ...visit,
      chiefComplaintEnc: decryptStringSafe(visit.chiefComplaintEnc),
    }));

    res.json({
      success: true,
      message: "Clinic visits retrieved successfully",
      data: visits,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 1. Fetch student via QR & Track Audit Log
// ==========================================
const getStudentByQR = async (req, res, next) => {
  try {
    const studentId = normalizeText(req.params.studentId);

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required." });
    }

    let student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: {
          include: {
            medicalHistory: true,
            physicalExaminations: {
              orderBy: { examDate: "desc" },
            },
            labResults: {
              orderBy: { date: "desc" },
            },
          }
        },
      },
    });

    // Backward compatibility: older QR payloads may send student number instead of user ID.
    if (!student || student.role !== "STUDENT" || !student.studentProfile) {
      const profileMatch = await prisma.studentProfile.findUnique({
        where: { studentNumber: studentId },
        include: {
          user: {
            select: {
              id: true,
              role: true,
            },
          },
          medicalHistory: true,
          physicalExaminations: {
            orderBy: { examDate: "desc" },
          },
          labResults: {
            orderBy: { date: "desc" },
          },
        },
      });

      if (profileMatch?.user?.role === "STUDENT") {
        const { user, ...profileWithoutUser } = profileMatch;
        student = {
          id: user.id,
          role: user.role,
          studentProfile: profileWithoutUser,
        };
      }
    }

    if (!student || student.role !== "STUDENT" || !student.studentProfile) {
      return res.status(404).json({ success: false, message: "Valid student record not found." });
    }

    const { profile, emergencyAlert } = mapStudentScanPayload(student);

    await writeScanAuditLog(req, student.id, "QR Code Check-in Scan");

    res.json({
      success: true,
      message: "Student record retrieved successfully",
      emergencyAlert,
      data: profile,
    });

  } catch (error) {
    next(error);
  }
};

const getStudentByQrToken = async (req, res, next) => {
  try {
    const qrToken = normalizeText(req.params.qrToken);
    if (!qrToken) {
      return res.status(400).json({ success: false, message: "qrToken is required." });
    }

    const student = await prisma.user.findFirst({
      where: {
        qrToken,
        role: "STUDENT",
      },
      include: {
        studentProfile: {
          include: {
            medicalHistory: true,
            physicalExaminations: {
              orderBy: { examDate: "desc" },
            },
            labResults: {
              orderBy: { date: "desc" },
            },
          },
        },
      },
    });

    if (!student || !student.studentProfile) {
      return res.status(404).json({ success: false, message: "QR code is invalid." });
    }

    const { profile, emergencyAlert } = mapStudentScanPayload(student);

    await writeScanAuditLog(req, student.id, "Static QR Token Scan");

    return res.json({
      success: true,
      message: "Student record retrieved successfully",
      emergencyAlert,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. Record Clinic Visit & Deduct Inventory
// ==========================================
const recordVisit = async (req, res, next) => {
  try {
    const {
      studentProfileId,
      visitDate,
      visitTime,
      chiefComplaintEnc,
      dispensedMedicines,
    } = req.body;

    const handledById = req.user.userId;
    const normalizedStudentProfileId = normalizeText(studentProfileId);
    const parsedVisitDate = parseValidDate(visitDate);
    const normalizedVisitTime = normalizeText(visitTime);
    const normalizedComplaint = typeof chiefComplaintEnc === "string" ? chiefComplaintEnc.trim() : "";
    const medicines = parseDispensedMedicines(dispensedMedicines);

    if (!normalizedStudentProfileId) {
      return res.status(400).json({ success: false, message: "studentProfileId is required." });
    }

    if (!parsedVisitDate) {
      return res.status(400).json({ success: false, message: "visitDate must be a valid date." });
    }

    if (visitTime !== undefined && visitTime !== null && typeof visitTime !== "string") {
      return res.status(400).json({ success: false, message: "visitTime must be a text value." });
    }

    if (normalizedVisitTime.length > 32) {
      return res.status(400).json({ success: false, message: "visitTime must be 32 characters or fewer." });
    }

    if (chiefComplaintEnc !== undefined && chiefComplaintEnc !== null && typeof chiefComplaintEnc !== "string") {
      return res.status(400).json({ success: false, message: "chiefComplaintEnc must be a text value." });
    }

    if (normalizedComplaint.length > 5000) {
      return res.status(400).json({ success: false, message: "chiefComplaintEnc must be 5000 characters or fewer." });
    }

    if (!medicines.ok) {
      return res.status(400).json({ success: false, message: medicines.message });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: normalizedStudentProfileId },
      select: { id: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const result = await runDbTransaction(async (tx) => {
      const newVisit = await tx.clinicVisit.create({
        data: {
          studentProfileId: normalizedStudentProfileId,
          handledById,
          visitDate: parsedVisitDate,
          visitTime: normalizedVisitTime || null,
          chiefComplaintEnc: encryptStringSafe(normalizedComplaint),
          concernTag: deriveConcernTag(normalizedComplaint),
        },
      });

      if (medicines.medicines.length > 0) {
        for (const med of medicines.medicines) {
          const deduction = await tx.inventory.updateMany({
            where: {
              id: med.inventoryId,
              currentStock: {
                gte: med.quantity,
              },
            },
            data: {
              currentStock: {
                decrement: med.quantity,
              },
            },
          });

          if (deduction.count === 0) {
            const existingItem = await tx.inventory.findUnique({
              where: { id: med.inventoryId },
              select: {
                itemName: true,
                currentStock: true,
              },
            });

            if (!existingItem) {
              throw new Error(`Inventory item not found for ID: ${med.inventoryId}`);
            }

            throw new Error(`Insufficient stock for ${existingItem.itemName}. Available: ${existingItem.currentStock}`);
          }

          await tx.visitMedicine.create({
            data: {
              visitId: newVisit.id,
              inventoryId: med.inventoryId,
              quantity: med.quantity,
            },
          });
        }
      }

      const createdVisit = await tx.clinicVisit.findUnique({
        where: { id: newVisit.id },
        include: {
          dispensedMedicines: { include: { inventory: true } },
        },
      });

      if (!createdVisit) {
        return null;
      }

      return {
        ...createdVisit,
        chiefComplaintEnc: decryptStringSafe(createdVisit.chiefComplaintEnc),
      };
    });

    res.status(201).json({
      success: true,
      message: "Clinic visit and medicine dispensing recorded successfully",
      data: result
    });

  } catch (error) {
    if (error.message && error.message.includes("Insufficient stock")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.message && error.message.includes("Inventory item not found")) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.code === "P2028" || error.code === "P2024") {
      return res.status(503).json({
        success: false,
        message: "Clinic service is temporarily busy. Please retry in a few seconds.",
      });
    }

    next(error);
  }
};

// ==========================================
// 3. Global Search for Students
// ==========================================
const searchStudents = async (req, res, next) => {
  try {
    const q = normalizeText(req.query.q);

    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required." });
    }

    if (q.length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters." });
    }

    if (q.length > 100) {
      return res.status(400).json({ success: false, message: "Search query must be 100 characters or fewer." });
    }

    const orConditions = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { studentNumber: { contains: q, mode: 'insensitive' } },
      { courseDept: { contains: q, mode: 'insensitive' } },
    ];

    const students = await prisma.studentProfile.findMany({
      where: {
        OR: orConditions,
      },
      take: 10,
      include: {
        user: { select: { id: true } },
      }
    });

    res.json({
      success: true,
      message: "Search completed",
      data: students
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. Students Directory (QR alternative)
// ==========================================
const listStudentsDirectory = async (req, res, next) => {
  try {
    const q = normalizeText(req.query.q);
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 500,
      maxLimit: 2000,
    });

    if (q.length > 100) {
      return res.status(400).json({ success: false, message: "Search query must be 100 characters or fewer." });
    }

    const whereClause = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { studentNumber: { contains: q, mode: "insensitive" } },
            { courseDept: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const [students, total] = await prisma.$transaction([
      prisma.studentProfile.findMany({
        where: whereClause,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
        include: {
          user: { select: { id: true } },
        },
      }),
      prisma.studentProfile.count({ where: whereClause }),
    ]);

    return res.json({
      success: true,
      message: "Students directory retrieved successfully.",
      data: students,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// 5. Simulate Emergency SMS Alert
// ==========================================
const sendEmergencyAlert = async (req, res, next) => {
  try {
    const studentProfileId = normalizeText(req.body?.studentProfileId);
    const incidentDetails = normalizeText(req.body?.incidentDetails);

    if (!studentProfileId || !incidentDetails) {
      return res.status(400).json({ success: false, message: "Student ID and incident details are required." });
    }

    if (incidentDetails.length > 500) {
      return res.status(400).json({ success: false, message: "incidentDetails must be 500 characters or fewer." });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: {
        firstName: true,
        lastName: true,
        emergencyContactName: true,
        emergencyContactTelNumber: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    if (!student.emergencyContactName || !student.emergencyContactTelNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "No emergency contact information on file for this student." 
      });
    }

    const simulatedSmsPayload = {
      to: student.emergencyContactTelNumber,
      recipient: student.emergencyContactName,
      sender: "GC HealthLink Clinic",
      message: `URGENT: Your student, ${student.firstName} ${student.lastName}, is currently at the Gordon College Clinic. Reason: ${incidentDetails}. Please contact the clinic immediately or proceed to the campus.`,
      timestamp: new Date().toISOString(),
      status: "DELIVERED_TO_GATEWAY"
    };

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "SENT_EMERGENCY_ALERT",
        targetId: studentProfileId,
        ipAddress: req.ip,
        metadata: {
          incidentDetails,
          recipient: student.emergencyContactName,
        },
      },
    });

    res.json({
      success: true,
      message: "Emergency SMS alert simulated successfully.",
      data: simulatedSmsPayload
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVisits,
  getStudentByQR,
  getStudentByQrToken,
  recordVisit,
  searchStudents,
  listStudentsDirectory,
  sendEmergencyAlert,
};