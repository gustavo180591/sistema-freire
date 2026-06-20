/*
  Warnings:

  - The values [APPROVED,FAILED,DROPPED] on the enum `AcademicStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [APPROVED,FAILED,DROPPED] on the enum `CourseStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [APPROVED,EXEMPT] on the enum `FinalExamStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `maxScore` on the `evaluations` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(6,2)`.
  - You are about to alter the column `minPassingScore` on the `evaluations` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(6,2)`.
  - You are about to alter the column `weight` on the `evaluations` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(6,2)`.
  - You are about to drop the column `subjectId` on the `grades` table. All the data in the column will be lost.
  - The `status` column on the `receipts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `courseAverage` on the `student_subject_status` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `finalExamScore` on the `student_subject_status` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - The `status` column on the `subject_enrollments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `discountType` on the `discounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `evaluations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `blockType` on the `financial_blocks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `movementType` on the `financial_movements` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `entityId` on table `financial_movements` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `feeType` on the `late_fees` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentMethod` on the `receipts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PaymentAgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'DEFAULTED', 'CANCELLED', 'REFINANCED');

-- CreateEnum
CREATE TYPE "PaymentAgreementInstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentAgreementChargeRelationType" AS ENUM ('REFINANCED', 'BLOCKED', 'ASSOCIATED');

-- CreateEnum
CREATE TYPE "PaymentAgreementEventType" AS ENUM ('CREATED', 'ACTIVATED', 'MODIFIED', 'CANCELLED', 'REFINANCED', 'INSTALLMENT_PAID', 'INSTALLMENT_OVERDUE', 'DEFAULTED', 'STATUS_CHANGED', 'BLOCK_EXCEPTION', 'BLOCK_REACTIVATED');

-- CreateEnum
CREATE TYPE "FinancialBlockExceptionSource" AS ENUM ('MANUAL', 'PAYMENT_AGREEMENT');

-- AlterEnum
BEGIN;
CREATE TYPE "AcademicStatus_new" AS ENUM ('EN_COURSE', 'REGULAR', 'LIBRE', 'APROBADO', 'PROMOCIONADO');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "academicStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "academicStatus" TYPE "AcademicStatus_new" USING ("academicStatus"::text::"AcademicStatus_new");
ALTER TYPE "AcademicStatus" RENAME TO "AcademicStatus_old";
ALTER TYPE "AcademicStatus_new" RENAME TO "AcademicStatus";
DROP TYPE "public"."AcademicStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "academicStatus" SET DEFAULT 'EN_COURSE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CourseStatus_new" AS ENUM ('IN_PROGRESS', 'PASSED_COURSE', 'FAILED_COURSE', 'PROMOTED');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "courseStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "courseStatus" TYPE "CourseStatus_new" USING ("courseStatus"::text::"CourseStatus_new");
ALTER TYPE "CourseStatus" RENAME TO "CourseStatus_old";
ALTER TYPE "CourseStatus_new" RENAME TO "CourseStatus";
DROP TYPE "public"."CourseStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "courseStatus" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "FinalExamStatus_new" AS ENUM ('PENDING', 'NOT_REQUIRED', 'PASSED', 'FAILED');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "finalExamStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "finalExamStatus" TYPE "FinalExamStatus_new" USING ("finalExamStatus"::text::"FinalExamStatus_new");
ALTER TYPE "FinalExamStatus" RENAME TO "FinalExamStatus_old";
ALTER TYPE "FinalExamStatus_new" RENAME TO "FinalExamStatus";
DROP TYPE "public"."FinalExamStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "finalExamStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinancialMovementType" ADD VALUE 'PAYMENT_AGREEMENT';
ALTER TYPE "FinancialMovementType" ADD VALUE 'AGREEMENT_INSTALLMENT';

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_parentEvaluationId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "student_charges" DROP CONSTRAINT "student_charges_academicTermId_fkey";

-- DropForeignKey
ALTER TABLE "subject_enrollments" DROP CONSTRAINT "subject_enrollments_careerId_fkey";

-- DropIndex
DROP INDEX "student_subject_status_studentId_promoted_idx";

-- AlterTable
ALTER TABLE "discounts" DROP COLUMN "discountType",
ADD COLUMN     "discountType" "DiscountType" NOT NULL;

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "type",
ADD COLUMN     "type" "EvaluationType" NOT NULL,
ALTER COLUMN "maxScore" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "minPassingScore" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "weight" SET DATA TYPE DECIMAL(6,2);

-- AlterTable
ALTER TABLE "financial_blocks" ADD COLUMN     "exceptionAgreementId" TEXT,
ADD COLUMN     "exceptionSource" "FinancialBlockExceptionSource",
DROP COLUMN "blockType",
ADD COLUMN     "blockType" "FinancialBlockType" NOT NULL;

-- AlterTable
ALTER TABLE "financial_movements" DROP COLUMN "movementType",
ADD COLUMN     "movementType" "FinancialMovementType" NOT NULL,
ALTER COLUMN "entityId" SET NOT NULL;

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "subjectId";

-- AlterTable
ALTER TABLE "late_fees" DROP COLUMN "feeType",
ADD COLUMN     "feeType" "LateFeeType" NOT NULL;

-- AlterTable
ALTER TABLE "payment_allocations" ADD COLUMN     "installmentId" TEXT;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "agreementId" TEXT,
ADD COLUMN     "agreementNumber" INTEGER,
ADD COLUMN     "installmentNumber" INTEGER,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'ISSUED';

-- AlterTable
ALTER TABLE "student_subject_status" ALTER COLUMN "courseAverage" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "finalExamScore" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "subject_enrollments" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "enrolledBy" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "payment_agreements" (
    "id" TEXT NOT NULL,
    "agreementNumber" INTEGER NOT NULL,
    "agreementYear" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentDni" TEXT,
    "originalDebt" DECIMAL(12,2) NOT NULL,
    "agreedAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "status" "PaymentAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "observations" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "activatedBy" TEXT,
    "activatedByName" TEXT,
    "cancelledBy" TEXT,
    "cancelledByName" TEXT,
    "cancelledReason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "payment_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_agreement_installments" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentAgreementInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "overdueSince" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "payment_agreement_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_agreement_charge_relations" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "originalChargeAmount" DECIMAL(12,2) NOT NULL,
    "originalChargePaidAmount" DECIMAL(12,2) NOT NULL,
    "originalChargeStatus" TEXT NOT NULL,
    "amountIncluded" DECIMAL(12,2) NOT NULL,
    "newStatus" "ChargeStatus",
    "relationType" "PaymentAgreementChargeRelationType" NOT NULL DEFAULT 'REFINANCED',

    CONSTRAINT "payment_agreement_charge_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_agreement_events" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "eventType" "PaymentAgreementEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "previousStatus" "PaymentAgreementStatus",
    "newStatus" "PaymentAgreementStatus",
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_agreement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_agreement_numbers" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_agreement_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_agreements_studentId_idx" ON "payment_agreements"("studentId");

-- CreateIndex
CREATE INDEX "payment_agreements_status_idx" ON "payment_agreements"("status");

-- CreateIndex
CREATE INDEX "payment_agreements_createdAt_idx" ON "payment_agreements"("createdAt");

-- CreateIndex
CREATE INDEX "payment_agreements_studentId_status_idx" ON "payment_agreements"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_agreements_agreementNumber_agreementYear_key" ON "payment_agreements"("agreementNumber", "agreementYear");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_agreementId_idx" ON "payment_agreement_installments"("agreementId");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_dueDate_idx" ON "payment_agreement_installments"("dueDate");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_status_idx" ON "payment_agreement_installments"("status");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_agreementId_status_idx" ON "payment_agreement_installments"("agreementId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_agreement_installments_agreementId_installmentNumbe_key" ON "payment_agreement_installments"("agreementId", "installmentNumber");

-- CreateIndex
CREATE INDEX "payment_agreement_charge_relations_agreementId_idx" ON "payment_agreement_charge_relations"("agreementId");

-- CreateIndex
CREATE INDEX "payment_agreement_charge_relations_chargeId_idx" ON "payment_agreement_charge_relations"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_agreement_charge_relations_agreementId_chargeId_key" ON "payment_agreement_charge_relations"("agreementId", "chargeId");

-- CreateIndex
CREATE INDEX "payment_agreement_events_agreementId_idx" ON "payment_agreement_events"("agreementId");

-- CreateIndex
CREATE INDEX "payment_agreement_events_eventType_idx" ON "payment_agreement_events"("eventType");

-- CreateIndex
CREATE INDEX "payment_agreement_events_createdAt_idx" ON "payment_agreement_events"("createdAt");

-- CreateIndex
CREATE INDEX "payment_agreement_events_agreementId_createdAt_idx" ON "payment_agreement_events"("agreementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_agreement_numbers_year_key" ON "payment_agreement_numbers"("year");

-- CreateIndex
CREATE INDEX "financial_blocks_blockType_idx" ON "financial_blocks"("blockType");

-- CreateIndex
CREATE INDEX "financial_blocks_exceptionSource_idx" ON "financial_blocks"("exceptionSource");

-- CreateIndex
CREATE INDEX "financial_blocks_exceptionAgreementId_idx" ON "financial_blocks"("exceptionAgreementId");

-- CreateIndex
CREATE INDEX "financial_movements_movementType_idx" ON "financial_movements"("movementType");

-- CreateIndex
CREATE INDEX "payment_allocations_installmentId_idx" ON "payment_allocations"("installmentId");

-- CreateIndex
CREATE INDEX "receipts_receiptNumber_receiptYear_idx" ON "receipts"("receiptNumber", "receiptYear");

-- CreateIndex
CREATE INDEX "receipts_status_idx" ON "receipts"("status");

-- CreateIndex
CREATE INDEX "receipts_agreementId_idx" ON "receipts"("agreementId");

-- CreateIndex
CREATE INDEX "subject_enrollments_studentId_status_idx" ON "subject_enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX "subject_enrollments_subjectId_status_idx" ON "subject_enrollments"("subjectId", "status");

-- CreateIndex
CREATE INDEX "subject_enrollments_academicTermId_status_idx" ON "subject_enrollments"("academicTermId", "status");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "payment_agreement_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "payment_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_blocks" ADD CONSTRAINT "financial_blocks_exceptionAgreementId_fkey" FOREIGN KEY ("exceptionAgreementId") REFERENCES "payment_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_parentEvaluationId_fkey" FOREIGN KEY ("parentEvaluationId") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_enrollments" ADD CONSTRAINT "subject_enrollments_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_agreement_installments" ADD CONSTRAINT "payment_agreement_installments_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "payment_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_agreement_charge_relations" ADD CONSTRAINT "payment_agreement_charge_relations_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "payment_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_agreement_charge_relations" ADD CONSTRAINT "payment_agreement_charge_relations_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "student_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_agreement_events" ADD CONSTRAINT "payment_agreement_events_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "payment_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "payment_method_reference_unique" RENAME TO "payments_method_reference_key";

-- RenameIndex
ALTER INDEX "student_charges_studentId_conceptId_periodLabel_academicTermId_" RENAME TO "student_charges_studentId_conceptId_periodLabel_academicTer_key";
