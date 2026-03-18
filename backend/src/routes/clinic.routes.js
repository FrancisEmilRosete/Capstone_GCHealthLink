const express = require("express");
const router = express.Router();

// Import both functions from the clinic controller
const {
  getStudentByQR,
  getStudentByQrToken,
  recordVisit,
  searchStudents,
  getVisits,
} = require("../controllers/clinic.controller");
const { sendEmergencySmsToGuardian } = require("../controllers/emergency.controller");

// Import our security middleware
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");


// Backward-compatible emergency SMS paths, both routed to Twilio-backed controller.
router.post("/emergency-alert", protect, authorize("CLINIC_STAFF", "ADMIN"), sendEmergencySmsToGuardian);
router.post("/emergency/send-sms", protect, authorize("CLINIC_STAFF", "ADMIN"), sendEmergencySmsToGuardian);

router.get(
  "/search",
  protect,
  authorize("CLINIC_STAFF"),
  auditLogger("SEARCHED_STUDENT_DIRECTORY"),
  searchStudents
);
// GET /api/v1/clinic/scan/:studentId
// Only clinic staff can view detailed records from scanner routes.
router.get(
  "/scan/:studentId", 
  protect, 
  authorize("CLINIC_STAFF"), 
  getStudentByQR
);

router.get(
  "/scan-token/:qrToken",
  protect,
  authorize("CLINIC_STAFF"),
  getStudentByQrToken
);

// POST /api/v1/clinic/visits
// Only clinic staff can log and read detailed clinic visits.
router.get(
  "/visits",
  protect,
  authorize("CLINIC_STAFF"),
  auditLogger("VIEWED_CLINIC_VISITS"),
  getVisits
);

router.post(
  "/visits",
  protect,
  authorize("CLINIC_STAFF"),
  auditLogger("RECORDED_CLINIC_VISIT"),
  recordVisit
);

module.exports = router;