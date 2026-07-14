-- CreateEnum
CREATE TYPE "DischargeReason" AS ENUM ('VOLUNTARY_WITHDRAWAL', 'ACADEMIC_DISMISSAL', 'FINANCIAL_DISMISSAL', 'DISCIPLINARY_DISMISSAL', 'TRANSFER', 'DECEASED', 'OTHER');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "dischargeDate" TIMESTAMP(3),
ADD COLUMN     "dischargeNotes" TEXT,
ADD COLUMN     "dischargeReason" "DischargeReason",
ADD COLUMN     "dischargedBy" TEXT;
