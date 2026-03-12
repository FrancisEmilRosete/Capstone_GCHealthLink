const express = require("express");
const router = express.Router();

// Import both functions from the clinic controller
const {
  getStudentByQR,
  getStudentByQrToken,
  recordVisit,
  searchStudents,
  sendEmergencyAlert,
  getVisits,
} = require("../controllers/clinic.controller");

// Import our security middleware
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");


router.post("/emergency-alert", protect, authorize("CLINIC_STAFF"), sendEmergencyAlert);

router.get("/search", protect, authorize("CLINIC_STAFF"), searchStudents);
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
  getVisits
);

router.post(
  "/visits",
  protect,
  authorize("CLINIC_STAFF"),
  recordVisit
);

module.exports = router;