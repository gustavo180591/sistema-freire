/*
  Warnings:

  - A unique constraint covering the columns `[classScheduleId,classDate]` on the table `attendance_records` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED');

-- DropIndex
DROP INDEX "attendance_records_subjectId_classDate_commissionId_key";

-- AlterTable
ALTER TABLE "attendance_entries" ADD COLUMN     "status" "AttendanceStatus";

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "classScheduleId" TEXT;

-- CreateIndex
CREATE INDEX "attendance_entries_status_idx" ON "attendance_entries"("status");

-- CreateIndex
CREATE INDEX "attendance_records_subjectId_commissionId_classDate_idx" ON "attendance_records"("subjectId", "commissionId", "classDate");

-- CreateIndex
CREATE INDEX "attendance_records_commissionId_classDate_idx" ON "attendance_records"("commissionId", "classDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_classScheduleId_classDate_key" ON "attendance_records"("classScheduleId", "classDate");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_classScheduleId_fkey" FOREIGN KEY ("classScheduleId") REFERENCES "class_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar históricos del modelo booleano al nuevo estado formal.
UPDATE "attendance_entries"
SET "status" =
  CASE
    WHEN "present" = TRUE THEN 'PRESENT'::"AttendanceStatus"
    ELSE 'ABSENT'::"AttendanceStatus"
  END
WHERE "status" IS NULL;
