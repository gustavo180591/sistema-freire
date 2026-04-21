-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'CERTIFICATE', 'CONSTANCY', 'SECONDARY_TITLE', 'PHOTO_ID', 'MEDICAL_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('INTERVIEW', 'OBSERVATION', 'WARNING', 'MEETING', 'INCIDENT', 'ACHIEVEMENT', 'NOTE');

-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'PRECEPTOR';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "currentYear" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedAttempt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "roleCode" "RoleCode" NOT NULL,
    "entity" TEXT NOT NULL,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_followups" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "isAlert" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_followups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permissions_roleCode_idx" ON "permissions"("roleCode");

-- CreateIndex
CREATE INDEX "permissions_entity_idx" ON "permissions"("entity");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_roleCode_entity_key" ON "permissions"("roleCode", "entity");

-- CreateIndex
CREATE INDEX "student_documents_studentId_type_idx" ON "student_documents"("studentId", "type");

-- CreateIndex
CREATE INDEX "student_followups_studentId_date_idx" ON "student_followups"("studentId", "date");

-- CreateIndex
CREATE INDEX "student_followups_studentId_type_idx" ON "student_followups"("studentId", "type");

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_followups" ADD CONSTRAINT "student_followups_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_followups" ADD CONSTRAINT "student_followups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_followups" ADD CONSTRAINT "student_followups_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
