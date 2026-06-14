-- Add financial enums
CREATE TYPE "ReceiptStatus" AS ENUM ('ISSUED', 'CANCELLED');
CREATE TYPE "FinancialMovementType" AS ENUM ('CHARGE', 'PAYMENT', 'ALLOCATION', 'RECEIPT', 'CANCELLATION', 'ADJUSTMENT', 'LATE_FEE', 'DISCOUNT', 'SCHOLARSHIP');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "LateFeeType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "FinancialBlockType" AS ENUM ('ENROLLMENT', 'EXAM', 'COURSE', 'CERTIFICATE', 'REPORT', 'ALL');

-- Modify StudentCharge table - add new fields for financial calculations
ALTER TABLE "student_charges" 
  ADD COLUMN "lateFeeApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "scholarshipApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "finalAmount" DECIMAL(12,2) NOT NULL,
  ADD COLUMN "isOverdue" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "overdueSince" TIMESTAMP(3);

-- Make academicTermId NOT NULL in StudentCharge
ALTER TABLE "student_charges" 
  ALTER COLUMN "academicTermId" SET NOT NULL;

-- Add unique constraint to StudentCharge to prevent duplicate charges
CREATE UNIQUE INDEX "student_charges_studentId_conceptId_periodLabel_academicTermId_key" 
  ON "student_charges"("studentId", "conceptId", "periodLabel", "academicTermId");

-- Add indexes for StudentCharge
CREATE INDEX "student_charges_dueDate_idx" ON "student_charges"("dueDate");
CREATE INDEX "student_charges_isOverdue_idx" ON "student_charges"("isOverdue");

-- Modify Payment table - add fields for cancellation and receipt
ALTER TABLE "payments" 
  ADD COLUMN "receiptId" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" TEXT,
  ADD COLUMN "cancelledReason" TEXT,
  ADD COLUMN "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- Add unique constraint to Payment for method+reference to prevent duplicate references
CREATE UNIQUE INDEX "payment_method_reference_unique" 
  ON "payments"("method", "reference");

-- Add indexes for Payment (foreign key will be added after receipts table is created)
CREATE INDEX "payments_receiptId_idx" ON "payments"("receiptId");
CREATE INDEX "payments_isCancelled_idx" ON "payments"("isCancelled");

-- Modify PaymentAllocation - change ON DELETE to Restrict to prevent accidental deletion
ALTER TABLE "payment_allocations" 
  DROP CONSTRAINT "payment_allocations_chargeId_fkey",
  ADD CONSTRAINT "payment_allocations_chargeId_fkey" 
  FOREIGN KEY ("chargeId") REFERENCES "student_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_allocations" 
  DROP CONSTRAINT "payment_allocations_paymentId_fkey",
  ADD CONSTRAINT "payment_allocations_paymentId_fkey" 
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Modify Scholarship table - add fields for automatic application
ALTER TABLE "scholarships" 
  ADD COLUMN "applicableTo" TEXT[],
  ADD COLUMN "autoApply" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "maxMonthlyAmount" DECIMAL(12,2),
  ADD COLUMN "appliedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lastAppliedAt" TIMESTAMP(3);

-- Create Receipt table
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" INTEGER NOT NULL,
    "receiptYear" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentDni" TEXT,
    "studentAddress" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" TEXT NOT NULL,
    "issuedByName" TEXT NOT NULL,
    "observations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelledReason" TEXT,
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "originalCopy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- Create unique index on receiptNumber + receiptYear
CREATE UNIQUE INDEX "receipts_receiptNumber_receiptYear_key" ON "receipts"("receiptNumber", "receiptYear");

-- Create indexes for receipts
CREATE INDEX "receipts_studentId_idx" ON "receipts"("studentId");
CREATE INDEX "receipts_status_idx" ON "receipts"("status");

-- Create ReceiptItem table
CREATE TABLE "receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "chargeId" TEXT,
    "concept" TEXT NOT NULL,
    "periodLabel" TEXT,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "lateFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("id")
);

-- Create index for receipt_items
CREATE INDEX "receipt_items_receiptId_idx" ON "receipt_items"("receiptId");

-- Add foreign key for receipt_items.receiptId with RESTRICT
ALTER TABLE "receipt_items" 
  ADD CONSTRAINT "receipt_items_receiptId_fkey" 
  FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key for payments.receiptId with RESTRICT (added after receipts table is created)
ALTER TABLE "payments" 
  ADD CONSTRAINT "payments_receiptId_fkey" 
  FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create FinancialMovement table
CREATE TABLE "financial_movements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_movements_pkey" PRIMARY KEY ("id")
);

-- Create indexes for financial_movements
CREATE INDEX "financial_movements_studentId_createdAt_idx" ON "financial_movements"("studentId", "createdAt");
CREATE INDEX "financial_movements_movementType_idx" ON "financial_movements"("movementType");
CREATE INDEX "financial_movements_entityType_entityId_idx" ON "financial_movements"("entityType", "entityId");

-- Create Discount table
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "applicableTo" TEXT[],
    "minAmount" DECIMAL(12,2),
    "maxAmount" DECIMAL(12,2),
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- Create unique index on discounts.code
CREATE UNIQUE INDEX "discounts_code_key" ON "discounts"("code");

-- Create indexes for discounts
CREATE INDEX "discounts_active_idx" ON "discounts"("active");
CREATE INDEX "discounts_validFrom_validUntil_idx" ON "discounts"("validFrom", "validUntil");

-- Create LateFee table
CREATE TABLE "late_fees" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "chargeAmount" DECIMAL(12,2) NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "feeType" TEXT NOT NULL,
    "feeValue" DECIMAL(12,2) NOT NULL,
    "calculatedAmount" DECIMAL(12,2) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedBy" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "late_fees_pkey" PRIMARY KEY ("id")
);

-- Create indexes for late_fees
CREATE INDEX "late_fees_chargeId_idx" ON "late_fees"("chargeId");
CREATE INDEX "late_fees_appliedAt_idx" ON "late_fees"("appliedAt");

-- Add foreign key for late_fees.chargeId
ALTER TABLE "late_fees" 
  ADD CONSTRAINT "late_fees_chargeId_fkey" 
  FOREIGN KEY ("chargeId") REFERENCES "student_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create FinancialBlock table
CREATE TABLE "financial_blocks" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "blockReason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedBy" TEXT NOT NULL,
    "blockedByName" TEXT NOT NULL,
    "debtAmount" DECIMAL(12,2) NOT NULL,
    "overdueDays" INTEGER,
    "exceptionGranted" BOOLEAN NOT NULL DEFAULT false,
    "exceptionBy" TEXT,
    "exceptionAt" TIMESTAMP(3),
    "exceptionReason" TEXT,
    "unblockedAt" TIMESTAMP(3),
    "unblockedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_blocks_pkey" PRIMARY KEY ("id")
);

-- Create partial unique index for active blocks per student+type
-- This allows multiple inactive blocks (history) but only one active block per type
CREATE UNIQUE INDEX "financial_block_unique_active" 
  ON "financial_blocks"("studentId", "blockType") 
  WHERE "isActive" = true;

-- Create indexes for financial_blocks
CREATE INDEX "financial_blocks_studentId_isActive_idx" ON "financial_blocks"("studentId", "isActive");
CREATE INDEX "financial_blocks_blockType_idx" ON "financial_blocks"("blockType");
CREATE INDEX "financial_blocks_isActive_idx" ON "financial_blocks"("isActive");

-- Create FinancialConfig table
CREATE TABLE "financial_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "financial_config_pkey" PRIMARY KEY ("id")
);

-- Create unique index on financial_config.key
CREATE UNIQUE INDEX "financial_config_key_key" ON "financial_config"("key");

-- Create index for financial_config
CREATE INDEX "financial_config_category_idx" ON "financial_config"("category");

-- Create ReceiptNumber table for safe transactional numbering
CREATE TABLE "receipt_numbers" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_numbers_pkey" PRIMARY KEY ("id")
);

-- Create unique index on receipt_numbers.year
CREATE UNIQUE INDEX "receipt_numbers_year_key" ON "receipt_numbers"("year");
