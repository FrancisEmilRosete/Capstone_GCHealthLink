const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Make sure you run: npm install bcrypt
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Hash a default password for our dummy users
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('password123', saltRounds);

  // 2. Create an Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gordoncollege.edu.ph' },
    update: {},
    create: {
      email: 'admin@gordoncollege.edu.ph',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  // 3. Create a Clinic Staff (Nurse) User
  const nurse = await prisma.user.upsert({
    where: { email: 'nurse@gordoncollege.edu.ph' },
    update: {},
    create: {
      email: 'nurse@gordoncollege.edu.ph',
      passwordHash: hashedPassword,
      role: 'CLINIC_STAFF',
    },
  });

  // 4. Create a Student User and their Profile
  const student = await prisma.user.upsert({
    where: { email: 'student@gordoncollege.edu.ph' },
    update: {},
    create: {
      email: 'student@gordoncollege.edu.ph',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      studentProfile: {
        create: {
          studentNumber: '2024-0001',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          courseDept: 'BSCS',
          age: 20,
          sex: 'Male',
        }
      }
    },
  });

  // 5. Add Initial Clinic Inventory
  const paracetamol = await prisma.inventory.upsert({
    where: { itemName: 'Paracetamol 500mg' },
    update: {},
    create: {
      itemName: 'Paracetamol 500mg',
      currentStock: 100,
      reorderThreshold: 20,
      unit: 'tablets'
    }
  });

  console.log('✅ Seeding finished successfully!');
  console.log({ admin: admin.email, nurse: nurse.email, student: student.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });