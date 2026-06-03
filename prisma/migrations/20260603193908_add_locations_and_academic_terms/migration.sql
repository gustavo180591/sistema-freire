-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('ANUAL', 'PRIMER_CUATRIMESTRE', 'SEGUNDO_CUATRIMESTRE', 'VERANO', 'ESPECIAL');

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- Insert default location for existing careers
INSERT INTO "locations" ("id", "name", "code", "city", "province", "active", "createdAt", "updatedAt")
VALUES ('default-location-id', 'Sede Posadas', 'POSADAS', 'Posadas', 'Misiones', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: Add locationId as nullable first
ALTER TABLE "careers" ADD COLUMN     "locationId" TEXT;

-- Update existing careers to use default location
UPDATE "careers" SET "locationId" = 'default-location-id' WHERE "locationId" IS NULL;

-- AlterTable: Make locationId NOT NULL
ALTER TABLE "careers" ALTER COLUMN "locationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "academicTermId" TEXT;

-- AlterTable
ALTER TABLE "student_charges" ADD COLUMN     "academicTermId" TEXT;

-- CreateTable
CREATE TABLE "user_location_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_location_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "termType" "TermType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_active_idx" ON "locations"("active");

-- CreateIndex
CREATE INDEX "user_location_permissions_userId_idx" ON "user_location_permissions"("userId");

-- CreateIndex
CREATE INDEX "user_location_permissions_locationId_idx" ON "user_location_permissions"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_location_permissions_userId_locationId_key" ON "user_location_permissions"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_code_key" ON "academic_terms"("code");

-- CreateIndex
CREATE INDEX "academic_terms_year_active_idx" ON "academic_terms"("year", "active");

-- CreateIndex
CREATE INDEX "academic_terms_locationId_active_idx" ON "academic_terms"("locationId", "active");

-- CreateIndex
CREATE INDEX "careers_locationId_active_idx" ON "careers"("locationId", "active");

-- CreateIndex
CREATE INDEX "payments_academicTermId_idx" ON "payments"("academicTermId");

-- CreateIndex
CREATE INDEX "student_charges_academicTermId_idx" ON "student_charges"("academicTermId");

-- AddForeignKey
ALTER TABLE "careers" ADD CONSTRAINT "careers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_permissions" ADD CONSTRAINT "user_location_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_permissions" ADD CONSTRAINT "user_location_permissions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
