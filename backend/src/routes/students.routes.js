const express = require("express");
const router = express.Router();
// Import both functions from the controller
const { getMyProfile, generateMyQRCode } = require("../controllers/students.controller"); 
const { protect } = require("../middleware/auth.middleware");

// Your existing profile route
router.get("/me", protect, getMyProfile);

// Your NEW QR Code route
router.get("/qr", protect, generateMyQRCode);

module.exports = router;