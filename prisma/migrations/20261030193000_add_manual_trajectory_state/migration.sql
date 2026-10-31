CREATE TYPE "AcademicTrajectoryManualState" AS ENUM (
  'TAKING',
  'RETAKING',
  'REGULAR',
  'FREE',
  'APPROVED'
);

ALTER TABLE "student_subject_status"
ADD COLUMN "manualTrajectoryState" "AcademicTrajectoryManualState",
ADD COLUMN "manualTrajectoryStateUpdatedAt" TIMESTAMP(3);

CREATE INDEX "student_subject_status_studentId_manualTrajectoryState_idx"
ON "student_subject_status"("studentId", "manualTrajectoryState");
