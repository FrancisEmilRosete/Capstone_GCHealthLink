const express = require("express");
const {
  getAdminSettings,
  updateAdminSettings,
  getStaffSettings,
  updateStaffSettings,
  changeMyPassword,
} = require("../controllers/settings.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");

const router = express.Router();

router.use(protect);

router.get("/admin", authorize("ADMIN"), auditLogger("VIEWED_ADMIN_SETTINGS"), getAdminSettings);
router.put("/admin", authorize("ADMIN"), updateAdminSettings);

router.get("/staff", authorize("ADMIN", "CLINIC_STAFF"), auditLogger("VIEWED_STAFF_SETTINGS"), getStaffSettings);
router.put("/staff", authorize("ADMIN", "CLINIC_STAFF"), auditLogger("UPDATED_STAFF_SETTINGS"), updateStaffSettings);

router.post("/change-password", changeMyPassword);

module.exports = router;
