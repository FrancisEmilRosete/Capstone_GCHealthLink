-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'CLINIC_STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "YearLevel" AS ENUM ('YR_1', 'YR_2', 'YR_3', 'YR_4');

-- CreateEnum
CREATE TYPE "XrayResult" AS ENUM ('NORMAL', 'ABNORMAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "qrToken" TEXT,
    "qrTokenIssuedAt" TIMESTAMP(3),
    "qrTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mi" TEXT,
    "courseDept" TEXT NOT NULL,
    "civilStatus" TEXT,
    "age" INTEGER,
    "sex" TEXT,
    "birthday" TIMESTAMP(3),
    "presentAddress" TEXT,
    "telNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyRelationship" TEXT,
    "emergencyContactAddress" TEXT,
    "emergencyContactTelNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "allergyEnc" TEXT,
    "asthmaEnc" TEXT,
    "chickenPoxEnc" TEXT,
    "diabetesEnc" TEXT,
    "dysmenorrheaEnc" TEXT,
    "epilepsySeizureEnc" TEXT,
    "heartDisorderEnc" TEXT,
    "hepatitisEnc" TEXT,
    "hypertensionEnc" TEXT,
    "measlesEnc" TEXT,
    "mumpsEnc" TEXT,
    "anxietyDisorderEnc" TEXT,
    "panicAttackHyperventilationEnc" TEXT,
    "pneumoniaEnc" TEXT,
    "ptbPrimaryComplexEnc" TEXT,
    "typhoidFeverEnc" TEXT,
    "covid19Enc" TEXT,
    "urinaryTractInfectionEnc" TEXT,
    "hasPastOperationEnc" TEXT,
    "operationNatureAndDateEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalExamination" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "yearLevel" "YearLevel" NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "bp" TEXT,
    "cr" TEXT,
    "rr" TEXT,
    "temp" TEXT,
    "weight" TEXT,
    "height" TEXT,
    "bmi" TEXT,
    "visualAcuity" TEXT,
    "skin" TEXT,
    "heent" TEXT,
    "chestLungs" TEXT,
    "heart" TEXT,
    "abdomen" TEXT,
    "extremities" TEXT,
    "others" TEXT,
    "examinedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalExamination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateReceived" TIMESTAMP(3),
    "hgb" TEXT,
    "hct" TEXT,
    "wbc" TEXT,
    "pltCt" TEXT,
    "bloodType" TEXT,
    "glucoseSugar" TEXT,
    "protein" TEXT,
    "xrayResult" "XrayResult",
    "xrayFindingsEnc" TEXT,
    "othersEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicVisit" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "handledById" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "visitTime" TEXT,
    "chiefComplaintEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitMedicine" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "reorderThreshold" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_studentNumber_key" ON "StudentProfile"("studentNumber");

-- CreateIndex
CREATE INDEX "StudentProfile_lastName_firstName_idx" ON "StudentProfile"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalHistory_studentProfileId_key" ON "MedicalHistory"("studentProfileId");

-- CreateIndex
CREATE INDEX "PhysicalExamination_studentProfileId_yearLevel_examDate_idx" ON "PhysicalExamination"("studentProfileId", "yearLevel", "examDate");

-- CreateIndex
CREATE INDEX "LabResult_studentProfileId_date_idx" ON "LabResult"("studentProfileId", "date");

-- CreateIndex
CREATE INDEX "ClinicVisit_studentProfileId_visitDate_idx" ON "ClinicVisit"("studentProfileId", "visitDate");

-- CreateIndex
CREATE INDEX "ClinicVisit_handledById_visitDate_idx" ON "ClinicVisit"("handledById", "visitDate");

-- CreateIndex
CREATE INDEX "VisitMedicine_visitId_idx" ON "VisitMedicine"("visitId");

-- CreateIndex
CREATE INDEX "VisitMedicine_inventoryId_idx" ON "VisitMedicine"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_itemName_key" ON "Inventory"("itemName");

-- CreateIndex
CREATE INDEX "Inventory_itemName_idx" ON "Inventory"("itemName");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_timestamp_idx" ON "AuditLog"("action", "timestamp");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalExamination" ADD CONSTRAINT "PhysicalExamination_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicVisit" ADD CONSTRAINT "ClinicVisit_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicVisit" ADD CONSTRAINT "ClinicVisit_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitMedicine" ADD CONSTRAINT "VisitMedicine_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitMedicine" ADD CONSTRAINT "VisitMedicine_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
