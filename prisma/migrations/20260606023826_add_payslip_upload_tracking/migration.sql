-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "fileKey" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "uploadedBy" TEXT;

-- CreateIndex
CREATE INDEX "payslips_uploadedBy_idx" ON "payslips"("uploadedBy");

-- CreateIndex
CREATE INDEX "payslips_deletedAt_idx" ON "payslips"("deletedAt");

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
