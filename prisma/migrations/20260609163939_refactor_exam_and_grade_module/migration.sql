-- Add enums for exam and grade module
CREATE TYPE "EvaluationType" AS ENUM ('PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR', 'RECUPERATORIO', 'MESA_EXAMEN');
CREATE TYPE "GradeStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');
CREATE TYPE "CourseStatus" AS ENUM ('IN_PROGRESS', 'APPROVED', 'FAILED', 'DROPPED');
CREATE TYPE "FinalExamStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'EXEMPT');
CREATE TYPE "AcademicStatus" AS ENUM ('EN_COURSE', 'APPROVED', 'FAILED', 'DROPPED');

-- Transform evaluations table to complete schema
-- Drop old foreign keys and indexes
ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "evaluations_subjectId_fkey";
ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "evaluations_createdBy_fkey";
DROP INDEX IF EXISTS "evaluations_subjectId_idx";
DROP INDEX IF EXISTS "evaluations_createdBy_idx";

-- Add new columns (subjectId already exists from remove_commission_system migration)
ALTER TABLE "evaluations" 
  ADD COLUMN IF NOT EXISTS "commissionId" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluationDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "minPassingScore" DOUBLE PRECISION DEFAULT 6,
  ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "parentEvaluationId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "isClosed" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "closedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reopenedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "reopenReason" TEXT;

-- Migrate data from old columns to new columns
UPDATE "evaluations" SET "evaluationDate" = "date" WHERE "date" IS NOT NULL;
UPDATE "evaluations" SET "createdByUserId" = "createdBy" WHERE "createdBy" IS NOT NULL;

-- Drop old columns
ALTER TABLE "evaluations" DROP COLUMN IF EXISTS "date";
ALTER TABLE "evaluations" DROP COLUMN IF EXISTS "createdBy";

-- Make new columns NOT NULL where appropriate
ALTER TABLE "evaluations" ALTER COLUMN "createdByUserId" SET NOT NULL;

-- Add indexes and foreign keys for evaluations
CREATE INDEX IF NOT EXISTS "evaluations_subjectId_idx" ON "evaluations"("subjectId");
CREATE INDEX IF NOT EXISTS "evaluations_commissionId_idx" ON "evaluations"("commissionId");
CREATE INDEX IF NOT EXISTS "evaluations_evaluationDate_idx" ON "evaluations"("evaluationDate");
CREATE INDEX IF NOT EXISTS "evaluations_isClosed_idx" ON "evaluations"("isClosed");
CREATE INDEX IF NOT EXISTS "evaluations_parentEvaluationId_idx" ON "evaluations"("parentEvaluationId");
CREATE INDEX IF NOT EXISTS "evaluations_createdByUserId_idx" ON "evaluations"("createdByUserId");

ALTER TABLE "evaluations" 
  ADD CONSTRAINT "evaluations_subjectId_fkey" 
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  
-- Note: commissionId foreign key omitted - subject_commissions table doesn't exist in migration history
-- This will be added in a future migration when subject_commissions is properly created
  
ALTER TABLE "evaluations" 
  ADD CONSTRAINT "evaluations_createdByUserId_fkey" 
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  
ALTER TABLE "evaluations" 
  ADD CONSTRAINT "evaluations_parentEvaluationId_fkey" 
  FOREIGN KEY ("parentEvaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  
ALTER TABLE "evaluations" 
  ADD CONSTRAINT "evaluations_closedByUserId_fkey" 
  FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  
ALTER TABLE "evaluations" 
  ADD CONSTRAINT "evaluations_reopenedByUserId_fkey" 
  FOREIGN KEY ("reopenedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Transform grades table to complete schema
-- Drop old foreign keys and indexes
ALTER TABLE "grades" DROP CONSTRAINT IF EXISTS "grades_subjectId_fkey";
DROP INDEX IF EXISTS "grades_studentId_subjectId_idx";

-- Add new columns
ALTER TABLE "grades" 
  ADD COLUMN IF NOT EXISTS "evaluationId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "GradeStatus" DEFAULT 'PRESENT',
  ADD COLUMN IF NOT EXISTS "observations" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Migrate data from old columns to new columns
UPDATE "grades" SET "createdAt" = "gradedAt" WHERE "gradedAt" IS NOT NULL;

-- Drop old columns
ALTER TABLE "grades" DROP COLUMN IF EXISTS "gradeType";
ALTER TABLE "grades" DROP COLUMN IF EXISTS "gradedAt";

-- Make new columns NOT NULL where appropriate
ALTER TABLE "grades" ALTER COLUMN "evaluationId" SET NOT NULL;
ALTER TABLE "grades" ALTER COLUMN "value" DROP NOT NULL;

-- Add indexes and foreign keys for grades
CREATE INDEX IF NOT EXISTS "grades_evaluationId_idx" ON "grades"("evaluationId");
CREATE INDEX IF NOT EXISTS "grades_studentId_idx" ON "grades"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "grades_evaluationId_studentId_key" ON "grades"("evaluationId", "studentId");

ALTER TABLE "grades" 
  ADD CONSTRAINT "grades_evaluationId_fkey" 
  FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  
ALTER TABLE "grades" 
  ADD CONSTRAINT "grades_createdByUserId_fkey" 
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add new columns to student_subject_status
ALTER TABLE "student_subject_status" 
  ADD COLUMN IF NOT EXISTS "courseAverage" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "courseStatus" "CourseStatus" DEFAULT 'IN_PROGRESS',
  ADD COLUMN IF NOT EXISTS "finalExamScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "finalExamStatus" "FinalExamStatus" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "academicStatus" "AcademicStatus" DEFAULT 'EN_COURSE';

-- Add indexes for student_subject_status
CREATE INDEX IF NOT EXISTS "student_subject_status_studentId_courseStatus_idx" ON "student_subject_status"("studentId", "courseStatus");
CREATE INDEX IF NOT EXISTS "student_subject_status_studentId_academicStatus_idx" ON "student_subject_status"("studentId", "academicStatus");
