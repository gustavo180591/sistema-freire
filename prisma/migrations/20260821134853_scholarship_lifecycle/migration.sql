-- CreateEnum
CREATE TYPE "ScholarshipStatus" AS ENUM ('ACTIVE', 'SUSPENDED_DEBT', 'NEGOTIATION', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScholarshipNegotiationStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "reinstatedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ScholarshipStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "scholarship_history" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "previousStatus" "ScholarshipStatus",
    "newStatus" "ScholarshipStatus" NOT NULL,
    "previousPercentage" DECIMAL(5,2),
    "newPercentage" DECIMAL(5,2),
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "changedByUserId" TEXT,
    "changedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scholarship_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_negotiations" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ScholarshipNegotiationStatus" NOT NULL DEFAULT 'OPEN',
    "previousPercentage" DECIMAL(5,2) NOT NULL,
    "requestedPercentage" DECIMAL(5,2),
    "approvedPercentage" DECIMAL(5,2),
    "debtAtRequest" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "conditions" TEXT,
    "resolutionNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "scholarship_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scholarship_history_scholarshipId_createdAt_idx" ON "scholarship_history"("scholarshipId", "createdAt");

-- CreateIndex
CREATE INDEX "scholarship_history_studentId_createdAt_idx" ON "scholarship_history"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "scholarship_negotiations_studentId_status_idx" ON "scholarship_negotiations"("studentId", "status");

-- CreateIndex
CREATE INDEX "scholarship_negotiations_scholarshipId_requestedAt_idx" ON "scholarship_negotiations"("scholarshipId", "requestedAt");

-- CreateIndex
CREATE INDEX "scholarships_studentId_status_idx" ON "scholarships"("studentId", "status");

-- CreateIndex
CREATE INDEX "scholarships_status_idx" ON "scholarships"("status");

-- AddForeignKey
ALTER TABLE "scholarship_history" ADD CONSTRAINT "scholarship_history_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_history" ADD CONSTRAINT "scholarship_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_history" ADD CONSTRAINT "scholarship_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_negotiations" ADD CONSTRAINT "scholarship_negotiations_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_negotiations" ADD CONSTRAINT "scholarship_negotiations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_negotiations" ADD CONSTRAINT "scholarship_negotiations_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_negotiations" ADD CONSTRAINT "scholarship_negotiations_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Becas históricas inactivas no deben aparecer como activas
-- en el nuevo ciclo de vida.
UPDATE "scholarships"
SET "status" = 'CANCELLED'::"ScholarshipStatus"
WHERE "active" = FALSE;
