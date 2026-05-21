const { PrismaClient } = require("@prisma/client");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");

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

function mapCertificateToDto(cert) {
  // Map internal enum PHYSICAL_EXAMINATION → frontend value PHYSICAL_EXAM for backward compat
  const certType = cert.certificateType === 'PHYSICAL_EXAMINATION' ? 'PHYSICAL_EXAM' : String(cert.certificateType);
  return {
    id: cert.id,
    studentProfileId: cert.studentProfileId,
    studentId: cert.studentProfile.studentNumber,
    student: `${cert.studentProfile.firstName} ${cert.studentProfile.lastName}`,
    course: cert.studentProfile.courseDept,
    certificateType: certType,
    diagnosisFindings: cert.diagnosisFindings || '',
    recommendationsRemarks: cert.recommendationsRemarks || cert.remarks || '',
    remarks: cert.remarks || '',
    issuedByRole: cert.issuedByRole || 'DOCTOR',
    issuedAt: cert.issuedAt.toISOString(),
    issuedBy: cert.issuedBy.email,
  };
}

const listCertificates = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 50,
      maxLimit: 300,
    });
    const query = normalizeText(req.query.q).toLowerCase();
    const certificateType = normalizeText(req.query.type).toUpperCase();

    const where = {};
    if (query) {
      where.OR = [
        { studentProfile: { studentNumber: { contains: query, mode: 'insensitive' } } },
        { studentProfile: { firstName: { contains: query, mode: 'insensitive' } } },
        { studentProfile: { lastName: { contains: query, mode: 'insensitive' } } },
      ];
    }

    if (certificateType === "CONSULTATION") {
      where.certificateType = "CONSULTATION";
    } else if (certificateType === "PHYSICAL_EXAM") {
      where.certificateType = "PHYSICAL_EXAMINATION";
    }

    const [certs, total] = await prisma.$transaction([
      prisma.medicalCertificate.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
        include: {
          studentProfile: { select: { studentNumber: true, firstName: true, lastName: true, courseDept: true } },
          issuedBy: { select: { email: true } },
        },
      }),
      prisma.medicalCertificate.count({ where }),
    ]);

    return res.json({
      success: true,
      message: "Certificates retrieved successfully.",
      data: certs.map(mapCertificateToDto),
      pagination: buildPaginationMeta({ page, limit, total }),
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
    // Accept both new field names and legacy names for backward compatibility.
    const diagnosisFindings = normalizeText(req.body?.diagnosisFindings || req.body?.reason);
    const recommendationsRemarks = normalizeText(req.body?.recommendationsRemarks || req.body?.remarks);
    const issuedBy = normalizeText(req.body?.issuedBy) || req.user.email || "Clinic Staff";
    const dateIssued = parseDate(req.body?.dateIso || req.body?.dateIssued);

    if (!studentIdentifier) {
      return res.status(400).json({ success: false, message: "studentId or studentProfileId is required." });
    }

    if (!diagnosisFindings) {
      return res.status(400).json({ success: false, message: "diagnosisFindings is required." });
    }

    if (diagnosisFindings.length > 2000) {
      return res.status(400).json({ success: false, message: "diagnosisFindings must be 2000 characters or fewer." });
    }

    if (recommendationsRemarks.length > 2000) {
      return res.status(400).json({ success: false, message: "recommendationsRemarks must be 2000 characters or fewer." });
    }

    if (!dateIssued) {
      return res.status(400).json({ success: false, message: "dateIssued must be a valid date." });
    }

    const student = await resolveStudentProfile(studentIdentifier);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }
    const studentName = `${student.firstName} ${student.lastName}`;

    // Map frontend value PHYSICAL_EXAM → Prisma enum PHYSICAL_EXAMINATION
    const type = req.body?.certificateType === 'PHYSICAL_EXAM' ? 'PHYSICAL_EXAMINATION' : 'CONSULTATION';

    const [cert] = await prisma.$transaction([
      prisma.medicalCertificate.create({
        data: {
          studentProfileId: student.id,
          issuedById: req.user.userId,
          issuedByRole: req.user.clinicStaffType || 'DOCTOR',
          certificateType: type,
          diagnosisFindings,
          recommendationsRemarks,
          remarks: recommendationsRemarks,
          issuedAt: dateIssued,
        },
        include: {
          studentProfile: { select: { studentNumber: true, firstName: true, lastName: true, courseDept: true } },
          issuedBy: { select: { email: true } },
        }
      }),
      prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: "ISSUED_MED_CERTIFICATE",
          targetId: student.id,
          ipAddress: req.ip,
          metadata: {
            studentName,
            certificateType: type,
            diagnosisFindings,
            recommendationsRemarks,
            issuedBy,
            dateIssued: dateIssued.toISOString(),
          },
        }
      })
    ]);

    return res.status(201).json({
      success: true,
      message: "Medical certificate issued successfully.",
      data: mapCertificateToDto(cert),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listCertificates,
  issueCertificate,
};
