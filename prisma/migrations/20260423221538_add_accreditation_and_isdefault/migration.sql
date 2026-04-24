-- CreateEnum
CREATE TYPE "AccreditationMode" AS ENUM ('PROMOCIONAL', 'EXAMEN_FINAL', 'PROMOCIONAL_SIN_FINAL');

-- AlterTable
ALTER TABLE "study_plans" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "accreditationMode" "AccreditationMode" NOT NULL DEFAULT 'EXAMEN_FINAL';
