const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MAX_INVENTORY_NUMBER = 1000000;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      ok: false,
      message: `${fieldName} must be a whole number greater than 0.`,
    };
  }

  if (parsed > MAX_INVENTORY_NUMBER) {
    return {
      ok: false,
      message: `${fieldName} must be ${MAX_INVENTORY_NUMBER} or less.`,
    };
  }

  return { ok: true, value: parsed };
}

// 1. View all inventory (Nurses need to see what's in stock)
const getInventory = async (req, res, next) => {
  try {
    const items = await prisma.inventory.findMany({
      orderBy: { itemName: "asc" } // Alphabetical order
    });
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

// 2. Add a new item to the inventory (Admin / Clinic Staff)
const addInventoryItem = async (req, res, next) => {
  try {
    const itemName = normalizeText(req.body?.itemName);
    const unit = normalizeText(req.body?.unit);
    const currentStockValidation = parsePositiveInteger(req.body?.currentStock, "currentStock");
    const reorderThresholdValidation = parsePositiveInteger(req.body?.reorderThreshold, "reorderThreshold");

    // Basic validation
    if (!itemName || !unit || req.body?.currentStock === undefined || req.body?.reorderThreshold === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide itemName, currentStock, reorderThreshold, and unit." 
      });
    }

    if (itemName.length > 150) {
      return res.status(400).json({ success: false, message: "itemName must be 150 characters or fewer." });
    }

    if (unit.length > 40) {
      return res.status(400).json({ success: false, message: "unit must be 40 characters or fewer." });
    }

    if (!currentStockValidation.ok) {
      return res.status(400).json({ success: false, message: currentStockValidation.message });
    }

    if (!reorderThresholdValidation.ok) {
      return res.status(400).json({ success: false, message: reorderThresholdValidation.message });
    }

    // Save to database
    const newItem = await prisma.inventory.create({
      data: {
        itemName,
        currentStock: currentStockValidation.value,
        reorderThreshold: reorderThresholdValidation.value, // The alert level (e.g., warn when below 20)
        unit // e.g., "pcs", "mg", "bottles"
      }
    });

    res.status(201).json({
      success: true,
      message: "Item added to inventory successfully",
      data: newItem
    });

  } catch (error) {
    // Prisma throws code P2002 if we try to add an item that already exists
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, message: "This item already exists in the inventory." });
    }
    next(error);
  }
};

module.exports = { getInventory, addInventoryItem };