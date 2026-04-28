const express = require("express");
const router = express.Router();
const {
  getHealthAnalytics,
  getAdminSessionProfile,
  getUsers,
  getAuditLogs,
  getStudentRecords,
  getStudentHealthDetail,
} = require("../controllers/admin.controller");
const { exportMonthlyReportPdf } = require("../controllers/report.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");

// All admin routes require authentication and ADMIN role
router.use(protect, authorize("ADMIN"));

router.get("/me", auditLogger("VIEWED_ADMIN_PROFILE"), getAdminSessionProfile);

// Analytics
router.get("/analytics", auditLogger("VIEWED_HEALTH_ANALYTICS"), getHealthAnalytics);

// Reports
router.get("/reports/monthly-pdf", auditLogger("EXPORTED_MONTHLY_REPORT_PDF"), exportMonthlyReportPdf);

// User Management
router.get("/users", auditLogger("ADMIN_VIEWED_USERS"), getUsers);

// Activity / Audit Logs
router.get("/audit-logs", auditLogger("ADMIN_VIEWED_AUDIT_LOGS"), getAuditLogs);

// Health Records – list all students
router.get("/records", auditLogger("ADMIN_VIEWED_RECORDS_LIST"), getStudentRecords);

// Health Records – single student detail
router.get("/records/:studentProfileId", auditLogger("ADMIN_VIEWED_STUDENT_DETAIL"), getStudentHealthDetail);

module.exports = router;