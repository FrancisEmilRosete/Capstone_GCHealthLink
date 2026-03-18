const { prisma } = require("../lib/prisma");
const { sendEmergencySms } = require("../utils/sms.service");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

const sendEmergencySmsToGuardian = async (req, res, next) => {
  try {
    const studentProfileId = normalizeText(req.body?.studentProfileId);

    if (!studentProfileId) {
      return res.status(400).json({
        success: false,
        message: "studentProfileId is required.",
      });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        emergencyContactTelNumber: true,
      },
    });

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    const emergencyContactTelNumber = normalizeText(studentProfile.emergencyContactTelNumber);
    if (!emergencyContactTelNumber) {
      return res.status(400).json({
        success: false,
        message: "No emergency contact number is on file for this student.",
      });
    }

    const studentName = `${studentProfile.firstName} ${studentProfile.lastName}`.trim();
    const smsResult = await sendEmergencySms({
      to: emergencyContactTelNumber,
      studentName,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "SENT_EMERGENCY_SMS",
        targetId: studentProfile.id,
        ipAddress: resolveClientIp(req),
        metadata: {
          studentProfileId: studentProfile.id,
          studentName,
          recipientTelNumber: smsResult.to,
          messageSid: smsResult.sid,
          twilioStatus: smsResult.status,
          triggeredByRole: req.user.role,
          method: req.method,
          path: req.originalUrl,
        },
      },
    });

    return res.json({
      success: true,
      message: "Emergency SMS has been sent to the guardian.",
      data: {
        studentProfileId: studentProfile.id,
        recipientTelNumber: smsResult.to,
        messageSid: smsResult.sid,
        status: smsResult.status,
      },
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

module.exports = {
  sendEmergencySmsToGuardian,
};