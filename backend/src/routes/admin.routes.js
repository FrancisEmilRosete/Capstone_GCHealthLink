const express = require("express");
const router = express.Router();
const { getHealthAnalytics, getAdminSessionProfile } = require("../controllers/admin.controller");
const { exportMonthlyReportPdf } = require("../controllers/report.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");

const ALLOWED_ADMIN_AGGREGATED_PATHS = new Set([
  "/me",
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

router.get(
  "/me",
  auditLogger("VIEWED_ADMIN_PROFILE"),
  getAdminSessionProfile
);

// GET /api/v1/admin/analytics
router.get(
  "/analytics",
  auditLogger("VIEWED_HEALTH_ANALYTICS"),
  getHealthAnalytics
);

router.get(
  "/reports/monthly-pdf",
  auditLogger("EXPORTED_MONTHLY_REPORT_PDF"),
  exportMonthlyReportPdf
);

module.exports = router;