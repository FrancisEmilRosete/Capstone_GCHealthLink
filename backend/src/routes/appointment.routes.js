const express = require("express");
const router = express.Router();
const { bookAppointment, getLiveQueue, updateAppointmentStatus, createQueueAppointment } = require("../controllers/appointment.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");

// Student Route: Book a consultation
router.post(
  "/book", 
  protect, 
  authorize("STUDENT"), 
  auditLogger("BOOKED_APPOINTMENT"),
  bookAppointment
);

// Clinic/Admin Routes: Manage the Live Queue
router.get(
  "/queue", 
  protect, 
  authorize("CLINIC_STAFF", "DOCTOR", "ADMIN"), 
  auditLogger("VIEWED_APPOINTMENT_QUEUE"),
  getLiveQueue
);

router.put(
  "/queue/:appointmentId", 
  protect, 
  authorize("CLINIC_STAFF", "DOCTOR", "ADMIN"), 
  auditLogger("UPDATED_APPOINTMENT_STATUS"),
  updateAppointmentStatus
);

router.post(
  "/queue",
  protect,
  authorize("CLINIC_STAFF", "DOCTOR", "ADMIN"),
  auditLogger("CREATED_APPOINTMENT_QUEUE_ITEM"),
  createQueueAppointment
);

module.exports = router;