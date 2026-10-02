-- AddColumns
ALTER TABLE "attendance_records"
ADD COLUMN "locationId" TEXT,
ADD COLUMN "deduplicationKey" VARCHAR(255);

-- Backfill location from commission whenever possible.
UPDATE "attendance_records" AS ar
SET "locationId" = sc."locationId"
FROM "subject_commissions" AS sc
WHERE ar."commissionId" = sc."id"
  AND ar."locationId" IS NULL;

-- Backfill location for no-commission records only when every
-- attendance entry belongs to exactly one location.
--
-- Legacy records containing students from multiple locations
-- intentionally remain with locationId = NULL.
WITH single_location AS (
    SELECT
        ae."attendanceId",
        MIN(s."locationId") AS "locationId"
    FROM "attendance_entries" AS ae
    INNER JOIN "students" AS s
        ON s."id" = ae."studentId"
    WHERE s."locationId" IS NOT NULL
    GROUP BY ae."attendanceId"
    HAVING COUNT(DISTINCT s."locationId") = 1
)
UPDATE "attendance_records" AS ar
SET "locationId" = sl."locationId"
FROM single_location AS sl
WHERE ar."id" = sl."attendanceId"
  AND ar."commissionId" IS NULL
  AND ar."locationId" IS NULL;

-- Canonical identity for unscheduled/preceptor records with commission.
UPDATE "attendance_records"
SET "deduplicationKey" =
    'COMMISSION:' ||
    "subjectId" ||
    ':' ||
    "commissionId" ||
    ':' ||
    TO_CHAR("classDate", 'YYYY-MM-DD')
WHERE "classScheduleId" IS NULL
  AND "commissionId" IS NOT NULL
  AND "deduplicationKey" IS NULL;

-- Canonical identity for unscheduled/preceptor records without commission.
--
-- Mixed-location legacy records remain NULL intentionally.
UPDATE "attendance_records"
SET "deduplicationKey" =
    'LOCATION:' ||
    "subjectId" ||
    ':' ||
    "locationId" ||
    ':' ||
    TO_CHAR("classDate", 'YYYY-MM-DD')
WHERE "classScheduleId" IS NULL
  AND "commissionId" IS NULL
  AND "locationId" IS NOT NULL
  AND "deduplicationKey" IS NULL;

-- Unique identity for all new unscheduled/preceptor attendance records.
CREATE UNIQUE INDEX "attendance_records_deduplicationKey_key"
ON "attendance_records"("deduplicationKey");

-- Scope/date lookup.
CREATE INDEX "attendance_records_locationId_classDate_idx"
ON "attendance_records"("locationId", "classDate");

-- Location relation.
ALTER TABLE "attendance_records"
ADD CONSTRAINT "attendance_records_locationId_fkey"
FOREIGN KEY ("locationId")
REFERENCES "locations"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
