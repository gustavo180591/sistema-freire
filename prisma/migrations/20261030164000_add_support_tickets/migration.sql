CREATE TYPE "SupportTicketType" AS ENUM (
  'DELETE_REQUEST',
  'DATA_CORRECTION',
  'BUG',
  'CHANGE_REQUEST',
  'OTHER'
);

CREATE TYPE "SupportTicketStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'RESOLVED',
  'CANCELLED'
);

CREATE TYPE "SupportTicketPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL,
  "number" SERIAL NOT NULL,
  "type" "SupportTicketType" NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "context" JSONB,
  "requestedByUserId" TEXT NOT NULL,
  "assignedToUserId" TEXT,
  "reviewedByUserId" TEXT,
  "resolutionNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_tickets_number_key"
ON "support_tickets"("number");

CREATE INDEX "support_tickets_status_createdAt_idx"
ON "support_tickets"("status", "createdAt");

CREATE INDEX "support_tickets_type_status_idx"
ON "support_tickets"("type", "status");

CREATE INDEX "support_tickets_requestedByUserId_createdAt_idx"
ON "support_tickets"("requestedByUserId", "createdAt");

CREATE INDEX "support_tickets_assignedToUserId_status_idx"
ON "support_tickets"("assignedToUserId", "status");

CREATE INDEX "support_tickets_entityType_entityId_idx"
ON "support_tickets"("entityType", "entityId");

ALTER TABLE "support_tickets"
ADD CONSTRAINT "support_tickets_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
ADD CONSTRAINT "support_tickets_assignedToUserId_fkey"
FOREIGN KEY ("assignedToUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
ADD CONSTRAINT "support_tickets_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
