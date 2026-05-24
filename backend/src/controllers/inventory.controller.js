const { PrismaClient } = require("@prisma/client");
const { parsePaginationParams, buildPaginationMeta } = require("../utils/pagination.util");
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

function parseNonNegativeInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return {
      ok: false,
      message: `${fieldName} must be a whole number 0 or greater.`,
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
    const { page, limit, skip } = parsePaginationParams(req.query, {
      defaultLimit: 200,
      maxLimit: 1000,
    });
    const q = normalizeText(req.query?.q);
    const where = q
      ? {
          OR: [
            { itemName: { contains: q, mode: "insensitive" } },
            { unit: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const [items, total] = await prisma.$transaction([
      prisma.inventory.findMany({
        where,
        orderBy: { itemName: "asc" },
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const mapped = items.map(item => {
      let status = "NORMAL";
      if (item.currentStock === 0) status = "OUT_OF_STOCK";
      else if (item.currentStock <= item.reorderThreshold) status = "LOW_STOCK";
      
      let expiryStatus = "GOOD";
      if (item.expirationDate) {
        if (item.expirationDate < now) expiryStatus = "EXPIRED";
        else if (item.expirationDate <= thirtyDaysFromNow) expiryStatus = "EXPIRING_SOON";
      }
      return { ...item, status, expiryStatus };
    });

    res.json({
      success: true,
      data: mapped,
      pagination: buildPaginationMeta({ page, limit, total }),
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
    
    const expirationDateStr = normalizeText(req.body?.expirationDate);
    let expirationDate = null;
    if (expirationDateStr) {
      expirationDate = new Date(expirationDateStr);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid expirationDate format." });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expirationDate < today) {
        return res.status(400).json({ 
          success: false, 
          message: "Expiration date cannot be in the past." 
        });
      }
    }

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
        unit, // e.g., "pcs", "mg", "bottles"
        expirationDate
      }
    });

    req.auditLog = {
      targetId: newItem.id,
      metadata: {
        actionType: "create",
        itemName: newItem.itemName,
        currentStock: newItem.currentStock,
        reorderThreshold: newItem.reorderThreshold,
        unit: newItem.unit,
        expirationDate: newItem.expirationDate,
      },
    };

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

// 3. Remove an item from inventory (Admin / Clinic Staff)
const removeInventoryItem = async (req, res, next) => {
  try {
    const inventoryId = normalizeText(req.params?.id);

    if (!inventoryId) {
      return res.status(400).json({
        success: false,
        message: "Inventory item id is required.",
      });
    }

    const existing = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: { id: true, itemName: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found.",
      });
    }

    const linkedDispenseCount = await prisma.visitMedicine.count({
      where: { inventoryId },
    });

    if (linkedDispenseCount > 0) {
      return res.status(409).json({
        success: false,
        message: "This medicine cannot be removed because it is linked to consultation records.",
      });
    }

    await prisma.inventory.delete({ where: { id: inventoryId } });

    req.auditLog = {
      targetId: inventoryId,
      metadata: {
        actionType: "delete",
        itemName: existing.itemName,
      },
    };

    return res.json({
      success: true,
      message: `${existing.itemName} was removed from inventory.`,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update an existing inventory item (Admin / Clinic Staff)
const updateInventoryItem = async (req, res, next) => {
  try {
    const inventoryId = normalizeText(req.params?.id);
    if (!inventoryId) {
      return res.status(400).json({ success: false, message: "Inventory item id is required." });
    }

    const existing = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }

    const itemName = normalizeText(req.body?.itemName);
    const unit = normalizeText(req.body?.unit);
    const currentStockValidation = parseNonNegativeInteger(req.body?.currentStock, "currentStock");
    const reorderThresholdValidation = parsePositiveInteger(req.body?.reorderThreshold, "reorderThreshold");

    if (!itemName || !unit || req.body?.currentStock === undefined || req.body?.reorderThreshold === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide itemName, currentStock, reorderThreshold, and unit.",
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

    const expirationDateStr = normalizeText(req.body?.expirationDate);
    let expirationDate = null;
    if (expirationDateStr) {
      expirationDate = new Date(expirationDateStr);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid expirationDate format." });
      }
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        itemName,
        currentStock: currentStockValidation.value,
        reorderThreshold: reorderThresholdValidation.value,
        unit,
        expirationDate,
      },
    });

    req.auditLog = {
      targetId: inventoryId,
      metadata: {
        actionType: "update",
        before: {
          itemName: existing.itemName,
        },
        after: {
          itemName: updatedItem.itemName,
          currentStock: updatedItem.currentStock,
          reorderThreshold: updatedItem.reorderThreshold,
          unit: updatedItem.unit,
          expirationDate: updatedItem.expirationDate,
        },
      },
    };

    return res.json({
      success: true,
      message: "Inventory item updated successfully.",
      data: updatedItem,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, message: "This item name already exists in the inventory." });
    }
    next(error);
  }
};

module.exports = { getInventory, addInventoryItem, removeInventoryItem, updateInventoryItem };