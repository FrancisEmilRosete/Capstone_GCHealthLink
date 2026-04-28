-- CreateEnum
CREATE TYPE "ClinicStaffType" AS ENUM ('NURSE', 'DOCTOR', 'DENTIST');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clinicStaffType" "ClinicStaffType";

-- CreateIndex
CREATE INDEX "User_role_clinicStaffType_idx" ON "User"("role", "clinicStaffType");
