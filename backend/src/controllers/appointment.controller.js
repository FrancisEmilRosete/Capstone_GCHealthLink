const { PrismaClient } = require("@prisma/client");
const { decryptStringSafe } = require("../utils/encryption.util");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();
const ALLOWED_APPOINTMENT_STATUSES = new Set(["WAITING", "PENDING", "IN_PROGRESS", "FOR_DISPENSING", "COMPLETED", "CANCELLED"]);
const SETTINGS_FILE = path.join(__dirname, "../../exports/settings-store.json");
const SETTINGS_LOCK_FILE = `${SETTINGS_FILE}.lock`;
const SETTINGS_LOCK_MAX_WAIT_MS = Number(process.env.SETTINGS_LOCK_MAX_WAIT_MS || 3000);
const SETTINGS_LOCK_RETRY_MS = Number(process.env.SETTINGS_LOCK_RETRY_MS || 40);
const SERVICE_TYPE_OPTIONS = [
  "Medical Consultation",
  "Dental Check-up",
  "Medical Clearance",
];
const MEDICAL_SERVICE_TYPES = new Set(["Medical Consultation", "Medical Clearance"]);
const DENTAL_SERVICE_TYPES = new Set(["Dental Check-up"]);
const DEFAULT_WEEKDAY_AVAILABILITY = new Set([1, 2, 3, 4, 5]);
const DEFAULT_SLOT_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00",
];

function ensureSettingsDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withSettingsLock(handler) {
  ensureSettingsDir();

  const startedAt = Date.now();
  let lockFd = null;

  while (Date.now() - startedAt <= SETTINGS_LOCK_MAX_WAIT_MS) {
    try {
      lockFd = fs.openSync(SETTINGS_LOCK_FILE, "wx");
      break;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      await sleep(SETTINGS_LOCK_RETRY_MS);
    }
  }

  if (lockFd === null) {
    const lockError = new Error("Settings store is busy. Please retry.");
    lockError.status = 503;
    throw lockError;
  }

  try {
    return await handler();
  } finally {
    try {
      fs.closeSync(lockFd);
    } catch {
      // Ignore close errors so lock cleanup can continue.
    }

    try {
      if (fs.existsSync(SETTINGS_LOCK_FILE)) {
        fs.unlinkSync(SETTINGS_LOCK_FILE);
      }
    } catch {
      // Ignore cleanup errors because lock timeout still protects availability.
    }
  }
}

function normalizeScope(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "medical") return "medical";
  if (normalized === "dental") return "dental";
  return null;
}

function getScopeForServiceType(serviceType) {
  if (MEDICAL_SERVICE_TYPES.has(serviceType)) return "medical";
  if (DENTAL_SERVICE_TYPES.has(serviceType)) return "dental";
  return "medical";
}

function normalizeDateKey(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return trimmed;
}

function normalizeTimeValue(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null;

  const [hourText, minuteText] = trimmed.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 7 || hour > 19) return null;
  if (hour === 19 && minute > 0) return null;
  if (minute !== 0 && minute !== 30) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function defaultScopeAvailability() {
  return { byDate: {} };
}

function defaultAppointmentAvailability() {
  return {
    medical: defaultScopeAvailability(),
    dental: defaultScopeAvailability(),
  };
}

function loadSettingsStoreRaw() {
  ensureSettingsDir();

  if (!fs.existsSync(SETTINGS_FILE)) {
    return {
      clinic: {},
      notifications: {},
      staffPreferences: {},
      appointmentAvailability: defaultAppointmentAvailability(),
    };
  }

  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? parsed
      : {
        clinic: {},
        notifications: {},
        staffPreferences: {},
        appointmentAvailability: defaultAppointmentAvailability(),
      };
  } catch {
    return {
      clinic: {},
      notifications: {},
      staffPreferences: {},
      appointmentAvailability: defaultAppointmentAvailability(),
    };
  }
}

function saveSettingsStoreRaw(settings) {
  ensureSettingsDir();
  const tempFilePath = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFilePath, JSON.stringify(settings, null, 2), "utf8");

  try {
    fs.renameSync(tempFilePath, SETTINGS_FILE);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES" && error.code !== "EXDEV") {
      throw error;
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

function getAppointmentAvailabilityConfig(settings) {
  const config = settings?.appointmentAvailability || {};

  return {
    medical: {
      byDate: config?.medical?.byDate && typeof config.medical.byDate === "object"
        ? config.medical.byDate
        : {},
    },
    dental: {
      byDate: config?.dental?.byDate && typeof config.dental.byDate === "object"
        ? config.dental.byDate
        : {},
    },
  };
}

function getSlotsForScopeDate(config, scope, dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const scopeConfig = config?.[scope] || {};
  const byDate = scopeConfig?.byDate || {};
  const override = byDate[dateKey];

  if (override && typeof override === "object") {
    if (override.enabled === false) {
      return [];
    }

    if (Array.isArray(override.slots)) {
      const normalized = [...new Set(override.slots.map((slot) => normalizeTimeValue(slot)).filter(Boolean))].sort();
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }

  const weekday = date.getDay();
  if (!DEFAULT_WEEKDAY_AVAILABILITY.has(weekday)) {
    return [];
  }

  return [...DEFAULT_SLOT_OPTIONS];
}

function getServiceTypesForScope(scope) {
  return scope === "dental"
    ? [...DENTAL_SERVICE_TYPES]
    : [...MEDICAL_SERVICE_TYPES];
}

function canManageScope(req, scope) {
  const allowedServiceTypes = resolveAllowedServiceTypes(req);
  if (scope === "dental") {
    return allowedServiceTypes.some((serviceType) => DENTAL_SERVICE_TYPES.has(serviceType));
  }

  return allowedServiceTypes.some((serviceType) => MEDICAL_SERVICE_TYPES.has(serviceType));
}

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

    // Operating Hours Validation (07:00 to 19:00)
    const timeMatch = normalizedPreferredTime.match(/^(\d{2}):(\d{2})$/);
    if (!timeMatch) {
      return res.status(400).json({ success: false, message: "preferredTime must be in HH:MM format." });
    }
    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const minutesSinceMidnight = (hour * 60) + minute;
    const openingMinutes = 7 * 60;
    const closingMinutes = 19 * 60;
    if (minutesSinceMidnight < openingMinutes || minutesSinceMidnight > closingMinutes) {
      return res.status(400).json({ 
        success: false, 
        message: "Clinic operating hours are from 07:00 AM to 07:00 PM. Please select a valid time." 
      });
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
    const requestedDateKey = `${requestedDate.getFullYear()}-${String(requestedDate.getMonth() + 1).padStart(2, "0")}-${String(requestedDate.getDate()).padStart(2, "0")}`;
    const requestedDateTime = new Date(`${requestedDateKey}T${normalizedPreferredTime}:00`);

    if (Number.isNaN(requestedDateTime.getTime())) {
      return res.status(400).json({ success: false, message: "preferredDate and preferredTime combination is invalid." });
    }

    if (requestedDateTime.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "Preferred appointment date/time must be in the future." });
    }

    const settings = loadSettingsStoreRaw();
    const availabilityConfig = getAppointmentAvailabilityConfig(settings);
    const scope = getScopeForServiceType(resolvedServiceType);
    const allowedSlots = getSlotsForScopeDate(availabilityConfig, scope, requestedDateKey);

    if (!allowedSlots.includes(normalizedPreferredTime)) {
      return res.status(400).json({
        success: false,
        message: `${scope === "dental" ? "Dentist" : "Doctor"} is not available on the selected date/time.`,
      });
    }

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
        message: "Invalid status filter. Allowed values: WAITING, PENDING, IN_PROGRESS, FOR_DISPENSING, COMPLETED, CANCELLED.",
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

    const studentProfileIds = [...new Set(queue.map((entry) => entry.studentProfileId).filter(Boolean))];
    const latestVisits = studentProfileIds.length
      ? await prisma.clinicVisit.findMany({
        where: {
          studentProfileId: { in: studentProfileIds },
          dispensedMedicines: {
            some: {
              status: "PRESCRIBED",
            },
          },
        },
        orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
        include: {
          dispensedMedicines: {
            where: { status: "PRESCRIBED" },
            include: {
              inventory: {
                select: {
                  id: true,
                  itemName: true,
                  unit: true,
                  currentStock: true,
                },
              },
            },
          },
        },
      })
      : [];

    const latestVisitByStudentId = new Map();
    for (const visit of latestVisits) {
      if (!latestVisitByStudentId.has(visit.studentProfileId)) {
        latestVisitByStudentId.set(visit.studentProfileId, visit);
      }
    }

    const queueWithSafeHistory = queue.map((entry) => {
      const parsedService = parseServiceTypeFromSymptoms(entry.symptoms);
      const resolvedService = normalizeServiceType(entry.serviceType) || parsedService || "Medical Consultation";
      const latestVisit = latestVisitByStudentId.get(entry.studentProfileId);
      const pendingMedicines = (latestVisit?.dispensedMedicines || []).map((medicine) => ({
        id: medicine.id,
        quantity: medicine.quantity,
        status: medicine.status,
        inventoryId: medicine.inventoryId,
        inventory: medicine.inventory,
      }));

      return {
        ...entry,
        serviceType: resolvedService,
        symptoms: stripServicePrefix(entry.symptoms, parsedService || resolvedService),
        pendingMedicines,
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
        message: "Invalid status. Allowed values: WAITING, PENDING, IN_PROGRESS, FOR_DISPENSING, COMPLETED, CANCELLED.",
      });
    }

    const allowedServiceTypes = resolveAllowedServiceTypes(req);
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        serviceType: true,
        preferredDate: true,
        preferredTime: true,
        studentProfileId: true,
      },
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

    req.auditLog = {
      targetId: appointment.id,
      metadata: {
        entityType: "appointment",
        appointmentId: appointment.id,
        studentProfileId: appointment.studentProfileId,
        serviceType: normalizedAppointmentServiceType,
        preferredDate: appointment.preferredDate,
        preferredTime: appointment.preferredTime,
        changes: {
          status: {
            from: appointment.status,
            to: status,
          },
        },
      },
    };

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

    // Operating Hours Validation (07:00 to 19:00)
    const timeMatch2 = normalizedPreferredTime.match(/^(\d{2}):(\d{2})$/);
    if (!timeMatch2) {
      return res.status(400).json({ success: false, message: "preferredTime must be in HH:MM format." });
    }
    const hour2 = parseInt(timeMatch2[1], 10);
    const minute2 = parseInt(timeMatch2[2], 10);
    const minutesSinceMidnight2 = (hour2 * 60) + minute2;
    const openingMinutes2 = 7 * 60;
    const closingMinutes2 = 19 * 60;
    if (minutesSinceMidnight2 < openingMinutes2 || minutesSinceMidnight2 > closingMinutes2) {
      return res.status(400).json({ 
        success: false, 
        message: "Clinic operating hours are from 07:00 AM to 07:00 PM. Please select a valid time." 
      });
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

    req.auditLog = {
      targetId: appointment.id,
      metadata: {
        entityType: "appointment",
        appointmentId: appointment.id,
        studentProfileId: normalizedStudentProfileId,
        serviceType: normalizedProvidedServiceType,
        preferredDate: parsedPreferredDate,
        preferredTime: normalizedPreferredTime,
        changes: {
          status: {
            from: null,
            to: "WAITING",
          },
        },
      },
    };

    res.status(201).json({
      success: true,
      message: "Appointment added to queue.",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentAvailability = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Valid month and year are required." });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const rawServiceType = typeof req.query?.serviceType === "string" ? req.query.serviceType.trim() : "";
    const normalizedServiceType = normalizeServiceType(rawServiceType);
    const scope = normalizedServiceType ? getScopeForServiceType(normalizedServiceType) : "medical";
    const serviceTypes = normalizedServiceType ? [normalizedServiceType] : getServiceTypesForScope(scope);

    const appointments = await prisma.appointment.groupBy({
      by: ['preferredDate'],
      where: {
        preferredDate: {
          gte: startDate,
          lt: endDate,
        },
        status: { in: ['WAITING', 'PENDING', 'IN_PROGRESS', 'FOR_DISPENSING'] },
        serviceType: { in: serviceTypes },
      },
      _count: {
        id: true,
      },
    });

    const settings = loadSettingsStoreRaw();
    const availabilityConfig = getAppointmentAvailabilityConfig(settings);
    const counts = {};
    const dayAvailability = {};
    for (const appt of appointments) {
      const date = appt.preferredDate;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      counts[key] = appt._count.id;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const slots = getSlotsForScopeDate(availabilityConfig, scope, dateKey);
      dayAvailability[dateKey] = {
        isAvailable: slots.length > 0,
        slots,
      };
    }

    res.json({
      success: true,
      data: {
        counts,
        dayAvailability,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentAvailabilityConfigByScope = async (req, res, next) => {
  try {
    const scope = normalizeScope(req.query?.scope);
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (!scope) {
      return res.status(400).json({ success: false, message: "scope is required (medical or dental)." });
    }

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Valid month and year are required." });
    }

    if (!canManageScope(req, scope)) {
      return res.status(403).json({ success: false, message: "You are not authorized to manage this availability calendar." });
    }

    const settings = loadSettingsStoreRaw();
    const config = getAppointmentAvailabilityConfig(settings);
    const days = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const slots = getSlotsForScopeDate(config, scope, dateKey);
      const override = config?.[scope]?.byDate?.[dateKey] || null;

      days[dateKey] = {
        isAvailable: slots.length > 0,
        slots,
        isOverride: !!override,
      };
    }

    return res.json({
      success: true,
      data: {
        scope,
        month,
        year,
        days,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateAppointmentAvailabilityConfigByScope = async (req, res, next) => {
  try {
    const scope = normalizeScope(req.body?.scope);
    const date = normalizeDateKey(req.body?.date);
    const useDefault = req.body?.useDefault === true;
    const enabled = req.body?.enabled !== false;

    if (!scope) {
      return res.status(400).json({ success: false, message: "scope is required (medical or dental)." });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: "date is required and must be YYYY-MM-DD." });
    }

    if (!canManageScope(req, scope)) {
      return res.status(403).json({ success: false, message: "You are not authorized to manage this availability calendar." });
    }

    const rawSlots = Array.isArray(req.body?.slots) ? req.body.slots : [];
    const normalizedSlots = [...new Set(rawSlots.map((slot) => normalizeTimeValue(slot)).filter(Boolean))].sort();

    if (!useDefault && enabled && normalizedSlots.length === 0) {
      return res.status(400).json({ success: false, message: "At least one valid slot is required when availability is enabled." });
    }

    const settings = await withSettingsLock(async () => {
      const current = loadSettingsStoreRaw();
      const config = getAppointmentAvailabilityConfig(current);

      if (!config[scope] || typeof config[scope] !== "object") {
        config[scope] = defaultScopeAvailability();
      }

      if (!config[scope].byDate || typeof config[scope].byDate !== "object") {
        config[scope].byDate = {};
      }

      if (useDefault) {
        delete config[scope].byDate[date];
      } else {
        config[scope].byDate[date] = {
          enabled,
          slots: enabled ? normalizedSlots : [],
        };
      }

      current.appointmentAvailability = config;
      saveSettingsStoreRaw(current);
      return current;
    });

    const config = getAppointmentAvailabilityConfig(settings);
    const resolvedSlots = getSlotsForScopeDate(config, scope, date);

    return res.json({
      success: true,
      message: "Availability calendar updated.",
      data: {
        scope,
        date,
        isAvailable: resolvedSlots.length > 0,
        slots: resolvedSlots,
        isOverride: !useDefault,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  bookAppointment,
  getLiveQueue,
  updateAppointmentStatus,
  createQueueAppointment,
  getAppointmentAvailability,
  getAppointmentAvailabilityConfigByScope,
  updateAppointmentAvailabilityConfigByScope,
};
