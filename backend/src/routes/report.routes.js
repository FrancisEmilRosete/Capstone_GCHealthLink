'use strict';

const express = require('express');
const router  = express.Router();

const { generateReport }   = require('../controllers/report.controller');
const { protect }          = require('../middleware/auth.middleware');
const { authorize }        = require('../middleware/rbac.middleware');
const { auditLogger }      = require('../middleware/auditLogger.middleware');

/**
 * GET /api/v1/reports/generate
 *
 * Query params:
 *   type  — medical_consultation | physical_examination |
 *            dental_consultation  | dental_examination
 *   range — daily | weekly | monthly | quarterly | semi-annually | yearly
 *   date  — YYYY-MM-DD reference date (optional, defaults to today)
 *
 * Access:
 *   All CLINIC_STAFF may call this endpoint.
 *   Fine-grained RBAC by staff sub-type (DOCTOR / DENTIST / NURSE)
 *   is enforced inside the controller itself, returning HTTP 403
 *   if the requested report type is outside the caller's scope.
 */
router.get(
  '/generate',
  protect,
  authorize('CLINIC_STAFF'),
  auditLogger('VIEWED_REPORT_GENERATE'),
  generateReport,
);

module.exports = router;
