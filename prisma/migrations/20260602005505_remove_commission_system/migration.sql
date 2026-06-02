/*
  Warnings:

  - You are about to drop the column `commissionId` on the `attendance_records` table. All the data in the column will be lost.
  - You are about to drop the column `commissionId` on the `class_materials` table. All the data in the column will be lost.
  - You are about to drop the column `commissionId` on the `evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `commissionId` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the `academic_terms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `commission_teachers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `commissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `enrollments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[subjectId,classDate]` on the table `attendance_records` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subjectId` to the `attendance_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `class_materials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `evaluations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `grades` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_commissionId_fkey";

-- DropForeignKey
ALTER TABLE "class_materials" DROP CONSTRAINT "class_materials_commissionId_fkey";

-- DropForeignKey
ALTER TABLE "commission_teachers" DROP CONSTRAINT "commission_teachers_commissionId_fkey";

-- DropForeignKey
ALTER TABLE "commission_teachers" DROP CONSTRAINT "commission_teachers_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_termId_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_commissionId_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_studentId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_commissionId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_commissionId_fkey";

-- DropIndex
DROP INDEX "attendance_records_commissionId_classDate_key";

-- DropIndex
DROP INDEX "class_materials_commissionId_idx";

-- DropIndex
DROP INDEX "evaluations_commissionId_idx";

-- DropIndex
DROP INDEX "grades_studentId_commissionId_idx";

-- AlterTable
ALTER TABLE "attendance_records" DROP COLUMN "commissionId",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "class_materials" DROP COLUMN "commissionId",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "commissionId",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "commissionId",
ADD COLUMN     "subjectId" TEXT NOT NULL;

-- DropTable
DROP TABLE "academic_terms";

-- DropTable
DROP TABLE "commission_teachers";

-- DropTable
DROP TABLE "commissions";

-- DropTable
DROP TABLE "enrollments";

-- CreateTable
CREATE TABLE "subject_teachers" (
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "subject_teachers_pkey" PRIMARY KEY ("subjectId","teacherId")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_subjectId_classDate_key" ON "attendance_records"("subjectId", "classDate");

-- CreateIndex
CREATE INDEX "class_materials_subjectId_idx" ON "class_materials"("subjectId");

-- CreateIndex
CREATE INDEX "evaluations_subjectId_idx" ON "evaluations"("subjectId");

-- CreateIndex
CREATE INDEX "grades_studentId_subjectId_idx" ON "grades"("studentId", "subjectId");

-- AddForeignKey
ALTER TABLE "subject_teachers" ADD CONSTRAINT "subject_teachers_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_teachers" ADD CONSTRAINT "subject_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
