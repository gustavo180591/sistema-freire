-- CreateEnum
CREATE TYPE "DocumentOwnerType" AS ENUM ('STUDENT', 'TEACHER', 'STAFF', 'USER', 'INSTITUTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('ACADEMIC', 'FINANCIAL', 'ADMINISTRATIVE', 'LEGAL', 'MEDICAL', 'CERTIFICATE', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentSubType" AS ENUM ('ENROLLMENT_CERTIFICATE', 'STUDY_CERTIFICATE', 'GRADE_REPORT', 'DIPLOMA', 'TRANSCRIPT', 'RECEIPT', 'INVOICE', 'PAYMENT_PROOF', 'SCHOLARSHIP_DOCUMENT', 'IDENTITY_DOCUMENT', 'TAX_DOCUMENT', 'RESIDENCE_PROOF', 'EMPLOYMENT_RECORD', 'CONTRACT', 'AGREEMENT', 'POWER_OF_ATTORNEY', 'COURT_DOCUMENT', 'ATTENDANCE_CERTIFICATE', 'GOOD_CONDUCT_CERTIFICATE', 'COMPLETION_CERTIFICATE', 'GENERAL', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'REPLACED', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE', 'INTERNAL', 'PUBLIC');

-- CreateEnum
CREATE TYPE "DocumentAccessAction" AS ENUM ('UPLOAD', 'VIEW', 'DOWNLOAD', 'UPDATE', 'DELETE', 'RESTORE');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hash" TEXT,
    "ownerType" "DocumentOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "subType" "DocumentSubType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" TEXT[],

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_access_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "DocumentAccessAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_storageKey_key" ON "documents"("storageKey");

-- CreateIndex
CREATE INDEX "documents_ownerType_ownerId_idx" ON "documents"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_subType_idx" ON "documents"("subType");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_visibility_idx" ON "documents"("visibility");

-- CreateIndex
CREATE INDEX "documents_uploadedById_idx" ON "documents"("uploadedById");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "documents_deletedAt_idx" ON "documents"("deletedAt");

-- CreateIndex
CREATE INDEX "document_access_logs_documentId_idx" ON "document_access_logs"("documentId");

-- CreateIndex
CREATE INDEX "document_access_logs_userId_idx" ON "document_access_logs"("userId");

-- CreateIndex
CREATE INDEX "document_access_logs_action_idx" ON "document_access_logs"("action");

-- CreateIndex
CREATE INDEX "document_access_logs_createdAt_idx" ON "document_access_logs"("createdAt");

-- CreateIndex
CREATE INDEX "document_access_logs_documentId_createdAt_idx" ON "document_access_logs"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

