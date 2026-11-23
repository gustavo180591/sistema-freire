ALTER TABLE "study_plans"
ADD COLUMN "code" TEXT;

CREATE INDEX "study_plans_code_idx"
ON "study_plans"("code");
