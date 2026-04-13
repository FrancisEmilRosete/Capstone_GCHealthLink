const express = require("express");

const {
  getOutbreakForecast,
  getResourcePrediction,
} = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

const router = express.Router();

router.get(
  "/outbreak-forecast",
  protect,
  authorize("ADMIN", "CLINIC_STAFF"),
  getOutbreakForecast
);

router.get(
  "/resource-prediction",
  protect,
  authorize("ADMIN", "CLINIC_STAFF"),
  getResourcePrediction
);

module.exports = router;
