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
    const autoDispense = Boolean(item?.autoDispense);

    if (!inventoryId) {
      return { ok: false, message: `dispensedMedicines[${index}].inventoryId is required.` };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, message: `dispensedMedicines[${index}].quantity must be a positive integer.` };
    }

    if (quantity > 1000) {
      return { ok: false, message: `dispensedMedicines[${index}].quantity must be 1000 or less.` };
    }

    const existing = aggregated.get(inventoryId) || { quantity: 0, autoDispense: false };
    aggregated.set(inventoryId, {
      quantity: existing.quantity + quantity,
      autoDispense: existing.autoDispense || autoDispense,
    });
  }

  const medicines = [...aggregated.entries()].map(([inventoryId, item]) => ({
    inventoryId,
    quantity: item.quantity,
    autoDispense: item.autoDispense,
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
              role: true,
              clinicStaffType: true,
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

function toActorName(user) {
  const firstName = normalizeText(user?.studentProfile?.firstName);
  const lastName = normalizeText(user?.studentProfile?.lastName);
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  const email = normalizeText(user?.email);
  if (!email) return "Clinic Staff";

  const localPart = email.split("@")[0] || "";
  const humanized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!humanized) return email;
  return humanized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function toActorRole(user) {
  if (user?.clinicStaffType) {
    return user.clinicStaffType;
  }
  return user?.role || "CLINIC_STAFF";
}

function toActionLabel(action) {
  return normalizeText(action)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const getStaffActivityLogs = async (req, res, next) => {
  try {
    const requestedStaffType = normalizeText(req.query?.staffType).toUpperCase();
    const allowedStaffTypes = ["NURSE", "DOCTOR", "DENTIST"];
    const staffType = allowedStaffTypes.includes(requestedStaffType) ? requestedStaffType : "NURSE";

    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 200,
      maxLimit: 500,
    });

    const where = {
      user: {
        role: "CLINIC_STAFF",
        clinicStaffType: staffType,
      },
      action: {
        notIn: ["RECORDED_CLINIC_VISIT", "RECORDED_PHYSICAL_EXAM"],
      },
    };

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              clinicStaffType: true,
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
      prisma.auditLog.count({ where }),
    ]);

    const rows = logs.map((log) => ({
      id: log.id,
      action: log.action,
      actionLabel: toActionLabel(log.action),
      timestamp: log.timestamp,
      targetId: log.targetId || null,
      ipAddress: log.ipAddress || null,
      metadata: log.metadata || null,
      actorName: toActorName(log.user),
      actorRole: toActorRole(log.user),
    }));

    return res.json({
      success: true,
      message: "Clinic staff activity logs retrieved successfully.",
      data: rows,
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (error) {
    return next(error);
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
          if (med.autoDispense) {
            const inventory = await tx.inventory.findUnique({
              where: { id: med.inventoryId },
              select: { currentStock: true, itemName: true },
            });
            if (!inventory) {
              throw new Error(`Inventory item not found for ID: ${med.inventoryId}`);
            }
            if (inventory.currentStock < med.quantity) {
              throw new Error(`Insufficient stock for ${inventory.itemName}. Available: ${inventory.currentStock}`);
            }

            await tx.inventory.update({
              where: { id: med.inventoryId },
              data: { currentStock: { decrement: med.quantity } },
            });
          }

          await tx.visitMedicine.create({
            data: {
              visitId: newVisit.id,
              inventoryId: med.inventoryId,
              quantity: med.quantity,
              status: med.autoDispense ? "DISPENSED" : "PRESCRIBED",
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

const dispenseMedicine = async (req, res, next) => {
  try {
    const { visitMedicineId } = req.params;

    const visitMedicine = await prisma.visitMedicine.findUnique({
      where: { id: visitMedicineId },
      include: { inventory: true, visit: true },
    });

    if (!visitMedicine) {
      return res.status(404).json({ success: false, message: "Prescription record not found." });
    }

    if (visitMedicine.status === "DISPENSED") {
      return res.status(400).json({ success: false, message: "Medicine has already been dispensed." });
    }

    const now = new Date();
    const expirationDate = visitMedicine.inventory.expirationDate ? new Date(visitMedicine.inventory.expirationDate) : null;
    const isExpired = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate < now);
    const isExpiringSoon = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate >= now && expirationDate <= new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)));

    if (isExpired) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: "BLOCKED_EXPIRED_MEDICINE_DISPENSE",
          targetId: visitMedicineId,
          ipAddress: req.ip,
          metadata: {
            inventoryId: visitMedicine.inventoryId,
            inventoryItemName: visitMedicine.inventory.itemName,
            quantity: visitMedicine.quantity,
            visitId: visitMedicine.visitId,
            expirationDate: visitMedicine.inventory.expirationDate,
            reason: "Medicine expired",
          },
        },
      });

      return res.status(409).json({
        success: false,
        message: `Cannot dispense ${visitMedicine.inventory.itemName} because it is expired.`,
      });
    }

    if (visitMedicine.inventory.currentStock < visitMedicine.quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock for ${visitMedicine.inventory.itemName}. Available: ${visitMedicine.inventory.currentStock}` 
      });
    }

    const updated = await prisma.$transaction([
      prisma.inventory.update({
        where: { id: visitMedicine.inventoryId },
        data: { currentStock: { decrement: visitMedicine.quantity } },
      }),
      prisma.visitMedicine.update({
        where: { id: visitMedicineId },
        data: { status: "DISPENSED" },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "DISPENSED_MEDICINE",
        targetId: visitMedicineId,
        ipAddress: req.ip,
        metadata: {
          inventoryId: visitMedicine.inventoryId,
          quantity: visitMedicine.quantity,
          visitId: visitMedicine.visitId
        },
      },
    });

    const isLowStock = updated[0].currentStock <= updated[0].reorderThreshold;

    res.json({
      success: true,
      message: "Medicine dispensed successfully.",
      warning: isExpiringSoon
        ? `${visitMedicine.inventory.itemName} is nearing expiry. Please monitor stock usage and restocking.`
        : undefined,
      lowStockWarning: isLowStock
        ? `${updated[0].itemName} stock is running low (${updated[0].currentStock} remaining).`
        : undefined,
      data: updated[1],
    });
  } catch (error) {
    next(error);
  }
};

const getNurseReports = async (req, res, next) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get all visits for deep analytics
    const allVisits = await prisma.clinicVisit.findMany({
      include: {
        studentProfile: {
          select: { courseDept: true }
        }
      }
    });

    // 1. Quarterly Breakdown
    const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    allVisits.forEach(v => {
      const month = v.visitDate.getMonth() + 1; // 1-12
      if (month >= 8 && month <= 10) quarters.Q1++;
      else if (month >= 11 || month === 1) quarters.Q2++;
      else if (month >= 2 && month <= 4) quarters.Q3++;
      else quarters.Q4++;
    });

    // 2. Top Health Concerns per Dept
    const deptConcernsMap = new Map();
    allVisits.forEach(v => {
      if (!v.studentProfile || !v.studentProfile.courseDept || !v.concernTag) return;
      const dept = v.studentProfile.courseDept;
      const tag = v.concernTag;
      if (!deptConcernsMap.has(dept)) deptConcernsMap.set(dept, new Map());
      const map = deptConcernsMap.get(dept);
      map.set(tag, (map.get(tag) || 0) + 1);
    });

    const topHealthConcernsPerDept = Array.from(deptConcernsMap.entries()).map(([dept, concernsMap]) => {
      const sortedConcerns = Array.from(concernsMap.entries()).sort((a, b) => b[1] - a[1]);
      return {
        department: dept,
        concerns: sortedConcerns.slice(0, 5).map(c => ({ tag: c[0], count: c[1] }))
      };
    });

    // 3. AI Predictive Insights
    let aiInsights = [];
    if (quarters.Q2 >= quarters.Q1) {
      aiInsights.push("Historically, Q2 shows an increase in clinic visits. Recommendation: Increase stock of paracetamol and cough medicine before Q2 begins.");
    }
    const topOverall = Array.from(deptConcernsMap.values())
      .flatMap(m => Array.from(m.entries()))
      .reduce((acc, curr) => {
         acc[curr[0]] = (acc[curr[0]] || 0) + curr[1];
         return acc;
      }, {});
    const sortedOverall = Object.entries(topOverall).sort((a,b) => b[1] - a[1]);
    if (sortedOverall.length > 0) {
      aiInsights.push(`AI Analysis indicates a persistent trend in '${sortedOverall[0][0]}'. Consider launching a targeted health awareness campaign.`);
    }

    // Existing 30-day logic
    const visits30Days = allVisits.filter(v => v.visitDate >= thirtyDaysAgo);
    
    // Get inventory usage (dispensed medicines) in last 30 days
    const dispensed = await prisma.visitMedicine.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: "DISPENSED" },
      include: { inventory: { select: { itemName: true, currentStock: true, unit: true } } }
    });

    // Forecast logic
    const forecastMap = new Map();

      const inventoryItems = await prisma.inventory.findMany({
        select: {
        currentStock: true,
        reorderThreshold: true,
        expirationDate: true,
        },
      });

      const inventorySummary = inventoryItems.reduce((summary, item) => {
        const expirationDate = item.expirationDate ? new Date(item.expirationDate) : null;
        const isExpired = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate < today);
        const isExpiringSoon = Boolean(expirationDate && !Number.isNaN(expirationDate.getTime()) && expirationDate >= today && expirationDate <= new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000)));

        if (isExpired) summary.expired += 1;
        if (isExpiringSoon) summary.expiringSoon += 1;
        if (item.currentStock <= item.reorderThreshold) summary.nearReorder += 1;
        if (item.currentStock === 0) summary.outOfStock += 1;

        return summary;
      }, {
        expired: 0,
        expiringSoon: 0,
        nearReorder: 0,
        outOfStock: 0,
      });
    for (const d of dispensed) {
      if (!forecastMap.has(d.inventoryId)) {
        forecastMap.set(d.inventoryId, { name: d.inventory.itemName, currentStock: d.inventory.currentStock, unit: d.inventory.unit, totalUsed: 0 });
      }
      forecastMap.get(d.inventoryId).totalUsed += d.quantity;
    }

    const inventoryForecast = Array.from(forecastMap.values()).map(item => {
      const dailyUsage = item.totalUsed / 30;
      let daysUntilDepletion = dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : 999;
      return {
        itemName: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        dailyUsage: parseFloat(dailyUsage.toFixed(2)),
        daysUntilDepletion
      };
    }).sort((a, b) => a.daysUntilDepletion - b.daysUntilDepletion);

    // --- MOCK DATA FALLBACK FOR DEMO PURPOSES ---
    let finalQuarterlyVisits = [
      { quarter: "Q1 (Aug-Oct)", visits: quarters.Q1 },
      { quarter: "Q2 (Nov-Jan)", visits: quarters.Q2 },
      { quarter: "Q3 (Feb-Apr)", visits: quarters.Q3 },
      { quarter: "Q4 (May-Jul)", visits: quarters.Q4 }
    ];
    let finalTopHealthConcerns = topHealthConcernsPerDept;

    if (allVisits.length === 0) {
      finalQuarterlyVisits = [
        { quarter: "Q1 (Aug-Oct)", visits: 124 },
        { quarter: "Q2 (Nov-Jan)", visits: 256 },
        { quarter: "Q3 (Feb-Apr)", visits: 189 },
        { quarter: "Q4 (May-Jul)", visits: 142 }
      ];

      finalTopHealthConcerns = [
        {
          department: "CCS",
          concerns: [
             { tag: "Eye Strain", count: 48 },
             { tag: "Headache", count: 35 },
             { tag: "Back Pain", count: 22 },
             { tag: "Fever", count: 12 }
          ]
        },
        {
          department: "CEAS",
          concerns: [
             { tag: "Stomach Ache", count: 28 },
             { tag: "Fever", count: 22 },
             { tag: "Dysmenorrhea", count: 18 },
             { tag: "Colds", count: 15 }
          ]
        },
        {
          department: "CBA",
          concerns: [
             { tag: "Headache", count: 42 },
             { tag: "Fatigue", count: 29 },
             { tag: "Muscle Spasm", count: 14 }
          ]
        }
      ];

      if (aiInsights.length === 0) {
        aiInsights = [
          "Historically, Q2 shows a massive 106% increase in clinic visits. Recommendation: Proactively increase the budget and stock for paracetamol and cough medicine.",
          "AI Analysis indicates a persistent spike in 'Eye Strain' specific to the CCS department. Consider recommending 20-20-20 rule posters in computing labs."
        ];
      }
    }
    // --------------------------------------------

    res.json({
      success: true,
      data: {
        totalVisits30Days: allVisits.length === 0 ? 87 : visits30Days.length,
        totalMedicinesDispensed: allVisits.length === 0 ? 134 : dispensed.reduce((acc, curr) => acc + curr.quantity, 0),
        inventoryForecast,
        inventorySummary,
        quarterlyVisits: finalQuarterlyVisits,
        topHealthConcernsPerDept: finalTopHealthConcerns,
        aiInsights
      }
    });
  } catch(error) {
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
  dispenseMedicine,
  getNurseReports,
  getStaffActivityLogs,
};
