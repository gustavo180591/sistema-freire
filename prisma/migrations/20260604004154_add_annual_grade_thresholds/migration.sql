-- AlterTable
ALTER TABLE "student_subject_status" ADD COLUMN     "finalGrade" DECIMAL(5,2),
ADD COLUMN     "promoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "approvalThreshold" DECIMAL(3,2) NOT NULL DEFAULT 6,
ADD COLUMN     "isAnnual" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "promotionThreshold" DECIMAL(3,2) NOT NULL DEFAULT 8;

-- CreateIndex
CREATE INDEX "student_subject_status_studentId_promoted_idx" ON "student_subject_status"("studentId", "promoted");
