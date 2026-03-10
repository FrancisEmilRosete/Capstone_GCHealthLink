const express = require("express");
const router = express.Router();
const { getPeakHours } = require("../controllers/analytics.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Admin & Clinic Staff ONLY: View Analytics
router.get("/peak-hours", protect, authorize("ADMIN", "CLINIC_STAFF"), getPeakHours);

module.exports = router;