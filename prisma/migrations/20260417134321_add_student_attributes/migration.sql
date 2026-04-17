/*
  Warnings:

  - The values [ALUMNO_BECADO,ALUMNO_RECURSANTE] on the enum `RoleCode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleCode_new" AS ENUM ('SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'DOCENTE', 'ALUMNO', 'FINANZAS', 'APODERADO');
ALTER TABLE "roles" ALTER COLUMN "code" TYPE "RoleCode_new" USING ("code"::text::"RoleCode_new");
ALTER TYPE "RoleCode" RENAME TO "RoleCode_old";
ALTER TYPE "RoleCode_new" RENAME TO "RoleCode";
DROP TYPE "public"."RoleCode_old";
COMMIT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "isBecado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRecursante" BOOLEAN NOT NULL DEFAULT false;
