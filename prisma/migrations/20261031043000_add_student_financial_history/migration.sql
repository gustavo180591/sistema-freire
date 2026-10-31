CREATE TYPE "FinancialHistoryConcept" AS ENUM (
    'INSCRIPCION',
    'CUOTA_MENSUAL'
);

CREATE TYPE "FinancialHistoryStatus" AS ENUM (
    'UNKNOWN',
    'PENDING',
    'PARTIAL',
    'PAID'
);

CREATE TABLE "student_financial_history" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "periodKey" TEXT NOT NULL,
    "concept" "FinancialHistoryConcept" NOT NULL,
    "month" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FinancialHistoryStatus" NOT NULL DEFAULT 'UNKNOWN',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_financial_history_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
    "student_financial_history_studentId_periodKey_key"
ON "student_financial_history"("studentId", "periodKey");

CREATE INDEX
    "student_financial_history_studentId_academicYear_idx"
ON "student_financial_history"("studentId", "academicYear");

CREATE INDEX
    "student_financial_history_academicYear_status_idx"
ON "student_financial_history"("academicYear", "status");

CREATE INDEX
    "student_financial_history_createdByUserId_idx"
ON "student_financial_history"("createdByUserId");

ALTER TABLE "student_financial_history"
ADD CONSTRAINT "student_financial_history_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES "students"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "student_financial_history"
ADD CONSTRAINT "student_financial_history_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
