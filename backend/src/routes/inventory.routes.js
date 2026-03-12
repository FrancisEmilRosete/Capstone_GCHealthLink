const express = require("express");
const router = express.Router();

const { getInventory, addInventoryItem } = require("../controllers/inventory.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");

// Both routes are protected and only for Clinic Staff or Admins
router.get("/", protect, authorize("CLINIC_STAFF", "ADMIN"), getInventory);
router.post("/", protect, authorize("CLINIC_STAFF", "ADMIN"), addInventoryItem);

module.exports = router;