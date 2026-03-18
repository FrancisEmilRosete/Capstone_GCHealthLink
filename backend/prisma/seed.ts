const nodeCrypto = require("crypto");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

// bcrypt hash for demo password: password123
const DEFAULT_STUDENT_PASSWORD_HASH =
  "$2b$10$FhIFiJDduvjOQa1UT3iDoO70wOEuxLyYtIW2OfFRyDe.rANhZg2r6";

type StudentBlueprint = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  mi?: string;
  sex: string;
  age: number;
  birthday: Date;
  courseDept: "CCS" | "CAHS" | "CBA" | "CEAS" | "CHTM";
  email: string;
  presentAddress: string;
  phone: string;
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyContactAddress: string;
  emergencyContactTelNumber: string;
  hasAsthma?: boolean;
  hasDiabetes?: boolean;
};

type CreatedStudent = {
  profileId: string;
  studentNumber: string;
  fullName: string;
  courseDept: string;
};

const MOCK_ENCRYPTED_FEVER_COMPLAINT = "enc::high-fever-and-body-aches";

const STUDENT_BLUEPRINTS: StudentBlueprint[] = [
  {
    studentNumber: "2026-0001",
    firstName: "Juan",
    lastName: "Dela Cruz",
    mi: "R",
    sex: "Male",
    age: 20,
    birthday: new Date("2005-02-11"),
    courseDept: "CCS",
    email: "juan.delacruz.2026@gordoncollege.edu.ph",
    presentAddress: "East Tapinac, Olongapo City",
    phone: "09171230001",
    emergencyContactName: "Ramon Dela Cruz",
    emergencyRelationship: "Father",
    emergencyContactAddress: "East Tapinac, Olongapo City",
    emergencyContactTelNumber: "09181230001",
    hasAsthma: true,
  },
  {
    studentNumber: "2026-0002",
    firstName: "Maria",
    lastName: "Santos",
    mi: "L",
    sex: "Female",
    age: 19,
    birthday: new Date("2006-01-22"),
    courseDept: "CCS",
    email: "maria.santos.2026@gordoncollege.edu.ph",
    presentAddress: "New Kalalake, Olongapo City",
    phone: "09171230002",
    emergencyContactName: "Lourdes Santos",
    emergencyRelationship: "Mother",
    emergencyContactAddress: "New Kalalake, Olongapo City",
    emergencyContactTelNumber: "09181230002",
    hasAsthma: true,
  },
  {
    studentNumber: "2026-0003",
    firstName: "Angelo",
    lastName: "Reyes",
    mi: "P",
    sex: "Male",
    age: 21,
    birthday: new Date("2004-08-09"),
    courseDept: "CCS",
    email: "angelo.reyes.2026@gordoncollege.edu.ph",
    presentAddress: "Barretto, Olongapo City",
    phone: "09171230003",
    emergencyContactName: "Pedro Reyes",
    emergencyRelationship: "Father",
    emergencyContactAddress: "Barretto, Olongapo City",
    emergencyContactTelNumber: "09181230003",
    hasDiabetes: true,
  },
  {
    studentNumber: "2026-0004",
    firstName: "Patricia",
    lastName: "Villanueva",
    mi: "S",
    sex: "Female",
    age: 20,
    birthday: new Date("2005-05-03"),
    courseDept: "CCS",
    email: "patricia.villanueva.2026@gordoncollege.edu.ph",
    presentAddress: "Pag-asa, Olongapo City",
    phone: "09171230004",
    emergencyContactName: "Sonia Villanueva",
    emergencyRelationship: "Mother",
    emergencyContactAddress: "Pag-asa, Olongapo City",
    emergencyContactTelNumber: "09181230004",
  },
  {
    studentNumber: "2026-0005",
    firstName: "Kurt",
    lastName: "Mendoza",
    mi: "B",
    sex: "Male",
    age: 22,
    birthday: new Date("2003-11-17"),
    courseDept: "CCS",
    email: "kurt.mendoza.2026@gordoncollege.edu.ph",
    presentAddress: "Gordon Heights, Olongapo City",
    phone: "09171230005",
    emergencyContactName: "Benjie Mendoza",
    emergencyRelationship: "Father",
    emergencyContactAddress: "Gordon Heights, Olongapo City",
    emergencyContactTelNumber: "09181230005",
  },
  {
    studentNumber: "2026-0006",
    firstName: "Elaine",
    lastName: "Torres",
    mi: "C",
    sex: "Female",
    age: 19,
    birthday: new Date("2006-04-28"),
    courseDept: "CCS",
    email: "elaine.torres.2026@gordoncollege.edu.ph",
    presentAddress: "Old Cabalan, Olongapo City",
    phone: "09171230006",
    emergencyContactName: "Carlos Torres",
    emergencyRelationship: "Uncle",
    emergencyContactAddress: "Old Cabalan, Olongapo City",
    emergencyContactTelNumber: "09181230006",
  },
  {
    studentNumber: "2026-0007",
    firstName: "Joshua",
    lastName: "Navarro",
    mi: "T",
    sex: "Male",
    age: 20,
    birthday: new Date("2005-09-14"),
    courseDept: "CCS",
    email: "joshua.navarro.2026@gordoncollege.edu.ph",
    presentAddress: "Mabayuan, Olongapo City",
    phone: "09171230007",
    emergencyContactName: "Teresa Navarro",
    emergencyRelationship: "Mother",
    emergencyContactAddress: "Mabayuan, Olongapo City",
    emergencyContactTelNumber: "09181230007",
  },
  {
    studentNumber: "2026-0008",
    firstName: "Camille",
    lastName: "Ramos",
    mi: "G",
    sex: "Female",
    age: 21,
    birthday: new Date("2004-12-01"),
    courseDept: "CCS",
    email: "camille.ramos.2026@gordoncollege.edu.ph",
    presentAddress: "Sta. Rita, Olongapo City",
    phone: "09171230008",
    emergencyContactName: "Gerald Ramos",
    emergencyRelationship: "Father",
    emergencyContactAddress: "Sta. Rita, Olongapo City",
    emergencyContactTelNumber: "09181230008",
  },
  {
    studentNumber: "2026-0009",
    firstName: "Mark",
    lastName: "Fernandez",
    mi: "A",
    sex: "Male",
    age: 20,
    birthday: new Date("2005-07-23"),
    courseDept: "CCS",
    email: "mark.fernandez.2026@gordoncollege.edu.ph",
    presentAddress: "West Bajac-Bajac, Olongapo City",
    phone: "09171230009",
    emergencyContactName: "Arlene Fernandez",
    emergencyRelationship: "Mother",
    emergencyContactAddress: "West Bajac-Bajac, Olongapo City",
    emergencyContactTelNumber: "09181230009",
  },
  {
    studentNumber: "2026-0010",
    firstName: "Rica",
    lastName: "Domingo",
    mi: "M",
    sex: "Female",
    age: 19,
    birthday: new Date("2006-03-18"),
    courseDept: "CCS",
    email: "rica.domingo.2026@gordoncollege.edu.ph",
    presentAddress: "Asinan, Olongapo City",
    phone: "09171230010",
    emergencyContactName: "Mario Domingo",
    emergencyRelationship: "Father",
    emergencyContactAddress: "Asinan, Olongapo City",
    emergencyContactTelNumber: "09181230010",
  },
  {
    studentNumber: "2026-0011",
    firstName: "Samantha",
    lastName: "Lopez",
    mi: "D",
    sex: "Female",
    age: 20,
    birthday: new Date("2005-06-07"),
    courseDept: "CAHS",
    email: "samantha.lopez.2026@gordoncollege.edu.ph",
    presentAddress: "Kalaklan, Olongapo City",
    phone: "09171230011",
    emergencyContactName: "Dante Lopez",
    emergencyRelationship: "Father",
    emergencyContactAddress: "Kalaklan, Olongapo City",
    emergencyContactTelNumber: "09181230011",
  },
  {
    studentNumber: "2026-0012",
    firstName: "Christian",
    lastName: "Bautista",
    mi: "E",
    sex: "Male",
    age: 21,
    birthday: new Date("2004-10-12"),
    courseDept: "CBA",
    email: "christian.bautista.2026@gordoncollege.edu.ph",
    presentAddress: "East Bajac-Bajac, Olongapo City",
    phone: "09171230012",
    emergencyContactName: "Elena Bautista",
    emergencyRelationship: "Mother",
    emergencyContactAddress: "East Bajac-Bajac, Olongapo City",
    emergencyContactTelNumber: "09181230012",
  },
  {
    studentNumber: "2026-0013",
    firstName: "Alyssa",
    lastName: "Garcia",
    mi: "F",
    sex: "Female",
    age: 20,
    birthday: new Date("2005-01-30"),
    courseDept: "CEAS",
    email: "alyssa.garcia.2026@gordoncollege.edu.ph",
    presentAddress: "Kababae, Olongapo City",
    phone: "09171230013",
    emergencyContactName: "Francis Garcia",
    emergencyRelationship: "Brother",
    emergencyContactAddress: "Kababae, Olongapo City",
    emergencyContactTelNumber: "09181230013",
  },
  {
    studentNumber: "2026-0014",
    firstName: "Jerome",
    lastName: "Aquino",
    mi: "H",
    sex: "Male",
    age: 22,
    birthday: new Date("2003-09-05"),
    courseDept: "CHTM",
    email: "jerome.aquino.2026@gordoncollege.edu.ph",
    presentAddress: "New Cabalan, Olongapo City",
    phone: "09171230014",
    emergencyContactName: "Helen Aquino",
    emergencyRelationship: "Mother",
    emergencyContactAddress: "New Cabalan, Olongapo City",
    emergencyContactTelNumber: "09181230014",
  },
  {
    studentNumber: "2026-0015",
    firstName: "Bianca",
    lastName: "Salazar",
    mi: "I",
    sex: "Female",
    age: 19,
    birthday: new Date("2006-02-15"),
    courseDept: "CAHS",
    email: "bianca.salazar.2026@gordoncollege.edu.ph",
    presentAddress: "East Bajac-Bajac, Olongapo City",
    phone: "09171230015",
    emergencyContactName: "Isabel Salazar",
    emergencyRelationship: "Aunt",
    emergencyContactAddress: "East Bajac-Bajac, Olongapo City",
    emergencyContactTelNumber: "09181230015",
  },
];

function toVisitTime(value: Date): string {
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number, hour = 10): Date {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function makeSeedId(prefix: string): string {
  return `${prefix}_${nodeCrypto.randomUUID().replace(/-/g, "")}`;
}

async function safePurge(): Promise<void> {
  console.log("\n1) Running safe purge...");

  await prisma.visitMedicine.deleteMany();
  await prisma.clinicVisit.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.physicalExamination.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.medicalHistory.deleteMany();
  await prisma.medicalDocument.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.healthAdvisory.deleteMany();

  const deletedStudents = await prisma.user.deleteMany({
    where: { role: UserRole.STUDENT },
  });

  console.log(`   Purge complete. Deleted ${deletedStudents.count} student user account(s).`);
}

async function fetchClinicStaffId(): Promise<string> {
  console.log("\n2) Fetching CLINIC_STAFF user...");

  const clinicStaff = await prisma.user.findFirst({
    where: { role: UserRole.CLINIC_STAFF },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  if (!clinicStaff) {
    throw new Error(
      "No CLINIC_STAFF user found. Keep/create your nurse login first before running this seed."
    );
  }

  console.log(`   Using clinic staff account: ${clinicStaff.email}`);
  return clinicStaff.id;
}

async function seedInventory() {
  console.log("\n3) Seeding professional inventory...");

  const inventoryPayload = [
    {
      itemName: "Paracetamol 500mg",
      currentStock: 500,
      reorderThreshold: 50,
      unit: "pcs",
    },
    {
      itemName: "Lozenges (Strepsils)",
      currentStock: 200,
      reorderThreshold: 30,
      unit: "pcs",
    },
    {
      itemName: "Mefenamic Acid",
      currentStock: 300,
      reorderThreshold: 50,
      unit: "pcs",
    },
  ];

  await prisma.inventory.createMany({ data: inventoryPayload });

  const inventoryRows: Array<{ id: string; itemName: string; currentStock: number }> = await prisma.inventory.findMany({
    where: {
      itemName: {
        in: inventoryPayload.map((item) => item.itemName),
      },
    },
    select: {
      id: true,
      itemName: true,
      currentStock: true,
    },
  });

  console.log(`   Seeded ${inventoryRows.length} inventory item(s).`);

  return Object.fromEntries(
    inventoryRows.map((item) => [item.itemName, item])
  ) as Record<string, { id: string; itemName: string; currentStock: number }>;
}

async function seedStudentsAndMedicalFlags(): Promise<CreatedStudent[]> {
  console.log("\n4) Seeding student profiles and medical flags...");

  const created: CreatedStudent[] = [];

  for (const blueprint of STUDENT_BLUEPRINTS) {
    const record = await prisma.user.create({
      data: {
        role: UserRole.STUDENT,
        email: blueprint.email,
        passwordHash: DEFAULT_STUDENT_PASSWORD_HASH,
        studentProfile: {
          create: {
            studentNumber: blueprint.studentNumber,
            firstName: blueprint.firstName,
            lastName: blueprint.lastName,
            mi: blueprint.mi || null,
            courseDept: blueprint.courseDept,
            civilStatus: "Single",
            age: blueprint.age,
            sex: blueprint.sex,
            birthday: blueprint.birthday,
            presentAddress: blueprint.presentAddress,
            telNumber: blueprint.phone,
            emergencyContactName: blueprint.emergencyContactName,
            emergencyRelationship: blueprint.emergencyRelationship,
            emergencyContactAddress: blueprint.emergencyContactAddress,
            emergencyContactTelNumber: blueprint.emergencyContactTelNumber,
            medicalHistory: {
              create: {
                allergyEnc: "None",
                asthmaEnc: blueprint.hasAsthma ? "Yes" : "No",
                diabetesEnc: blueprint.hasDiabetes ? "Yes" : "No",
                hypertensionEnc: "No",
                anxietyDisorderEnc: "No",
              },
            },
          },
        },
      },
      select: {
        studentProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentNumber: true,
            courseDept: true,
          },
        },
      },
    });

    if (!record.studentProfile) {
      throw new Error(`Failed to create student profile for ${blueprint.email}`);
    }

    created.push({
      profileId: record.studentProfile.id,
      studentNumber: record.studentProfile.studentNumber,
      fullName: `${record.studentProfile.firstName} ${record.studentProfile.lastName}`,
      courseDept: record.studentProfile.courseDept,
    });
  }

  const ccsCount = created.filter((student) => student.courseDept === "CCS").length;
  if (ccsCount < 10) {
    throw new Error(`Seed integrity check failed. Expected >=10 CCS students, got ${ccsCount}.`);
  }

  console.log(`   Seeded ${created.length} student profile(s). CCS count: ${ccsCount}.`);
  console.log("   Medical flag setup: 2 Asthma + 1 Diabetes profiles.");

  return created;
}

async function seedOutbreakTrigger(
  students: CreatedStudent[],
  handledById: string,
  inventoryMap: Record<string, { id: string; itemName: string; currentStock: number }>
): Promise<void> {
  console.log("\n5) Seeding clinic visits and outbreak trigger...");

  const ccsStudents = students.filter((student) => student.courseDept === "CCS");
  if (ccsStudents.length < 8) {
    throw new Error("Need at least 8 CCS students for outbreak trigger seeding.");
  }

  const outbreakHoursOffsets = [2, 5, 8, 12, 18, 24, 34, 44];
  const paracetamol = inventoryMap["Paracetamol 500mg"];
  if (!paracetamol) {
    throw new Error("Paracetamol inventory row not found after seeding.");
  }

  const outbreakVisits = outbreakHoursOffsets.map((offset, index) => {
    const student = ccsStudents[index];
    const visitDate = hoursAgo(offset);

    return {
      id: makeSeedId("visit"),
      studentProfileId: student.profileId,
      handledById,
      visitDate,
      createdAt: visitDate,
      visitTime: toVisitTime(visitDate),
      concernTag: "Fever",
      chiefComplaintEnc: MOCK_ENCRYPTED_FEVER_COMPLAINT,
    };
  });

  const nonOutbreakTemplates = [
    { student: students[10], concernTag: "Headache", complaint: "enc::intermittent-headache", date: daysAgo(4, 9) },
    { student: students[11], concernTag: "Stomach Pain", complaint: "enc::epigastric-pain-after-meal", date: daysAgo(7, 11) },
    { student: students[12], concernTag: "Dental Concern", complaint: "enc::toothache-right-molar", date: daysAgo(10, 14) },
    { student: students[13], concernTag: "Injury", complaint: "enc::minor-ankle-sprain", date: daysAgo(14, 15) },
    { student: students[14], concernTag: "Flu-like Illness", complaint: "enc::cough-and-colds", date: daysAgo(18, 10) },
    { student: students[8], concernTag: "Dizziness", complaint: "enc::transient-dizziness", date: daysAgo(22, 13) },
    { student: students[9], concernTag: "Cough", complaint: "enc::dry-cough-no-fever", date: daysAgo(27, 8) },
  ];

  const nonOutbreakVisits = nonOutbreakTemplates.map((template) => ({
    id: makeSeedId("visit"),
    studentProfileId: template.student.profileId,
    handledById,
    visitDate: template.date,
    createdAt: template.date,
    visitTime: toVisitTime(template.date),
    concernTag: template.concernTag,
    chiefComplaintEnc: template.complaint,
  }));

  const visitMedicineRows = outbreakVisits.slice(0, 6).map((visit) => ({
    visitId: visit.id,
    inventoryId: paracetamol.id,
    quantity: 2,
  }));

  const totalParacetamolDispensed = visitMedicineRows.reduce((total, item) => total + item.quantity, 0);

  if (totalParacetamolDispensed > 0) {
    await prisma.$transaction([
      prisma.clinicVisit.createMany({ data: [...outbreakVisits, ...nonOutbreakVisits] }),
      prisma.visitMedicine.createMany({ data: visitMedicineRows }),
      prisma.inventory.update({
        where: { id: paracetamol.id },
        data: {
          currentStock: {
            decrement: totalParacetamolDispensed,
          },
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.clinicVisit.createMany({ data: [...outbreakVisits, ...nonOutbreakVisits] }),
      prisma.visitMedicine.createMany({ data: visitMedicineRows }),
    ]);
  }

  console.log("   Created 15 clinic visit records total.");
  console.log("   Outbreak trigger: exactly 8 CCS Fever visits in last 48 hours.");
  console.log(`   Paracetamol dispensed via VisitMedicine: ${totalParacetamolDispensed} pcs.`);
}

async function main(): Promise<void> {
  console.log("\n=== GC HealthLink Defense Seed (Prisma) ===");

  await safePurge();
  const clinicStaffId = await fetchClinicStaffId();
  const inventoryMap = await seedInventory();
  const students = await seedStudentsAndMedicalFlags();
  await seedOutbreakTrigger(students, clinicStaffId, inventoryMap);

  console.log("\nSeed completed successfully.");
  console.log("Your Admin and Clinic Staff logins were preserved.");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });