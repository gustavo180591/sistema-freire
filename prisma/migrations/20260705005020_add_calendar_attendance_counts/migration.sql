-- AlterTable
ALTER TABLE "holidays" ADD COLUMN     "countsAttendance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "important_dates" ADD COLUMN     "countsAttendance" BOOLEAN NOT NULL DEFAULT false;
