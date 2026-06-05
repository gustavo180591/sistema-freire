-- Add annual grade thresholds to subjects
ALTER TABLE "subjects" ADD COLUMN "approvalThreshold" DECIMAL(3,2) DEFAULT 6;
ALTER TABLE "subjects" ADD COLUMN "promotionThreshold" DECIMAL(3,2) DEFAULT 8;
ALTER TABLE "subjects" ADD COLUMN "isAnnual" BOOLEAN DEFAULT true;
