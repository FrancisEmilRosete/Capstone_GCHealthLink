const { PrismaClient } = require("@prisma/client");
const QRCode = require("qrcode"); 
const prisma = new PrismaClient();

// UPGRADED: Fetches full Dashboard data (Profile + History + Visits)
const getMyProfile = async (req, res, next) => {
  try {
    // We fetch the StudentProfile directly using the userId from the JWT
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        // Include the checklist (Allergies, Asthma, etc.)
        medicalHistory: true, 
        // Include all clinic visits + the medicines given + the nurse's info
        clinicVisits: {
          include: {
            dispensedMedicines: {
              include: { inventory: true }
            },
            handledBy: {
              select: { email: true } 
            }
          },
          orderBy: { visitDate: 'desc' } // Newest visits first
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: "Student profile not found. Please contact the clinic." 
      });
    }

    res.json({ 
      success: true, 
      message: "Student dashboard retrieved successfully",
      data: profile 
    });
  } catch (error) {
    next(error);
  }
};

// GENERATE QR CODE: Stays the same, but kept here for the full file copy-paste
const generateMyQRCode = async (req, res, next) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { studentProfile: true },
    });

    if (!student || !student.studentProfile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const qrData = JSON.stringify({
      studentId: student.id,
      studentNumber: student.studentProfile.studentNumber
    });

    const qrCodeImage = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      data: {
        studentNumber: student.studentProfile.studentNumber,
        qrCodeImage: qrCodeImage
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyProfile, generateMyQRCode };