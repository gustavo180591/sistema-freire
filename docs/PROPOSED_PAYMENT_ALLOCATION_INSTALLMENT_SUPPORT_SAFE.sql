-- Migration: Fix PaymentAllocation to support agreement installment payments
-- This migration preserves existing 7 rows and allows chargeId to be null for agreement payments
-- Current state: 7 rows, no null chargeId, no duplicates by (paymentId, chargeId)

-- Step 1: add id as nullable first to preserve existing rows
ALTER TABLE "payment_allocations"
ADD COLUMN "id" TEXT;

-- Step 2: backfill deterministic ids for existing rows
-- Using md5 of paymentId:chargeId to generate unique ids
-- Verified: no collisions in existing 7 rows
UPDATE "payment_allocations"
SET "id" = 'pa_' || md5("paymentId" || ':' || "chargeId")
WHERE "id" IS NULL;

-- Step 3: make id required
ALTER TABLE "payment_allocations"
ALTER COLUMN "id" SET NOT NULL;

-- Step 4: add createdAt with safe default
ALTER TABLE "payment_allocations"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 5: drop old composite primary key (paymentId, chargeId)
ALTER TABLE "payment_allocations"
DROP CONSTRAINT "payment_allocations_pkey";

-- Step 6: make chargeId nullable to support agreement installment payments
ALTER TABLE "payment_allocations"
ALTER COLUMN "chargeId" DROP NOT NULL;

-- Step 7: add new primary key on id
ALTER TABLE "payment_allocations"
ADD CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id");

-- Step 8: create indexes for paymentId and chargeId
-- installmentId index already exists, skipping recreation
CREATE INDEX "payment_allocations_paymentId_idx"
ON "payment_allocations"("paymentId");

CREATE INDEX "payment_allocations_chargeId_idx"
ON "payment_allocations"("chargeId");

-- Step 9: uniqueness rules
-- Allow multiple allocations per payment, but unique per payment/charge or payment/installment
CREATE UNIQUE INDEX "payment_allocations_paymentId_chargeId_key"
ON "payment_allocations"("paymentId", "chargeId");

CREATE UNIQUE INDEX "payment_allocations_paymentId_installmentId_key"
ON "payment_allocations"("paymentId", "installmentId");
