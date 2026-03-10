const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

async function resolveStudentProfile(identifier) {
  if (!identifier) {
    return null;
  }

  return prisma.studentProfile.findFirst({
    where: {
      OR: [
        { id: identifier },
        { studentNumber: identifier },
      ],
    },
    select: {
      id: true,
      studentNumber: true,
      firstName: true,
      lastName: true,
      courseDept: true,
    },
  });
}

function readMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata;
}

function mapAuditLogToCertificate(log) {
  const metadata = readMetadata(log.metadata);
  return {
    id: metadata.certificateId || log.id,
    studentProfileId: metadata.studentProfileId || "",
    studentId: metadata.studentNumber || "",
    student: metadata.studentName || "Unknown Student",
    course: metadata.courseDept || "",
    dateIso: metadata.dateIssued || log.timestamp,
    reason: metadata.reason || "",
    remarks: metadata.remarks || "",
    issuedBy: metadata.issuedBy || log.user?.email || "Clinic Staff",
  };
}

const listCertificates = async (req, res, next) => {
  try {
    const query = normalizeText(req.query.q).toLowerCase();

    const logs = await prisma.auditLog.findMany({
      where: {
        action: "ISSUED_MED_CERTIFICATE",
      },
      orderBy: {
        timestamp: "desc",
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const certificates = logs
      .map(mapAuditLogToCertificate)
      .filter((certificate) => {
        if (!query) return true;

        return (
          certificate.student.toLowerCase().includes(query)
          || certificate.studentId.toLowerCase().includes(query)
          || certificate.reason.toLowerCase().includes(query)
        );
      });

    return res.json({
      success: true,
      message: "Certificates retrieved successfully.",
      data: certificates,
    });
  } catch (error) {
    return next(error);
  }
};

const issueCertificate = async (req, res, next) => {
  try {
    const studentIdentifier = normalizeText(
      req.body?.studentProfileId || req.body?.studentId || req.body?.studentIdentifier
    );
    const reason = normalizeText(req.body?.reason);
    const remarks = normalizeText(req.body?.remarks);
    const issuedBy = normalizeText(req.body?.issuedBy) || req.user.email || "Clinic Staff";
    const dateIssued = parseDate(req.body?.dateIso || req.body?.dateIssued);

    if (!studentIdentifier) {
      return res.status(400).json({ success: false, message: "studentId or studentProfileId is required." });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "reason is required." });
    }

    if (reason.length > 200) {
      return res.status(400).json({ success: false, message: "reason must be 200 characters or fewer." });
    }

    if (remarks.length > 1000) {
      return res.status(400).json({ success: false, message: "remarks must be 1000 characters or fewer." });
    }

    if (!dateIssued) {
      return res.status(400).json({ success: false, message: "dateIssued must be a valid date." });
    }

    const student = await resolveStudentProfile(studentIdentifier);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const certificateId = `CERT-${Date.now()}`;
    const studentName = `${student.firstName} ${student.lastName}`;

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "ISSUED_MED_CERTIFICATE",
        targetId: student.id,
        ipAddress: req.ip,
        metadata: {
          certificateId,
          studentProfileId: student.id,
          studentNumber: student.studentNumber,
          studentName,
          courseDept: student.courseDept,
          reason,
          remarks,
          issuedBy,
          dateIssued: dateIssued.toISOString(),
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Medical certificate issued successfully.",
      data: mapAuditLogToCertificate(auditLog),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listCertificates,
  issueCertificate,
};
