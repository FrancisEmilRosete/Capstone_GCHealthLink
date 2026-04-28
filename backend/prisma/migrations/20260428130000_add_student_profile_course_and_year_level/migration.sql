-- Add student academic profile fields.
ALTER TABLE "StudentProfile"
ADD COLUMN IF NOT EXISTS "course" TEXT,
ADD COLUMN IF NOT EXISTS "yearLevel" "YearLevel";
