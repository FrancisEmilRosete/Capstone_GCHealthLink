const express = require("express");
const router = express.Router();
const { getHealthAnalytics } = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// GET /api/v1/admin/analytics
router.get(
  "/analytics", 
  protect, 
  authorize("ADMIN"), 
  getHealthAnalytics
);

module.exports = router;