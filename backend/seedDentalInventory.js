const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const dentalInventorySeed = [
  // Anesthetics
  { itemName: "Lidocaine 2% with Epinephrine", currentStock: 100, reorderThreshold: 20, unit: "carpules", category: "DENTAL" },
  { itemName: "Topical Anesthetic Gel", currentStock: 15, reorderThreshold: 5, unit: "jars", category: "DENTAL" },
  
  // Restoratives
  { itemName: "Composite Resin (A2)", currentStock: 20, reorderThreshold: 5, unit: "syringes", category: "DENTAL" },
  { itemName: "Amalgam Capsules", currentStock: 150, reorderThreshold: 30, unit: "capsules", category: "DENTAL" },
  { itemName: "Acid Etchant Gel", currentStock: 10, reorderThreshold: 3, unit: "syringes", category: "DENTAL" },

  // Disposables
  { itemName: "Dental Bibs", currentStock: 500, reorderThreshold: 100, unit: "pcs", category: "DENTAL" },
  { itemName: "Saliva Ejectors", currentStock: 500, reorderThreshold: 100, unit: "pcs", category: "DENTAL" },
  { itemName: "Cotton Rolls", currentStock: 1000, reorderThreshold: 200, unit: "pcs", category: "DENTAL" },
  { itemName: "Nitrile Gloves (Box)", currentStock: 20, reorderThreshold: 5, unit: "boxes", category: "DENTAL" },

  // Tools (Consumable)
  { itemName: "Dental Needles (27G)", currentStock: 300, reorderThreshold: 50, unit: "pcs", category: "DENTAL" },
  { itemName: "Prophy Cups", currentStock: 100, reorderThreshold: 20, unit: "pcs", category: "DENTAL" },
  { itemName: "Prophy Paste", currentStock: 50, reorderThreshold: 10, unit: "cups", category: "DENTAL" }
];

async function seedDentalInventory() {
  console.log("Seeding Dental Inventory...");
  for (const item of dentalInventorySeed) {
    const existing = await prisma.inventory.findUnique({
      where: { itemName: item.itemName },
    });

    if (existing) {
      console.log(`[SKIP] ${item.itemName} already exists.`);
    } else {
      await prisma.inventory.create({
        data: item,
      });
      console.log(`[ADDED] ${item.itemName}`);
    }
  }
  console.log("Seeding complete!");
}

seedDentalInventory()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
