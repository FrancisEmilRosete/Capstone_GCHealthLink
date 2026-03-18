const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "../../uploads");
const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_MEDICAL_DOC_SIZE_BYTES || 5 * 1024 * 1024);
const ALLOWED_MIME_TO_EXT = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};
const ALLOWED_DOCUMENT_TYPES = new Set(["PHYSICAL_EXAM", "LAB_RESULT", "MED_CERT", "VACCINATION_RECORD", "OTHER"]);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function getUniqueFileName(extension) {
  const randomPart = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");

  return `${Date.now()}-${randomPart}${extension}`;
}

function normalizeDocumentType(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "PHYSICAL_EXAM";
  }

  return value.trim().toUpperCase();
}

async function canAccessStudentDocuments(req, studentProfileId) {
  if (req.user.role === "STUDENT") {
    const me = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    return !!me && me.id === studentProfileId;
  }

  return req.user.role === "CLINIC_STAFF" || req.user.role === "ADMIN";
}

function toDocumentResponse(document) {
  return {
    ...document,
    fileUrl: `/api/v1/documents/file/${document.id}`,
  };
}

function resolveStoredFilePath(fileUrl) {
  if (typeof fileUrl !== "string" || !fileUrl.trim()) {
    return null;
  }

  const normalizedUploadDir = path.resolve(uploadDir);
  const fileName = path.basename(fileUrl);
  const absolutePath = path.resolve(uploadDir, fileName);

  if (!absolutePath.toLowerCase().startsWith(normalizedUploadDir.toLowerCase())) {
    return null;
  }

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return absolutePath;
}

function normalizeAccessContext(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildDocumentAccessMetadata(req, extra = {}) {
  const headerContext = normalizeAccessContext(req.headers?.["x-access-context"]);
  const bodyContext = normalizeAccessContext(req.body?.accessContext);
  const queryContext = normalizeAccessContext(req.query?.context);

  const defaultContext = req.user?.role === "CLINIC_STAFF"
    ? "STAFF_DMR_ACCESS"
    : "STUDENT_DMR_ACCESS";

  return {
    accessContext: headerContext || bodyContext || queryContext || defaultContext,
    route: req.originalUrl || req.path,
    method: req.method,
    role: req.user?.role || "UNKNOWN",
    ...extra,
  };
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const extension = ALLOWED_MIME_TO_EXT[file.mimetype] || ".bin";
    cb(null, getUniqueFileName(extension));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME_TO_EXT[file.mimetype]) {
      return cb(null, true);
    }

    const error = new Error("Unsupported file type. Allowed types: PDF, JPG, PNG.");
    error.status = 415;
    return cb(error);
  },
});

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const { studentProfileId, documentType } = req.body;
    const normalizedStudentProfileId = typeof studentProfileId === "string" ? studentProfileId.trim() : "";
    const normalizedDocumentType = normalizeDocumentType(documentType);

    if (!normalizedStudentProfileId) {
      return res.status(400).json({ success: false, message: "studentProfileId is required." });
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(normalizedDocumentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid documentType. Allowed values: PHYSICAL_EXAM, LAB_RESULT, MED_CERT, VACCINATION_RECORD, OTHER.",
      });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: normalizedStudentProfileId },
      select: { id: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ success: false, message: "Student profile not found." });
    }

    const newDoc = await prisma.medicalDocument.create({
      data: {
        studentProfileId: normalizedStudentProfileId,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        documentType: normalizedDocumentType,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "UPLOADED_MEDICAL_DOCUMENT",
        targetId: normalizedStudentProfileId,
        ipAddress: req.ip,
        metadata: {
          ...buildDocumentAccessMetadata(req, {
            fileName: req.file.originalname,
            documentType: normalizedDocumentType,
          }),
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Medical document uploaded successfully.",
      data: toDocumentResponse(newDoc),
    });
  } catch (error) {
    next(error);
  }
};

const getStudentDocuments = async (req, res, next) => {
  try {
    const studentId = typeof req.params.studentId === "string" ? req.params.studentId.trim() : "";

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required." });
    }

    const hasAccess = await canAccessStudentDocuments(req, studentId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access these medical documents.",
      });
    }

    const documents = await prisma.medicalDocument.findMany({
      where: { studentProfileId: studentId },
      orderBy: { uploadedAt: "desc" },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "VIEWED_MEDICAL_DOCUMENTS",
        targetId: studentId,
        ipAddress: req.ip,
        metadata: {
          ...buildDocumentAccessMetadata(req, {
            count: documents.length,
          }),
        },
      },
    });

    res.json({
      success: true,
      message: "Medical documents retrieved successfully.",
      data: documents.map(toDocumentResponse),
    });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const documentId = typeof req.params.documentId === "string" ? req.params.documentId.trim() : "";

    if (!documentId) {
      return res.status(400).json({ success: false, message: "documentId is required." });
    }

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ success: false, message: "Medical document not found." });
    }

    const hasAccess = await canAccessStudentDocuments(req, document.studentProfileId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access this medical document.",
      });
    }

    const resolvedPath = resolveStoredFilePath(document.fileUrl);
    if (!resolvedPath) {
      return res.status(404).json({ success: false, message: "Stored file not found." });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "DOWNLOADED_MEDICAL_DOCUMENT",
        targetId: document.studentProfileId,
        ipAddress: req.ip,
        metadata: {
          ...buildDocumentAccessMetadata(req, {
            documentId: document.id,
            fileName: document.fileName,
            documentType: document.documentType,
          }),
        },
      },
    });

    return res.download(resolvedPath, document.fileName);
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, uploadDocument, getStudentDocuments, downloadDocument };