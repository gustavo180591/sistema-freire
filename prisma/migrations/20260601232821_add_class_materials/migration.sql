-- CreateTable
CREATE TABLE "class_materials" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_materials_commissionId_idx" ON "class_materials"("commissionId");

-- CreateIndex
CREATE INDEX "class_materials_uploadedBy_idx" ON "class_materials"("uploadedBy");

-- AddForeignKey
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "commissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
