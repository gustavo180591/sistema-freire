-- La serie no puede eliminarse mientras tenga llamados asociados.
-- Esto mantiene coherencia con el CHECK que exige que
-- examTableSeriesId y examCallNumber sean ambos NULL o ambos válidos.

ALTER TABLE "evaluations"
DROP CONSTRAINT "evaluations_examTableSeriesId_fkey";

ALTER TABLE "evaluations"
ADD CONSTRAINT "evaluations_examTableSeriesId_fkey"
FOREIGN KEY ("examTableSeriesId")
REFERENCES "exam_table_series"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
