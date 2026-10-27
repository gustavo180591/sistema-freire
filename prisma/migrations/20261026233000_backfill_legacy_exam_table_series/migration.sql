-- Convierte cada mesa histórica sin serie en una serie independiente
-- de un solo llamado. No intenta agrupar mesas antiguas entre sí porque
-- no existe una relación histórica confiable que indique cuáles formaban
-- parte de la misma mesa.

INSERT INTO "exam_table_series" (
	"id",
	"createdAt",
	"updatedAt",
	"isHidden",
	"presidentTeacherId"
)
SELECT
	'legacy_' || md5(e."id"),
	e."createdAt",
	CURRENT_TIMESTAMP,
	false,
	e."responsibleTeacherId"
FROM "evaluations" AS e
WHERE e."type" = 'MESA_EXAMEN'
  AND e."examTableSeriesId" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "evaluations" AS e
SET
	"examTableSeriesId" = 'legacy_' || md5(e."id"),
	"examCallNumber" = 1
WHERE e."type" = 'MESA_EXAMEN'
  AND e."examTableSeriesId" IS NULL;
