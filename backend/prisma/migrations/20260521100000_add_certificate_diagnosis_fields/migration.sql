-- Normalize MedicalCertificate certificate type and required body fields.
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_type WHERE typname = 'MedicalCertificateType'
	) THEN
		CREATE TYPE "MedicalCertificateType" AS ENUM ('consultation', 'physical_examination');
	END IF;
END $$;

ALTER TABLE "MedicalCertificate"
	ADD COLUMN IF NOT EXISTS "diagnosisFindings" TEXT,
	ADD COLUMN IF NOT EXISTS "recommendationsRemarks" TEXT;

UPDATE "MedicalCertificate"
SET
	"diagnosisFindings" = COALESCE(NULLIF(TRIM("diagnosisFindings"), ''), NULLIF(TRIM("remarks"), ''), 'Not specified'),
	"recommendationsRemarks" = COALESCE(NULLIF(TRIM("recommendationsRemarks"), ''), NULLIF(TRIM("remarks"), ''), 'None');

ALTER TABLE "MedicalCertificate"
	ALTER COLUMN "diagnosisFindings" SET NOT NULL,
	ALTER COLUMN "recommendationsRemarks" SET NOT NULL;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'MedicalCertificate'
			AND column_name = 'certificateType'
			AND udt_name <> 'MedicalCertificateType'
	) THEN
		ALTER TABLE "MedicalCertificate"
			ALTER COLUMN "certificateType" DROP DEFAULT;

		ALTER TABLE "MedicalCertificate"
			ALTER COLUMN "certificateType" TYPE "MedicalCertificateType"
			USING (
				CASE UPPER(COALESCE("certificateType", 'CONSULTATION'))
					WHEN 'PHYSICAL_EXAM' THEN 'physical_examination'::"MedicalCertificateType"
					WHEN 'PHYSICAL_EXAMINATION' THEN 'physical_examination'::"MedicalCertificateType"
					ELSE 'consultation'::"MedicalCertificateType"
				END
			);
	END IF;
END $$;

ALTER TABLE "MedicalCertificate"
	ALTER COLUMN "certificateType" SET DEFAULT 'consultation';
