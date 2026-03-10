const express = require("express");
const router = express.Router();
// Import both functions from the controller
const { getMyProfile, generateMyQRCode, submitRegistration } = require("../controllers/students.controller"); 
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Public registration (new student account creation only)
router.post("/registration/public", submitRegistration);

// Authenticated student registration/profile update
router.post("/registration", protect, authorize("STUDENT"), submitRegistration);

// Your existing profile route
router.get("/me", protect, authorize("STUDENT"), getMyProfile);

// Your NEW QR Code route
router.get("/qr", protect, authorize("STUDENT"), generateMyQRCode);

module.exports = router;