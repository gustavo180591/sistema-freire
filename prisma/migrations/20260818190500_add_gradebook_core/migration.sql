-- Modalidad de calificación y resultado cualitativo.
CREATE TYPE "GradingMode" AS ENUM ('NUMERIC', 'QUALITATIVE');
CREATE TYPE "QualitativeGrade" AS ENUM ('APPROVED', 'FAILED');

-- Configuración de evaluaciones. Se conserva weight por compatibilidad,
-- aunque las nuevas reglas usan promedio aritmético.
ALTER TABLE "evaluations"
ADD COLUMN "gradingMode" "GradingMode" NOT NULL DEFAULT 'NUMERIC',
ADD COLUMN "participatesInAverage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "mandatory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "evaluations"
SET "participatesInAverage" = false
WHERE "type" NOT IN ('PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR');

-- La relación con la inscripción se incorpora de manera compatible: queda
-- nullable para poder conservar notas históricas que todavía no se puedan
-- asociar automáticamente a una comisión/ciclo concreto.
ALTER TABLE "grades"
ADD COLUMN "subjectEnrollmentId" TEXT,
ADD COLUMN "qualitativeValue" "QualitativeGrade";

ALTER TABLE "grades"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "grades" AS g
SET "subjectEnrollmentId" = (
  SELECT se."id"
  FROM "subject_enrollments" AS se
  JOIN "evaluations" AS e ON e."id" = g."evaluationId"
  WHERE se."studentId" = g."studentId"
    AND e."commissionId" IS NOT NULL
    AND se."commissionId" = e."commissionId"
  ORDER BY
    CASE WHEN se."status" = 'ACTIVE' THEN 0 ELSE 1 END,
    se."enrolledAt" DESC
  LIMIT 1
)
WHERE g."subjectEnrollmentId" IS NULL;

CREATE INDEX "grades_subjectEnrollmentId_idx"
ON "grades"("subjectEnrollmentId");

CREATE UNIQUE INDEX "grades_evaluationId_subjectEnrollmentId_key"
ON "grades"("evaluationId", "subjectEnrollmentId");

ALTER TABLE "grades"
ADD CONSTRAINT "grades_subjectEnrollmentId_fkey"
FOREIGN KEY ("subjectEnrollmentId") REFERENCES "subject_enrollments"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Resultado histórico por cursada. StudentSubjectStatus permanece durante la
-- transición para no romper reportes y pantallas existentes.
CREATE TABLE "course_results" (
  "id" TEXT NOT NULL,
  "subjectEnrollmentId" TEXT NOT NULL,
  "courseAverage" DECIMAL(5,2),
  "courseStatus" "CourseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "academicStatus" "AcademicStatus" NOT NULL DEFAULT 'EN_COURSE',
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "promoted" BOOLEAN NOT NULL DEFAULT false,
  "finalGrade" DECIMAL(5,2),
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "course_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_results_subjectEnrollmentId_key"
ON "course_results"("subjectEnrollmentId");

CREATE INDEX "course_results_courseStatus_idx"
ON "course_results"("courseStatus");

CREATE INDEX "course_results_academicStatus_idx"
ON "course_results"("academicStatus");

ALTER TABLE "course_results"
ADD CONSTRAINT "course_results_subjectEnrollmentId_fkey"
FOREIGN KEY ("subjectEnrollmentId") REFERENCES "subject_enrollments"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_results"
ADD CONSTRAINT "course_results_confirmedByUserId_fkey"
FOREIGN KEY ("confirmedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
