const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Scanner Function: Fetch student profile via QR ID
const getStudentByQR = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
      },
    });

    if (!student || student.role !== "STUDENT") {
      return res.status(404).json({ success: false, message: "Valid student record not found." });
    }

    res.json({
      success: true,
      message: "Student record retrieved successfully",
      data: student.studentProfile
    });

  } catch (error) {
    next(error);
  }
};

// 2. UPGRADED FUNCTION: Record a clinic visit AND deduct medicine inventory
const recordVisit = async (req, res, next) => {
  try {
    const { 
      studentProfileId, 
      visitDate, 
      visitTime, 
      chiefComplaintEnc, 
      dispensedMedicines 
    } = req.body;
    
    // Automatically grab the Nurse's ID from their secure JWT token
    const handledById = req.user.userId;

    // Basic validation
    if (!studentProfileId || !visitDate) {
      return res.status(400).json({ 
        success: false, 
        message: "studentProfileId and visitDate are required." 
      });
    }

    // 🔥 Start the Prisma Transaction: All steps must succeed or none will.
    const result = await prisma.$transaction(async (tx) => {
      
      // STEP A: Create the base clinic visit record
      const newVisit = await tx.clinicVisit.create({
        data: {
          studentProfileId,
          handledById,
          visitDate: new Date(visitDate),
          visitTime,
          chiefComplaintEnc
        }
      });

      // STEP B: If medicine was given, process each item
      if (dispensedMedicines && dispensedMedicines.length > 0) {
        for (const med of dispensedMedicines) {
          
          // 1. Deduct stock from the Inventory table
          // Note: { decrement: X } is a built-in Prisma helper
          const updatedItem = await tx.inventory.update({
            where: { id: med.inventoryId },
            data: { currentStock: { decrement: med.quantity } }
          });

          // 2. Safety check: Block the transaction if stock goes below zero
          if (updatedItem.currentStock < 0) {
            throw new Error(`Insufficient stock for ${updatedItem.itemName}. Available: ${updatedItem.currentStock + med.quantity}`);
          }

          // 3. Create the many-to-many link in VisitMedicine
          await tx.visitMedicine.create({
            data: {
              visitId: newVisit.id,
              inventoryId: med.inventoryId,
              quantity: med.quantity
            }
          });
        }
      }

      // STEP C: Return the full record including the medicine details
      return tx.clinicVisit.findUnique({
        where: { id: newVisit.id },
        include: { 
          dispensedMedicines: { 
            include: { inventory: true } 
          } 
        }
      });
    });

    res.status(201).json({
      success: true,
      message: "Clinic visit and medicine dispensing recorded successfully",
      data: result
    });

  } catch (error) {
    // Catch the "Insufficient stock" error we manually threw above
    if (error.message && error.message.includes("Insufficient stock")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Export BOTH functions
module.exports = { getStudentByQR, recordVisit };