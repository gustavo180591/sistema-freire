ALTER TABLE "sessions"
ADD COLUMN "impersonatedUserId" TEXT,
ADD COLUMN "impersonationStartedAt" TIMESTAMP(3);

CREATE INDEX "sessions_impersonatedUserId_idx"
ON "sessions"("impersonatedUserId");
