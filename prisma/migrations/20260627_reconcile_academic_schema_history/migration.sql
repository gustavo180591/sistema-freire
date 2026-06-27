-- AlterEnum
BEGIN;
CREATE TYPE "AcademicStatus_new" AS ENUM ('EN_COURSE', 'REGULAR', 'LIBRE', 'APROBADO', 'PROMOCIONADO');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "academicStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "academicStatus" TYPE "AcademicStatus_new" USING ("academicStatus"::text::"AcademicStatus_new");
ALTER TYPE "AcademicStatus" RENAME TO "AcademicStatus_old";
ALTER TYPE "AcademicStatus_new" RENAME TO "AcademicStatus";
DROP TYPE "public"."AcademicStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "academicStatus" SET DEFAULT 'EN_COURSE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CourseStatus_new" AS ENUM ('IN_PROGRESS', 'PASSED_COURSE', 'FAILED_COURSE', 'PROMOTED');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "courseStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "courseStatus" TYPE "CourseStatus_new" USING ("courseStatus"::text::"CourseStatus_new");
ALTER TYPE "CourseStatus" RENAME TO "CourseStatus_old";
ALTER TYPE "CourseStatus_new" RENAME TO "CourseStatus";
DROP TYPE "public"."CourseStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "courseStatus" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "FinalExamStatus_new" AS ENUM ('PENDING', 'NOT_REQUIRED', 'PASSED', 'FAILED');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "finalExamStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "finalExamStatus" TYPE "FinalExamStatus_new" USING ("finalExamStatus"::text::"FinalExamStatus_new");
ALTER TYPE "FinalExamStatus" RENAME TO "FinalExamStatus_old";
ALTER TYPE "FinalExamStatus_new" RENAME TO "FinalExamStatus";
DROP TYPE "public"."FinalExamStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "finalExamStatus" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_parentEvaluationId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "student_charges" DROP CONSTRAINT "student_charges_academicTermId_fkey";

-- DropForeignKey
ALTER TABLE "subject_enrollments" DROP CONSTRAINT "subject_enrollments_careerId_fkey";

-- DropIndex
DROP INDEX "student_subject_status_studentId_promoted_idx";

-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "type",
ADD COLUMN     "type" "EvaluationType" NOT NULL,
ALTER COLUMN "maxScore" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "minPassingScore" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "weight" SET DATA TYPE DECIMAL(6,2);

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "subjectId";

-- AlterTable
ALTER TABLE "student_subject_status" ALTER COLUMN "courseAverage" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "finalExamScore" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "subject_enrollments" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "enrolledBy" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "subject_enrollments_studentId_status_idx" ON "subject_enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX "subject_enrollments_subjectId_status_idx" ON "subject_enrollments"("subjectId", "status");

-- CreateIndex
CREATE INDEX "subject_enrollments_academicTermId_status_idx" ON "subject_enrollments"("academicTermId", "status");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_parentEvaluationId_fkey" FOREIGN KEY ("parentEvaluationId") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_enrollments" ADD CONSTRAINT "subject_enrollments_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

