const { PrismaClient } = require("@prisma/client");
const { decryptStringSafe } = require("../utils/encryption.util");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");
const prisma = new PrismaClient();
const ALLOWED_APPOINTMENT_STATUSES = new Set(["WAITING", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const SERVICE_TYPE_OPTIONS = [
  "Medical Consultation",
  "Dental Check-up",
  "Medical Clearance",
];

function resolveAllowedServiceTypes(req) {
  const clinicStaffType = typeof req.user?.clinicStaffType === "string"
    ? req.user.clinicStaffType.trim().toUpperCase()
    : "";

  if (clinicStaffType === "DENTIST" || clinicStaffType === "DENTAL") {
    return ["Dental Check-up"];
  }

  return ["Medical Consultation", "Medical Clearance"];
}

function parseValidDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeServiceType(value) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return SERVICE_TYPE_OPTIONS.find((option) => option.toLowerCase() === normalized) || null;
}

function parseServiceTypeFromSymptoms(symptoms) {
  if (!symptoms) return null;
  const match = symptoms.trim().match(/^\[([^\]]+)\]\s*/);
  if (!match) return null;
  return normalizeServiceType(match[1]);
}

function stripServicePrefix(symptoms, serviceType) {
  if (!symptoms || !serviceType) return symptoms || "";
  const escaped = serviceType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return symptoms.replace(new RegExp(`^\\[${escaped}\\]\\s*`, "i"), "").trim();
}

function decryptMedicalHistory(history) {
  if (!history) return history;

  return {
    ...history,
    asthmaEnc: decryptStringSafe(history.asthmaEnc),
    diabetesEnc: decryptStringSafe(history.diabetesEnc),
    allergyEnc: decryptStringSafe(history.allergyEnc),
  };
}

// ==========================================
// 1. STUDENT VIEW: Book an Appointment
// ==========================================
const bookAppointment = async (req, res, next) => {
  try {
    const { preferredDate, preferredTime, symptoms, serviceType } = req.body;
    const userId = req.user.userId; // From the auth token
    const parsedPreferredDate = parseValidDate(preferredDate);
    const normalizedPreferredTime = typeof preferredTime === "string" ? preferredTime.trim() : "";
    const normalizedSymptoms = typeof symptoms === "string" ? symptoms.trim() : "";
    const providedServiceType = typeof serviceType === "string" ? serviceType.trim() : "";
    const normalizedProvidedServiceType = normalizeServiceType(providedServiceType);
    const parsedServiceType = parseServiceTypeFromSymptoms(normalizedSymptoms);

    if (!parsedPreferredDate) {
      return res.status(400).json({ success: false, message: "preferredDate must be a valid date." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestedDate = new Date(parsedPreferredDate);
    requestedDate.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(400).json({ success: false, message: "preferredDate cannot be in the past." });
    }

    if (!normalizedPreferredTime) {
      return res.status(400).json({ success: false, message: "preferredTime is required." });
    }

    if (providedServiceType && !normalizedProvidedServiceType) {
      return res.status(400).json({
        success: false,
        message: "Invalid serviceType. Allowed values: Medical Consultation, Dental Check-up, Medical Clearance.",
      });
    }

    if (normalizedProvidedServiceType && parsedServiceType && normalizedProvidedServiceType !== parsedServiceType) {
      return res.status(400).json({
        success: false,
        message: "serviceType does not match the type inferred from symptoms.",
      });
    }

    const resolvedServiceType = normalizedProvidedServiceType || parsedServiceType || "Medical Consultation";
    const cleanedSymptoms = stripServicePrefix(normalizedSymptoms, parsedServiceType || resolvedServiceType);

    if (!cleanedSymptoms) {
      return res.status(400).json({ success: false, message: "symptoms are required." });
    }

    if (cleanedSymptoms.length > 1000) {
      return res.status(400).json({ success: false, message: "symptoms must be 1000 characters or fewer." });
    }

    // Find the student's profile ID
    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    });

    if (!student || !student.studentProfile) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    // Create the appointment in the queue
    const appointment = await prisma.appointment.create({
      data: {
        studentProfileId: student.studentProfile.id,
        preferredDate: parsedPreferredDate,
        preferredTime: normalizedPreferredTime,
        serviceType: resolvedServiceType,
        symptoms: cleanedSymptoms,
      },
    });

    res.status(201).json({
      success: true,
      message: "Consultation requested successfully. You are now in the queue.",
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CLINIC VIEW: Get the Live Patient Queue
// ==========================================
const getLiveQueue = async (req, res, next) => {
  try {
    // Fetch all appointments that are currently "WAITING" for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 200,
      maxLimit: 500,
    });
    const rawServiceType = typeof req.query?.serviceType === "string" ? req.query.serviceType.trim() : "";
    const normalizedServiceType = normalizeServiceType(rawServiceType);
    const rawStatusFilter = typeof req.query?.status === "string" ? req.query.status.trim() : "";
    const requestedStatuses = rawStatusFilter
      ? rawStatusFilter
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
      : ["WAITING"];
    const allowedServiceTypes = resolveAllowedServiceTypes(req);

    if (requestedStatuses.some((status) => !ALLOWED_APPOINTMENT_STATUSES.has(status))) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter. Allowed values: WAITING, PENDING, IN_PROGRESS, COMPLETED, CANCELLED.",
      });
    }

    if (rawServiceType && !normalizedServiceType) {
      return res.status(400).json({
        success: false,
        message: "Invalid serviceType filter. Allowed values: Medical Consultation, Dental Check-up, Medical Clearance.",
      });
    }

    if (normalizedServiceType && !allowedServiceTypes.includes(normalizedServiceType)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view that service queue.",
      });
    }

    const whereClause = {
      status: requestedStatuses.length === 1 ? requestedStatuses[0] : { in: requestedStatuses },
      preferredDate: { gte: startOfDay },
      serviceType: { in: allowedServiceTypes },
    };

    if (normalizedServiceType) {
      whereClause.serviceType = normalizedServiceType;
    }

    const [queue, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' }, // Oldest requests first (First in, first out)
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
              course: true,
              yearLevel: true,
              age: true,
              sex: true,
              medicalHistory: true // Instantly pull history so nurse can see risks
            }
          }
        }
      }),
      prisma.appointment.count({ where: whereClause }),
    ]);

    const queueWithSafeHistory = queue.map((entry) => {
      const parsedService = parseServiceTypeFromSymptoms(entry.symptoms);
      const resolvedService = normalizeServiceType(entry.serviceType) || parsedService || "Medical Consultation";

      return {
        ...entry,
        serviceType: resolvedService,
        symptoms: stripServicePrefix(entry.symptoms, parsedService || resolvedService),
        studentProfile: {
          ...entry.studentProfile,
          medicalHistory: decryptMedicalHistory(entry.studentProfile?.medicalHistory || null),
        },
      };
    });

    const filteredQueue = normalizedServiceType
      ? queueWithSafeHistory.filter((entry) => entry.serviceType === normalizedServiceType)
      : queueWithSafeHistory;

    res.json({
      success: true,
      message: "Live patient queue retrieved",
      data: filteredQueue,
      pagination: buildPaginationMeta({ page, limit, total: normalizedServiceType ? filteredQueue.length : total }),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. CLINIC VIEW: Update Queue Status
// ==========================================
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointmentId = typeof req.params.appointmentId === "string" ? req.params.appointmentId.trim() : "";
    const rawStatus = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    const status = rawStatus.toUpperCase();

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId is required." });
    }

    if (!status || !ALLOWED_APPOINTMENT_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: WAITING, PENDING, IN_PROGRESS, COMPLETED, CANCELLED.",
      });
    }

    const allowedServiceTypes = resolveAllowedServiceTypes(req);
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, serviceType: true },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    const normalizedAppointmentServiceType = normalizeServiceType(appointment.serviceType) || "Medical Consultation";
    if (!allowedServiceTypes.includes(normalizedAppointmentServiceType)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this service queue item.",
      });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const createQueueAppointment = async (req, res, next) => {
  try {
    const {
      studentProfileId,
      preferredDate,
      preferredTime,
      symptoms,
      serviceType,
    } = req.body;

    const normalizedStudentProfileId = typeof studentProfileId === "string" ? studentProfileId.trim() : "";
    const parsedPreferredDate = parseValidDate(preferredDate);
    const normalizedPreferredTime = typeof preferredTime === "string" ? preferredTime.trim() : "";
    const normalizedSymptoms = typeof symptoms === "string" ? symptoms.trim() : "";
    const normalizedProvidedServiceType = normalizeServiceType(typeof serviceType === "string" ? serviceType.trim() : "") || "Medical Consultation";

    if (!normalizedStudentProfileId) {
      return res.status(400).json({ success: false, message: "studentProfileId is required." });
    }

    if (!parsedPreferredDate) {
      return res.status(400).json({ success: false, message: "preferredDate must be a valid date." });
    }

    if (!normalizedPreferredTime) {
      return res.status(400).json({ success: false, message: "preferredTime is required." });
    }

    if (!normalizedSymptoms) {
      return res.status(400).json({ success: false, message: "symptoms are required." });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: normalizedStudentProfileId },
      select: { id: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const allowedServiceTypes = resolveAllowedServiceTypes(req);
    if (!allowedServiceTypes.includes(normalizedProvidedServiceType)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create this service queue item.",
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        studentProfileId: normalizedStudentProfileId,
        preferredDate: parsedPreferredDate,
        preferredTime: normalizedPreferredTime,
        serviceType: normalizedProvidedServiceType,
        symptoms: normalizedSymptoms,
        status: "WAITING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Appointment added to queue.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { bookAppointment, getLiveQueue, updateAppointmentStatus, createQueueAppointment };
