-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "class_schedules" (
    "id" TEXT NOT NULL,
    "locationId" TEXT,
    "careerId" TEXT NOT NULL,
    "studyPlanId" TEXT,
    "subjectId" TEXT NOT NULL,
    "commissionId" TEXT,
    "teacherId" TEXT,
    "yearLevel" INTEGER NOT NULL,
    "dayOfWeek" "WeekDay" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "classroom" TEXT,
    "observations" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_schedules_careerId_yearLevel_active_idx" ON "class_schedules"("careerId", "yearLevel", "active");

-- CreateIndex
CREATE INDEX "class_schedules_subjectId_active_idx" ON "class_schedules"("subjectId", "active");

-- CreateIndex
CREATE INDEX "class_schedules_teacherId_active_idx" ON "class_schedules"("teacherId", "active");

-- CreateIndex
CREATE INDEX "class_schedules_commissionId_active_idx" ON "class_schedules"("commissionId", "active");

-- CreateIndex
CREATE INDEX "class_schedules_locationId_active_idx" ON "class_schedules"("locationId", "active");

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "study_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "subject_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
