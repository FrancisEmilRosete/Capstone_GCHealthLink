const { PrismaClient } = require("@prisma/client");
const { decryptStringSafe } = require("../utils/encryption.util");
const prisma = new PrismaClient();
const ALLOWED_APPOINTMENT_STATUSES = new Set(["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

function parseValidDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    const { preferredDate, preferredTime, symptoms } = req.body;
    const userId = req.user.userId; // From the auth token
    const parsedPreferredDate = parseValidDate(preferredDate);
    const normalizedPreferredTime = typeof preferredTime === "string" ? preferredTime.trim() : "";
    const normalizedSymptoms = typeof symptoms === "string" ? symptoms.trim() : "";

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

    if (!normalizedSymptoms) {
      return res.status(400).json({ success: false, message: "symptoms are required." });
    }

    if (normalizedSymptoms.length > 1000) {
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
        symptoms: normalizedSymptoms,
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

    const queue = await prisma.appointment.findMany({
      where: {
        status: "WAITING",
        preferredDate: { gte: startOfDay }
      },
      orderBy: { createdAt: 'asc' }, // Oldest requests first (First in, first out)
      include: {
        studentProfile: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            courseDept: true,
            medicalHistory: true // Instantly pull history so nurse can see risks
          }
        }
      }
    });

    const queueWithSafeHistory = queue.map((entry) => ({
      ...entry,
      studentProfile: {
        ...entry.studentProfile,
        medicalHistory: decryptMedicalHistory(entry.studentProfile?.medicalHistory || null),
      },
    }));

    res.json({
      success: true,
      message: "Live patient queue retrieved",
      data: queueWithSafeHistory
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
        message: "Invalid status. Allowed values: WAITING, IN_PROGRESS, COMPLETED, CANCELLED.",
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
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }
    next(error);
  }
};

module.exports = { bookAppointment, getLiveQueue, updateAppointmentStatus };