-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RESIGNED');

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "teachers_status_idx" ON "teachers"("status");
