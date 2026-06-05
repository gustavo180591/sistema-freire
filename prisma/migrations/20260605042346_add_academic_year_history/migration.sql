/*
  Warnings:

  - Made the column `approvalThreshold` on table `subjects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `promotionThreshold` on table `subjects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isAnnual` on table `subjects` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('ENROLLED', 'ACTIVE', 'PROMOTED', 'REPEATED', 'DROPPED_OUT', 'GRADUATED');

-- DropIndex
DROP INDEX "careers_trainingField_active_idx";

-- AlterTable
ALTER TABLE "careers" ALTER COLUMN "trainingField" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "academicTermId" TEXT;

-- AlterTable
ALTER TABLE "student_charges" ADD COLUMN     "academicTermId" TEXT;

-- AlterTable
ALTER TABLE "student_subject_status" ADD COLUMN     "finalGrade" DECIMAL(5,2),
ADD COLUMN     "promoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "approvalThreshold" SET NOT NULL,
ALTER COLUMN "promotionThreshold" SET NOT NULL,
ALTER COLUMN "isAnnual" SET NOT NULL;

-- CreateTable
CREATE TABLE "academic_year_history" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "careerId" TEXT NOT NULL,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'ENROLLED',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_year_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_year_history_studentId_year_idx" ON "academic_year_history"("studentId", "year");

-- CreateIndex
CREATE INDEX "academic_year_history_careerId_year_idx" ON "academic_year_history"("careerId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "academic_year_history_studentId_year_key" ON "academic_year_history"("studentId", "year");

-- CreateIndex
CREATE INDEX "careers_active_idx" ON "careers"("active");

-- CreateIndex
CREATE INDEX "payments_academicTermId_idx" ON "payments"("academicTermId");

-- CreateIndex
CREATE INDEX "student_charges_academicTermId_idx" ON "student_charges"("academicTermId");

-- CreateIndex
CREATE INDEX "student_subject_status_studentId_promoted_idx" ON "student_subject_status"("studentId", "promoted");

-- AddForeignKey
ALTER TABLE "academic_year_history" ADD CONSTRAINT "academic_year_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
