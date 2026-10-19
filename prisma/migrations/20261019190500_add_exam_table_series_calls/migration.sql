-- CreateTable
CREATE TABLE "exam_table_series" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_table_series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "evaluations"
ADD COLUMN "examTableSeriesId" TEXT,
ADD COLUMN "examCallNumber" INTEGER;

-- A mesa histórica conserva ambos campos NULL.
-- Una mesa agrupada debe indicar llamado 1 o 2 y ser de tipo MESA_EXAMEN.
ALTER TABLE "evaluations"
ADD CONSTRAINT "evaluations_exam_table_call_consistency_check"
CHECK (
    (
        "examTableSeriesId" IS NULL
        AND "examCallNumber" IS NULL
    )
    OR
    (
        "examTableSeriesId" IS NOT NULL
        AND "examCallNumber" IN (1, 2)
        AND "type" = 'MESA_EXAMEN'::"EvaluationType"
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_examTableSeriesId_examCallNumber_key"
ON "evaluations"("examTableSeriesId", "examCallNumber");

-- AddForeignKey
ALTER TABLE "evaluations"
ADD CONSTRAINT "evaluations_examTableSeriesId_fkey"
FOREIGN KEY ("examTableSeriesId")
REFERENCES "exam_table_series"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
