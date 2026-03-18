const express = require("express");
const router = express.Router();
// Import both functions from the controller
const { getMyProfile, generateMyQRCode, submitRegistration } = require("../controllers/students.controller"); 
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");

// Public registration (new student account creation only)
router.post("/registration/public", submitRegistration);

// Authenticated student registration/profile update
router.post("/registration", protect, authorize("STUDENT"), submitRegistration);

// Your existing profile route
router.get("/me", protect, authorize("STUDENT"), auditLogger("VIEWED_OWN_PROFILE"), getMyProfile);

// Your NEW QR Code route
router.get("/qr", protect, authorize("STUDENT"), auditLogger("GENERATED_QR_CODE"), generateMyQRCode);

module.exports = router;