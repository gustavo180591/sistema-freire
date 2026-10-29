CREATE TABLE "exam_table_year_configs" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "julyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "novemberDecemberEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_table_year_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_table_year_configs_year_key"
ON "exam_table_year_configs"("year");

CREATE INDEX "exam_table_year_configs_active_year_idx"
ON "exam_table_year_configs"("active", "year");

-- Configuración inicial solicitada.
INSERT INTO "exam_table_year_configs"
(
    "id",
    "year",
    "active",
    "julyEnabled",
    "novemberDecemberEnabled",
    "createdAt",
    "updatedAt"
)
VALUES
    (
        'exam-table-year-2026',
        2026,
        true,
        false,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'exam-table-year-2027',
        2027,
        true,
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("year") DO NOTHING;
