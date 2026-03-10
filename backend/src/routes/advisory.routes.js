const express = require("express");
const router = express.Router();
const {
	createAdvisory,
	getAdvisories,
	getNotificationState,
	updateNotificationState,
} = require("../controllers/advisory.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Admin/Clinic Staff ONLY: Create an advisory
router.post("/broadcast", protect, authorize("ADMIN", "CLINIC_STAFF"), createAdvisory);

// ANY Logged-in User (Students): Read advisories
router.get("/", protect, getAdvisories);

// Persisted notification read/dismiss state
router.get("/state", protect, getNotificationState);
router.put("/state", protect, updateNotificationState);

module.exports = router;