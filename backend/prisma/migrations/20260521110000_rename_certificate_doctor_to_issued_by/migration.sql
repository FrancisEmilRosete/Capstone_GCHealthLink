-- Rename doctorId → issuedById
ALTER TABLE "MedicalCertificate" RENAME COLUMN "doctorId" TO "issuedById";

-- Add issuedByRole column
ALTER TABLE "MedicalCertificate" ADD COLUMN IF NOT EXISTS "issuedByRole" TEXT NOT NULL DEFAULT 'DOCTOR';

-- Recreate index
DROP INDEX IF EXISTS "MedicalCertificate_doctorId_issuedAt_idx";
CREATE INDEX IF NOT EXISTS "MedicalCertificate_issuedById_issuedAt_idx" ON "MedicalCertificate"("issuedById", "issuedAt");

-- Make diagnosisFindings and recommendationsRemarks nullable (safe no-op if already nullable)
ALTER TABLE "MedicalCertificate" ALTER COLUMN "diagnosisFindings" DROP NOT NULL;
ALTER TABLE "MedicalCertificate" ALTER COLUMN "recommendationsRemarks" DROP NOT NULL;
