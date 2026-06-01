-- AlterEnum
ALTER TYPE "CorrelativeType" ADD VALUE 'APROBADO_APROBAR';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "familyContactName" TEXT,
ADD COLUMN     "familyContactPhone" TEXT,
ADD COLUMN     "familyRelationship" TEXT,
ADD COLUMN     "highSchool" TEXT,
ADD COLUMN     "highSchoolYear" INTEGER,
ADD COLUMN     "instituteYear" INTEGER,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT;
