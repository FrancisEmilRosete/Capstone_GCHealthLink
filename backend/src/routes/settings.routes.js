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

const router = express.Router();

router.use(protect);

router.get("/admin", authorize("ADMIN"), getAdminSettings);
router.put("/admin", authorize("ADMIN"), updateAdminSettings);

router.get("/staff", authorize("ADMIN", "CLINIC_STAFF"), getStaffSettings);
router.put("/staff", authorize("ADMIN", "CLINIC_STAFF"), updateStaffSettings);

router.post("/change-password", changeMyPassword);

module.exports = router;
