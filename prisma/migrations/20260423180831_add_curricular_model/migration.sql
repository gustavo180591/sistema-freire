/*
  Warnings:

  - The primary key for the `subject_correlatives` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[subjectId,requiredSubjectId,careerId]` on the table `subject_correlatives` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trainingField` to the `careers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correlativeType` to the `subject_correlatives` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `subject_correlatives` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `subject_correlatives` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectType` to the `subjects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trainingField` to the `subjects` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TrainingField" AS ENUM ('GENERAL', 'ESPECIFICA', 'PRACTICA', 'EDI');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('COMMON', 'CAREER_SPECIFIC', 'EDI');

-- CreateEnum
CREATE TYPE "CorrelativeType" AS ENUM ('REGULAR', 'APROBADO', 'LIBRE', 'EQUIVALENCIA');

-- DropForeignKey
ALTER TABLE "subject_correlatives" DROP CONSTRAINT "subject_correlatives_requiredSubjectId_fkey";

-- DropIndex
DROP INDEX "subjects_name_idx";

-- AlterTable
ALTER TABLE "careers" ADD COLUMN     "durationYears" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "trainingField" "TrainingField" NOT NULL;

-- AlterTable
ALTER TABLE "subject_correlatives" DROP CONSTRAINT "subject_correlatives_pkey",
ADD COLUMN     "careerId" TEXT,
ADD COLUMN     "correlativeType" "CorrelativeType" NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "subject_correlatives_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "description" TEXT,
ADD COLUMN     "hoursPerWeek" INTEGER,
ADD COLUMN     "isElective" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRemedial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subjectType" "SubjectType" NOT NULL,
ADD COLUMN     "trainingField" "TrainingField" NOT NULL;

-- CreateTable
CREATE TABLE "career_subjects" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "yearLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "career_subjects_careerId_yearLevel_idx" ON "career_subjects"("careerId", "yearLevel");

-- CreateIndex
CREATE INDEX "career_subjects_subjectId_idx" ON "career_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "career_subjects_careerId_subjectId_key" ON "career_subjects"("careerId", "subjectId");

-- CreateIndex
CREATE INDEX "careers_trainingField_active_idx" ON "careers"("trainingField", "active");

-- CreateIndex
CREATE INDEX "subject_correlatives_subjectId_correlativeType_idx" ON "subject_correlatives"("subjectId", "correlativeType");

-- CreateIndex
CREATE INDEX "subject_correlatives_requiredSubjectId_idx" ON "subject_correlatives"("requiredSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_correlatives_subjectId_requiredSubjectId_careerId_key" ON "subject_correlatives"("subjectId", "requiredSubjectId", "careerId");

-- CreateIndex
CREATE INDEX "subjects_subjectType_yearLevel_idx" ON "subjects"("subjectType", "yearLevel");

-- CreateIndex
CREATE INDEX "subjects_trainingField_yearLevel_idx" ON "subjects"("trainingField", "yearLevel");

-- CreateIndex
CREATE INDEX "subjects_code_active_idx" ON "subjects"("code", "active");

-- AddForeignKey
ALTER TABLE "subject_correlatives" ADD CONSTRAINT "subject_correlatives_requiredSubjectId_fkey" FOREIGN KEY ("requiredSubjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_correlatives" ADD CONSTRAINT "subject_correlatives_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_subjects" ADD CONSTRAINT "career_subjects_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_subjects" ADD CONSTRAINT "career_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
