-- AlterTable
ALTER TABLE "exam_table_series"
ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "presidentTeacherId" TEXT,
ADD COLUMN "firstVocalTeacherId" TEXT,
ADD COLUMN "secondVocalTeacherId" TEXT;

-- Las series existentes heredan como Presidente al docente responsable
-- del primer llamado. Esto preserva las mesas ya creadas.
UPDATE "exam_table_series" AS series
SET "presidentTeacherId" = evaluation."responsibleTeacherId"
FROM "evaluations" AS evaluation
WHERE evaluation."examTableSeriesId" = series."id"
  AND evaluation."examCallNumber" = 1
  AND evaluation."responsibleTeacherId" IS NOT NULL
  AND series."presidentTeacherId" IS NULL;

-- Indexes
CREATE INDEX "exam_table_series_isHidden_idx"
ON "exam_table_series"("isHidden");

CREATE INDEX "exam_table_series_presidentTeacherId_idx"
ON "exam_table_series"("presidentTeacherId");

CREATE INDEX "exam_table_series_firstVocalTeacherId_idx"
ON "exam_table_series"("firstVocalTeacherId");

CREATE INDEX "exam_table_series_secondVocalTeacherId_idx"
ON "exam_table_series"("secondVocalTeacherId");

-- Foreign Keys
ALTER TABLE "exam_table_series"
ADD CONSTRAINT "exam_table_series_presidentTeacherId_fkey"
FOREIGN KEY ("presidentTeacherId")
REFERENCES "teachers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "exam_table_series"
ADD CONSTRAINT "exam_table_series_firstVocalTeacherId_fkey"
FOREIGN KEY ("firstVocalTeacherId")
REFERENCES "teachers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "exam_table_series"
ADD CONSTRAINT "exam_table_series_secondVocalTeacherId_fkey"
FOREIGN KEY ("secondVocalTeacherId")
REFERENCES "teachers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
