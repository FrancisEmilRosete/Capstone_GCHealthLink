const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    const { itemName, currentStock, reorderThreshold, unit } = req.body;

    // Basic validation
    if (!itemName || currentStock === undefined || reorderThreshold === undefined || !unit) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide itemName, currentStock, reorderThreshold, and unit." 
      });
    }

    // Save to database
    const newItem = await prisma.inventory.create({
      data: {
        itemName,
        currentStock: parseInt(currentStock),
        reorderThreshold: parseInt(reorderThreshold), // The alert level (e.g., warn when below 20)
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