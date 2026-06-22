/*
  Proposed Clean Migration for Payment Agreements Phase 1
  This migration contains ONLY Payment Agreements changes, no academic drift.
  
  Extracted from: prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql
  Academic changes removed: AcademicStatus, CourseStatus, FinalExamStatus, evaluations, grades, student_subject_status, subject_enrollments
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
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinancialMovementType" ADD VALUE 'PAYMENT_AGREEMENT';
ALTER TYPE "FinancialMovementType" ADD VALUE 'AGREEMENT_INSTALLMENT';

-- AlterTable
ALTER TABLE "discounts" DROP COLUMN "discountType",
ADD COLUMN     "discountType" "DiscountType" NOT NULL;

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

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "payment_agreement_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "payment_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_blocks" ADD CONSTRAINT "financial_blocks_exceptionAgreementId_fkey" FOREIGN KEY ("exceptionAgreementId") REFERENCES "payment_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
