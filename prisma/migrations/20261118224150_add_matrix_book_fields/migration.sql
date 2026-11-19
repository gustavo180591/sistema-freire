-- Libro Matriz: datos institucionales del alumno
ALTER TABLE "students"
ADD COLUMN "studyPlanId" TEXT,
ADD COLUMN "birthPlace" TEXT,
ADD COLUMN "entryCertificateTitle" TEXT,
ADD COLUMN "entryCertificateIssuer" TEXT;

-- Libro Matriz: identificación oficial del plan de estudios
ALTER TABLE "study_plans"
ADD COLUMN "resolution" TEXT;

-- Libro Matriz: datos oficiales de cada acreditación
ALTER TABLE "subject_accreditations"
ADD COLUMN "folio" TEXT,
ADD COLUMN "establishment" TEXT,
ADD COLUMN "officialReference" TEXT;

-- Índice para el plan asociado al alumno
CREATE INDEX "students_studyPlanId_idx"
ON "students"("studyPlanId");

-- Relación opcional del alumno con su plan de estudios
ALTER TABLE "students"
ADD CONSTRAINT "students_studyPlanId_fkey"
FOREIGN KEY ("studyPlanId")
REFERENCES "study_plans"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
