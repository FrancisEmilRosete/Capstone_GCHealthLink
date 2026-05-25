const express = require("express");
const { getAuditLogs } = require("../controllers/audit.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

const router = express.Router();

router.use(protect);
// ADMIN, CLINIC, DENTAL roles can access. CLINIC_STAFF covers both Nurse and Dentist sub-types.
router.use(authorize("ADMIN", "CLINIC", "DENTAL", "CLINIC_STAFF"));

router.get("/", getAuditLogs);

module.exports = router;
