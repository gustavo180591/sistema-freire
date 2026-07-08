-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "students_locationId_idx" ON "students"("locationId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
