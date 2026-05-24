const express = require("express");

const {
  listCertificates,
  issueCertificate,
} = require("../controllers/certificate.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

const router = express.Router();

// Both DOCTOR, NURSE (CLINIC_STAFF), ADMIN, and STUDENT can list certificates.
router.get("/", protect, authorize("CLINIC_STAFF", "ADMIN", "STUDENT"), listCertificates);

// Both DOCTOR and NURSE (CLINIC_STAFF) can issue a certificate; issuedByRole is derived from JWT.
router.post("/", protect, authorize("CLINIC_STAFF"), issueCertificate);

module.exports = router;
