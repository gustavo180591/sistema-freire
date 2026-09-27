-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM ('LATE_ARRIVAL', 'EARLY_DEPARTURE');

-- CreateTable
CREATE TABLE "student_attendance_events" (
    "id" TEXT NOT NULL,
    "subjectEnrollmentId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "attendanceEntryId" TEXT,
    "type" "AttendanceEventType" NOT NULL,
    "eventDate" DATE NOT NULL,
    "eventTime" VARCHAR(5) NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_attendance_events_pkey" PRIMARY KEY ("id")
);

-- ValidateEventTime
ALTER TABLE "student_attendance_events"
ADD CONSTRAINT "student_attendance_events_eventTime_format_check"
CHECK ("eventTime" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$');

-- CreateIndex
CREATE INDEX "student_attendance_events_locationId_eventDate_idx" ON "student_attendance_events"("locationId", "eventDate");

-- CreateIndex
CREATE INDEX "student_attendance_events_type_eventDate_idx" ON "student_attendance_events"("type", "eventDate");

-- CreateIndex
CREATE INDEX "student_attendance_events_createdByUserId_idx" ON "student_attendance_events"("createdByUserId");

-- CreateIndex
CREATE INDEX "student_attendance_events_attendanceEntryId_idx" ON "student_attendance_events"("attendanceEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendance_events_subjectEnrollmentId_eventDate_eve_key" ON "student_attendance_events"("subjectEnrollmentId", "eventDate", "eventTime", "type");

-- AddForeignKey
ALTER TABLE "student_attendance_events" ADD CONSTRAINT "student_attendance_events_subjectEnrollmentId_fkey" FOREIGN KEY ("subjectEnrollmentId") REFERENCES "subject_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_events" ADD CONSTRAINT "student_attendance_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_events" ADD CONSTRAINT "student_attendance_events_attendanceEntryId_fkey" FOREIGN KEY ("attendanceEntryId") REFERENCES "attendance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_events" ADD CONSTRAINT "student_attendance_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
