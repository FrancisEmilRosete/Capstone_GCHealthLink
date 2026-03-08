const express = require("express");
const router = express.Router();

// Import both functions from the clinic controller
const { getStudentByQR, recordVisit } = require("../controllers/clinic.controller");

// Import our security middleware
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// GET /api/v1/clinic/scan/:studentId
// Only CLINIC_STAFF (and ADMINs) are allowed to scan QR codes
router.get(
  "/scan/:studentId", 
  protect, 
  authorize("CLINIC_STAFF", "ADMIN"), 
  getStudentByQR
);

// POST /api/v1/clinic/visits
// Only CLINIC_STAFF (and ADMINs) are allowed to log new medical visits
router.post(
  "/visits",
  protect,
  authorize("CLINIC_STAFF", "ADMIN"),
  recordVisit
);

module.exports = router;