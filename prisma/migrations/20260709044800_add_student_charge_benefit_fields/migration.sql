-- AlterTable
ALTER TABLE "student_charges" ADD COLUMN     "benefitReason" TEXT,
ADD COLUMN     "benefitType" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "ruleSnapshot" JSONB;
