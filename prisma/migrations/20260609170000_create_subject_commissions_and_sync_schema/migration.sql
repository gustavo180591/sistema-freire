-- Create subject_commissions table
CREATE TABLE "subject_commissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicTermId" TEXT,
    "careerId" TEXT,
    "studyPlanId" TEXT,
    "teacherId" TEXT,
    "locationId" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 40,
    "currentEnrolled" INTEGER NOT NULL DEFAULT 0,
    "schedule" TEXT,
    "scheduleJson" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_commissions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on code
CREATE UNIQUE INDEX "subject_commissions_code_key" ON "subject_commissions"("code");

-- Create indexes for subject_commissions
CREATE INDEX "subject_commissions_subjectId_active_idx" ON "subject_commissions"("subjectId", "active");
CREATE INDEX "subject_commissions_academicTermId_active_idx" ON "subject_commissions"("academicTermId", "active");
CREATE INDEX "subject_commissions_careerId_active_idx" ON "subject_commissions"("careerId", "active");
CREATE INDEX "subject_commissions_teacherId_idx" ON "subject_commissions"("teacherId");

-- Add foreign keys for subject_commissions
ALTER TABLE "subject_commissions" 
  ADD CONSTRAINT "subject_commissions_subjectId_fkey" 
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_commissions" 
  ADD CONSTRAINT "subject_commissions_academicTermId_fkey" 
  FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subject_commissions" 
  ADD CONSTRAINT "subject_commissions_careerId_fkey" 
  FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subject_commissions" 
  ADD CONSTRAINT "subject_commissions_studyPlanId_fkey" 
  FOREIGN KEY ("studyPlanId") REFERENCES "study_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subject_commissions" 
  ADD CONSTRAINT "subject_commissions_teacherId_fkey" 
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subject_commissions" 
  ADD CONSTRAINT "subject_commissions_locationId_fkey" 
  FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create subject_enrollments table
CREATE TABLE "subject_enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "commissionId" TEXT,
    "careerId" TEXT NOT NULL,
    "studyPlanId" TEXT,
    "academicTermId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_enrollments_pkey" PRIMARY KEY ("id")
);

-- Create unique index on studentId, subjectId, academicTermId
CREATE UNIQUE INDEX "subject_enrollments_studentId_subjectId_academicTermId_key" ON "subject_enrollments"("studentId", "subjectId", "academicTermId");

-- Create indexes for subject_enrollments
CREATE INDEX "subject_enrollments_studentId_status_idx" ON "subject_enrollments"("studentId", "status");
CREATE INDEX "subject_enrollments_academicTermId_status_idx" ON "subject_enrollments"("academicTermId", "status");
CREATE INDEX "subject_enrollments_commissionId_idx" ON "subject_enrollments"("commissionId");
CREATE INDEX "subject_enrollments_subjectId_status_idx" ON "subject_enrollments"("subjectId", "status");

-- Add foreign keys for subject_enrollments
ALTER TABLE "subject_enrollments" 
  ADD CONSTRAINT "subject_enrollments_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_enrollments" 
  ADD CONSTRAINT "subject_enrollments_subjectId_fkey" 
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_enrollments" 
  ADD CONSTRAINT "subject_enrollments_commissionId_fkey" 
  FOREIGN KEY ("commissionId") REFERENCES "subject_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subject_enrollments" 
  ADD CONSTRAINT "subject_enrollments_careerId_fkey" 
  FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_enrollments" 
  ADD CONSTRAINT "subject_enrollments_studyPlanId_fkey" 
  FOREIGN KEY ("studyPlanId") REFERENCES "study_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subject_enrollments" 
  ADD CONSTRAINT "subject_enrollments_academicTermId_fkey" 
  FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update AcademicStatus enum to add new variants
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'REGULAR';
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'LIBRE';
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'APROBADO';
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'PROMOCIONADO';

-- Update CourseStatus enum to add new variants
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PASSED_COURSE';
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'FAILED_COURSE';
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PROMOTED';

-- Update EvaluationType enum to add new variants
ALTER TYPE "EvaluationType" ADD VALUE IF NOT EXISTS 'EXAMEN_FINAL';
ALTER TYPE "EvaluationType" ADD VALUE IF NOT EXISTS 'OTRO';

-- Update FinalExamStatus enum to add new variants
ALTER TYPE "FinalExamStatus" ADD VALUE IF NOT EXISTS 'NOT_REQUIRED';
ALTER TYPE "FinalExamStatus" ADD VALUE IF NOT EXISTS 'PASSED';

-- Add commissionId column to attendance_records if not exists
ALTER TABLE "attendance_records" 
  ADD COLUMN IF NOT EXISTS "commissionId" TEXT;

-- Drop old unique index on attendance_records
DROP INDEX IF EXISTS "attendance_records_subjectId_classDate_key";

-- Create new unique index on attendance_records
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_subjectId_classDate_commissionId_key" ON "attendance_records"("subjectId", "classDate", "commissionId");

-- Add foreign key for attendance_records.commissionId
ALTER TABLE "attendance_records" 
  ADD CONSTRAINT "attendance_records_commissionId_fkey" 
  FOREIGN KEY ("commissionId") REFERENCES "subject_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add observations column to evaluations if not exists
ALTER TABLE "evaluations" 
  ADD COLUMN IF NOT EXISTS "observations" TEXT;

-- Add commissionId foreign key to evaluations
ALTER TABLE "evaluations" 
  ADD CONSTRAINT "evaluations_commissionId_fkey" 
  FOREIGN KEY ("commissionId") REFERENCES "subject_commissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add updatedByUserId column to grades if not exists
ALTER TABLE "grades" 
  ADD COLUMN IF NOT EXISTS "updatedByUserId" TEXT;

-- Add foreign key for grades.updatedByUserId
ALTER TABLE "grades" 
  ADD CONSTRAINT "grades_updatedByUserId_fkey" 
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add finalApprovalDate column to student_subject_status if not exists
ALTER TABLE "student_subject_status" 
  ADD COLUMN IF NOT EXISTS "finalApprovalDate" TIMESTAMP(3);

-- Update column types and constraints for evaluations
ALTER TABLE "evaluations" 
  ALTER COLUMN "evaluationDate" SET NOT NULL,
  ALTER COLUMN "evaluationDate" TYPE TIMESTAMP(3) USING "evaluationDate"::TIMESTAMP(3);

ALTER TABLE "evaluations" 
  ALTER COLUMN "minPassingScore" SET NOT NULL,
  ALTER COLUMN "minPassingScore" TYPE DOUBLE PRECISION USING "minPassingScore"::DOUBLE PRECISION;

ALTER TABLE "evaluations" 
  ALTER COLUMN "weight" SET NOT NULL,
  ALTER COLUMN "weight" TYPE DOUBLE PRECISION USING "weight"::DOUBLE PRECISION;

ALTER TABLE "evaluations" 
  ALTER COLUMN "isClosed" SET NOT NULL;

-- Update column types and constraints for grades
ALTER TABLE "grades" 
  ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "grades" 
  ALTER COLUMN "createdAt" SET NOT NULL;

ALTER TABLE "grades" 
  ALTER COLUMN "updatedAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Update column types and constraints for student_subject_status
ALTER TABLE "student_subject_status" 
  ALTER COLUMN "courseAverage" TYPE DOUBLE PRECISION USING "courseAverage"::DOUBLE PRECISION;

ALTER TABLE "student_subject_status" 
  ALTER COLUMN "courseStatus" SET NOT NULL;

ALTER TABLE "student_subject_status" 
  ALTER COLUMN "finalExamScore" TYPE DOUBLE PRECISION USING "finalExamScore"::DOUBLE PRECISION;

ALTER TABLE "student_subject_status" 
  ALTER COLUMN "finalExamStatus" SET NOT NULL;

ALTER TABLE "student_subject_status" 
  ALTER COLUMN "academicStatus" SET NOT NULL;
