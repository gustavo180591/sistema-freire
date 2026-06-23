-- AlterTable
ALTER TABLE "payment_allocations" DROP CONSTRAINT "payment_allocations_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "chargeId" DROP NOT NULL,
ADD CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "payment_allocations_paymentId_idx" ON "payment_allocations"("paymentId");

-- CreateIndex
CREATE INDEX "payment_allocations_chargeId_idx" ON "payment_allocations"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_paymentId_chargeId_key" ON "payment_allocations"("paymentId", "chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_paymentId_installmentId_key" ON "payment_allocations"("paymentId", "installmentId");

