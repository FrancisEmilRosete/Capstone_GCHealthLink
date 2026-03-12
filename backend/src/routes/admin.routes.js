const express = require("express");
const router = express.Router();
const { getHealthAnalytics } = require("../controllers/admin.controller");
const { exportMonthlyReportPdf } = require("../controllers/report.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

const ALLOWED_ADMIN_AGGREGATED_PATHS = new Set([
  "/analytics",
  "/reports/monthly-pdf",
]);

function enforceAggregatedAdminScope(req, res, next) {
  if (!ALLOWED_ADMIN_AGGREGATED_PATHS.has(req.path)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admin access is limited to aggregated analytics endpoints by MVP policy.",
    });
  }

  return next();
}

router.use(protect, authorize("ADMIN"), enforceAggregatedAdminScope);

// GET /api/v1/admin/analytics
router.get(
  "/analytics",
  getHealthAnalytics
);

router.get(
  "/reports/monthly-pdf",
  exportMonthlyReportPdf
);

module.exports = router;