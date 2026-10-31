-- Trayectoria académica del estudiante.
-- Migración aditiva: no elimina ni reemplaza información académica existente.

-- 1. Nuevos enums
CREATE TYPE "EnrollmentAttemptType" AS ENUM (
  'FIRST_TIME',
  'REPEAT'
);

CREATE TYPE "AcademicRecordSource" AS ENUM (
  'SYSTEM',
  'MANUAL',
  'IMPORT'
);

CREATE TYPE "SubjectAccreditationType" AS ENUM (
  'FINAL_EXAM',
  'PROMOTION',
  'EQUIVALENCE'
);

-- 2. Una cursada puede finalizar sin ser rechazada o cancelada.
ALTER TYPE "EnrollmentStatus" ADD VALUE 'COMPLETED';

-- 3. Contexto histórico de cada cursada.
ALTER TABLE "subject_enrollments"
ADD COLUMN "academicYear" INTEGER,
ADD COLUMN "attemptType" "EnrollmentAttemptType",
ADD COLUMN "recordSource" "AcademicRecordSource" NOT NULL DEFAULT 'SYSTEM';

-- Los registros que ya poseen ciclo lectivo pueden recuperar su año
-- sin inventar información nueva.
UPDATE "subject_enrollments" AS se
SET "academicYear" = at."year"
FROM "academic_terms" AS at
WHERE se."academicTermId" = at."id"
  AND se."academicYear" IS NULL;

CREATE INDEX "subject_enrollments_studentId_subjectId_academicYear_idx"
ON "subject_enrollments"("studentId", "subjectId", "academicYear");

CREATE INDEX "subject_enrollments_attemptType_idx"
ON "subject_enrollments"("attemptType");

-- 4. Regularidad histórica y futura vigencia.
ALTER TABLE "course_results"
ADD COLUMN "regularizedAt" TIMESTAMP(3),
ADD COLUMN "regularityExpiresAt" TIMESTAMP(3);

CREATE INDEX "course_results_regularityExpiresAt_idx"
ON "course_results"("regularityExpiresAt");

-- 5. Acreditación definitiva de una materia.
CREATE TABLE "subject_accreditations" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "subjectEnrollmentId" TEXT,
  "evaluationId" TEXT,
  "type" "SubjectAccreditationType" NOT NULL,
  "source" "AcademicRecordSource" NOT NULL DEFAULT 'SYSTEM',
  "accreditedAt" TIMESTAMP(3),
  "academicYear" INTEGER,
  "grade" DECIMAL(5,2),
  "observations" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "subject_accreditations_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subject_accreditations_studentId_subjectId_key"
ON "subject_accreditations"("studentId", "subjectId");

CREATE INDEX "subject_accreditations_studentId_accreditedAt_idx"
ON "subject_accreditations"("studentId", "accreditedAt");

CREATE INDEX "subject_accreditations_subjectId_idx"
ON "subject_accreditations"("subjectId");

CREATE INDEX "subject_accreditations_subjectEnrollmentId_idx"
ON "subject_accreditations"("subjectEnrollmentId");

CREATE INDEX "subject_accreditations_evaluationId_idx"
ON "subject_accreditations"("evaluationId");

CREATE INDEX "subject_accreditations_type_source_idx"
ON "subject_accreditations"("type", "source");

ALTER TABLE "subject_accreditations"
ADD CONSTRAINT "subject_accreditations_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES "students"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "subject_accreditations"
ADD CONSTRAINT "subject_accreditations_subjectId_fkey"
FOREIGN KEY ("subjectId")
REFERENCES "subjects"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "subject_accreditations"
ADD CONSTRAINT "subject_accreditations_subjectEnrollmentId_fkey"
FOREIGN KEY ("subjectEnrollmentId")
REFERENCES "subject_enrollments"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "subject_accreditations"
ADD CONSTRAINT "subject_accreditations_evaluationId_fkey"
FOREIGN KEY ("evaluationId")
REFERENCES "evaluations"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "subject_accreditations"
ADD CONSTRAINT "subject_accreditations_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 6. PRECEPTOR puede administrar datos académicos del alumno.
-- El scope territorial continúa siendo validado por el backend.
UPDATE "permissions"
SET
  "canUpdate" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "roleCode" = 'PRECEPTOR'
  AND "entity" = 'STUDENT';
