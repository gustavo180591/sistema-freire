-- CreateTable
CREATE TABLE "receipt_location_configs" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "institutionName" TEXT,
    "institutionAddress" TEXT,
    "institutionCuit" TEXT,
    "institutionPhone" TEXT,
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "receiptLetter" TEXT NOT NULL DEFAULT 'C',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_location_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipt_location_configs_locationId_key" ON "receipt_location_configs"("locationId");

-- AddForeignKey
ALTER TABLE "receipt_location_configs" ADD CONSTRAINT "receipt_location_configs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
