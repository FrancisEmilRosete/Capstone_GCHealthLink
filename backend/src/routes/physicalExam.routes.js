const express = require("express");

const {
  listPhysicalExams,
  createPhysicalExam,
} = require("../controllers/physicalExam.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

const router = express.Router();

router.get("/", protect, authorize("CLINIC_STAFF"), listPhysicalExams);
router.post("/", protect, authorize("CLINIC_STAFF"), createPhysicalExam);

module.exports = router;
