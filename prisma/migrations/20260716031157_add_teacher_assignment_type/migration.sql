-- CreateEnum
CREATE TYPE "TeacherAssignmentType" AS ENUM ('TITULAR', 'SUPLENTE');

-- AlterTable
ALTER TABLE "subject_teachers" ADD COLUMN     "assignmentType" "TeacherAssignmentType" NOT NULL DEFAULT 'TITULAR';
