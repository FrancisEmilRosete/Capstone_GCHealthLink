const express = require("express");
const router = express.Router();

const { getInventory, addInventoryItem, removeInventoryItem, updateInventoryItem } = require("../controllers/inventory.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { auditLogger } = require("../middleware/auditLogger.middleware");

// Both routes are protected and only for Clinic Staff or Admins
router.get("/", protect, authorize("CLINIC_STAFF", "ADMIN"), auditLogger("VIEWED_INVENTORY"), getInventory);
router.post("/", protect, authorize("CLINIC_STAFF", "ADMIN"), auditLogger("ADDED_INVENTORY_ITEM"), addInventoryItem);
router.put("/:id", protect, authorize("CLINIC_STAFF", "ADMIN"), auditLogger("UPDATED_INVENTORY_ITEM"), updateInventoryItem);
router.delete("/:id", protect, authorize("CLINIC_STAFF", "ADMIN"), auditLogger("REMOVED_INVENTORY_ITEM"), removeInventoryItem);

module.exports = router;