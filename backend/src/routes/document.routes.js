const express = require("express");
const router = express.Router();
const {
	upload,
	uploadDocument,
	getStudentDocuments,
	downloadDocument,
} = require("../controllers/document.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Clinic Staff: Upload file (notice we insert upload.single("file") as middleware)
router.post("/upload", protect, authorize("CLINIC_STAFF"), upload.single("file"), uploadDocument);

// Staff/Admin and owning student: download a specific medical document
router.get("/file/:documentId", protect, downloadDocument);

// Staff or Student: View files
router.get("/:studentId", protect, getStudentDocuments);

module.exports = router;