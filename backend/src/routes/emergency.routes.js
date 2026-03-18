const express = require("express");
const router = express.Router();

const { sendEmergencySmsToGuardian } = require("../controllers/emergency.controller");
const { ROLES } = require("../lib/roles");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

router.post(
  "/send-sms",
  protect,
  authorize(ROLES.CLINIC_STAFF, ROLES.ADMIN),
  sendEmergencySmsToGuardian
);

module.exports = router;