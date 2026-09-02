-- AlterTable
ALTER TABLE "evaluations"
ADD COLUMN "responsibleTeacherId" TEXT;

-- CreateIndex
CREATE INDEX "evaluations_responsibleTeacherId_idx"
ON "evaluations"("responsibleTeacherId");

-- AddForeignKey
ALTER TABLE "evaluations"
ADD CONSTRAINT "evaluations_responsibleTeacherId_fkey"
FOREIGN KEY ("responsibleTeacherId")
REFERENCES "teachers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
