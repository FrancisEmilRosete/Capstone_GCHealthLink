const express = require("express");
const router = express.Router();
const { getPeakHours, getHealthConcernsByDepartment } = require("../controllers/analytics.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Admin & Clinic Staff ONLY: View Analytics
router.get("/peak-hours", protect, authorize("ADMIN", "CLINIC_STAFF"), getPeakHours);

// All authenticated users: health concerns grouped per department
router.get("/health-concerns", protect, getHealthConcernsByDepartment);

module.exports = router;