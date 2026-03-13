-- Add a privacy-safe standardized concern tag for analytics aggregation.
ALTER TABLE "ClinicVisit"
ADD COLUMN "concernTag" TEXT NOT NULL DEFAULT 'General Consultation';

CREATE INDEX "ClinicVisit_concernTag_visitDate_idx"
ON "ClinicVisit"("concernTag", "visitDate");
