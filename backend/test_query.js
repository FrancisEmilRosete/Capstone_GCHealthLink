require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const whereClause = {
      status: { in: ['WAITING', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] },
      preferredDate: { gte: startOfDay },
      serviceType: { in: ['Medical Consultation', 'Medical Clearance'] },
    };

    const res = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      skip: 0,
      take: 500,
      include: {
        studentProfile: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            courseDept: true,
            course: true,
            yearLevel: true,
            age: true,
            sex: true,
            medicalHistory: true
          }
        }
      }
    });
    console.log("Success:", res.length);
  } catch (err) {
    console.error("Error message:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
