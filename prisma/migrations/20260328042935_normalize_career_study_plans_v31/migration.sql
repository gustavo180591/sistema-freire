/*
  Warnings:

  - Added the required column `careerId` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "careerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "study_plans" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_subjects" (
    "planId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "plan_subjects_pkey" PRIMARY KEY ("planId","subjectId")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_plans_careerId_version_key" ON "study_plans"("careerId", "version");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_subjects" ADD CONSTRAINT "plan_subjects_planId_fkey" FOREIGN KEY ("planId") REFERENCES "study_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_subjects" ADD CONSTRAINT "plan_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
