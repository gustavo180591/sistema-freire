/*
  Warnings:

  - A unique constraint covering the columns `[locationId,pointOfSale,receiptNumber]` on the table `receipts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "receipts_receiptNumber_receiptYear_key";

-- AlterTable
ALTER TABLE "receipt_location_configs" ADD COLUMN     "activityStartDate" DATE,
ADD COLUMN     "grossIncome" TEXT,
ADD COLUMN     "institutionCode" TEXT DEFAULT 'PAULO FREIRE',
ADD COLUMN     "institutionCodeNumber" TEXT DEFAULT '1117',
ADD COLUMN     "institutionEmail" TEXT,
ADD COLUMN     "institutionOwner" TEXT DEFAULT 'SIDEPP',
ADD COLUMN     "institutionWebsite" TEXT,
ADD COLUMN     "lastReceiptNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointOfSale" TEXT NOT NULL DEFAULT '0001',
ADD COLUMN     "signatureLeftLabel" TEXT NOT NULL DEFAULT 'Firma Secretaría',
ADD COLUMN     "signatureRightLabel" TEXT NOT NULL DEFAULT 'Firma Responsable',
ADD COLUMN     "taxStatus" TEXT DEFAULT 'IVA EXENTO';

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "institutionActivityStart" DATE,
ADD COLUMN     "institutionAddress" TEXT,
ADD COLUMN     "institutionCode" TEXT,
ADD COLUMN     "institutionCodeNumber" TEXT,
ADD COLUMN     "institutionCuit" TEXT,
ADD COLUMN     "institutionEmail" TEXT,
ADD COLUMN     "institutionGrossIncome" TEXT,
ADD COLUMN     "institutionName" TEXT,
ADD COLUMN     "institutionOwner" TEXT,
ADD COLUMN     "institutionPhone" TEXT,
ADD COLUMN     "institutionTaxStatus" TEXT,
ADD COLUMN     "institutionWebsite" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "pointOfSale" TEXT,
ADD COLUMN     "receiptLetter" TEXT,
ADD COLUMN     "signatureLeftLabel" TEXT,
ADD COLUMN     "signatureRightLabel" TEXT;

-- CreateIndex
CREATE INDEX "receipts_locationId_pointOfSale_receiptNumber_idx" ON "receipts"("locationId", "pointOfSale", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_locationId_pointOfSale_receiptNumber_key" ON "receipts"("locationId", "pointOfSale", "receiptNumber");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
