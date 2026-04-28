const express = require("express");

const {
  listCertificates,
  issueCertificate,
} = require("../controllers/certificate.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

const router = express.Router();

router.get("/", protect, authorize("CLINIC_STAFF", "ADMIN"), listCertificates);
router.post("/", protect, authorize("CLINIC_STAFF", "ADMIN"), issueCertificate);

module.exports = router;
