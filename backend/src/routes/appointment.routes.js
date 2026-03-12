const express = require("express");
const router = express.Router();
const { bookAppointment, getLiveQueue, updateAppointmentStatus } = require("../controllers/appointment.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Student Route: Book a consultation
router.post(
  "/book", 
  protect, 
  authorize("STUDENT"), 
  bookAppointment
);

// Clinic/Admin Routes: Manage the Live Queue
router.get(
  "/queue", 
  protect, 
  authorize("CLINIC_STAFF"), 
  getLiveQueue
);

router.put(
  "/queue/:appointmentId", 
  protect, 
  authorize("CLINIC_STAFF"), 
  updateAppointmentStatus
);

module.exports = router;