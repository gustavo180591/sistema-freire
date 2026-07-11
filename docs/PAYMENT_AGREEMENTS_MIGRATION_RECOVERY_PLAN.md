# Plan de Recuperación Controlado - Migración Fallida de Convenios de Pago

## Fecha de Creación

20 de Junio de 2026

## 1. Estado Actual

### 1.1 Estado de \_prisma_migrations

```
ID: 82e94d83-8f3f-418d-bb08-db0d303e4ab8
Migration Name: 20260620164627_add_payment_agreements_phase1
Started At: Sat Jun 20 2026 16:15:11 GMT-0300
Finished At: null
Rolled Back At: null
Applied Steps Count: 0
Logs: Error completo de migración fallida
```

**Confirmación:** La migración está registrada como fallida con 0 steps aplicados.

### 1.2 Enums Huérfanos Detectados

**Enums creados parcialmente en la base real:**

- `PaymentAgreementChargeRelationType`: [REFINANCED, BLOCKED, ASSOCIATED]
- `PaymentAgreementEventType`: [CREATED, ACTIVATED, MODIFIED, CANCELLED, REFINANCED, INSTALLMENT_PAID, INSTALLMENT_OVERDUE, DEFAULTED, STATUS_CHANGED, BLOCK_EXCEPTION, BLOCK_REACTIVATED]
- `PaymentAgreementInstallmentStatus`: [PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, WAIVED]
- `PaymentAgreementStatus`: [DRAFT, ACTIVE, COMPLETED, OVERDUE, DEFAULTED, CANCELLED, REFINANCED]

**Dependencias:** Solo dependencias internas de pg_type (sistema), no dependencias de tablas o columnas. Pueden eliminarse safely.

### 1.3 Tablas de Convenios Creadas

**Resultado:** ✅ No se crearon tablas de Convenios (no se creó nada parcial de tablas)

---

## 2. SQL Problemático

### 2.1 Fragmento Exacto que Causó el Error

```sql
-- DropIndex
DROP INDEX "student_subject_status_studentId_promoted_idx";
```

**Error:**

```
ERROR: index "student_subject_status_studentId_promoted_idx" does not exist
Database error code: 42704
```

### 2.2 Cambios Académicos que NO Deberían Estar en la Migración de Convenios

**Líneas 39-70: ALTER TYPE AcademicStatus**

```sql
-- AlterEnum
BEGIN;
CREATE TYPE "AcademicStatus_new" AS ENUM ('EN_COURSE', 'REGULAR', 'LIBRE', 'APROBADO', 'PROMOCIONADO');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "academicStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "academicStatus" TYPE "AcademicStatus_new" USING ("academicStatus"::text::"AcademicStatus_new");
ALTER TYPE "AcademicStatus" RENAME TO "AcademicStatus_old";
ALTER TYPE "AcademicStatus_new" RENAME TO "AcademicStatus";
DROP TYPE "public"."AcademicStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "academicStatus" SET DEFAULT 'EN_COURSE';
COMMIT;
```

**Líneas 50-59: ALTER TYPE CourseStatus**

```sql
-- AlterEnum
BEGIN;
CREATE TYPE "CourseStatus_new" AS ENUM ('IN_PROGRESS', 'PASSED_COURSE', 'FAILED_COURSE', 'PROMOTED');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "courseStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "courseStatus" TYPE "CourseStatus_new" USING ("courseStatus"::text::"CourseStatus_new");
ALTER TYPE "CourseStatus" RENAME TO "CourseStatus_old";
ALTER TYPE "CourseStatus_new" RENAME TO "CourseStatus";
DROP TYPE "public"."CourseStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "courseStatus" SET DEFAULT 'IN_PROGRESS';
COMMIT;
```

**Líneas 61-70: ALTER TYPE FinalExamStatus**

```sql
-- AlterEnum
BEGIN;
CREATE TYPE "FinalExamStatus_new" AS ENUM ('PENDING', 'NOT_REQUIRED', 'PASSED', 'FAILED');
ALTER TABLE "public"."student_subject_status" ALTER COLUMN "finalExamStatus" DROP DEFAULT;
ALTER TABLE "student_subject_status" ALTER COLUMN "finalExamStatus" TYPE "FinalExamStatus_new" USING ("finalExamStatus"::text::"FinalExamStatus_new");
ALTER TYPE "FinalExamStatus" RENAME TO "FinalExamStatus_old";
ALTER TYPE "FinalExamStatus_new" RENAME TO "FinalExamStatus";
DROP TYPE "public"."FinalExamStatus_old";
ALTER TABLE "student_subject_status" ALTER COLUMN "finalExamStatus" SET DEFAULT 'PENDING';
COMMIT;
```

**Línea 99: DROP INDEX académico**

```sql
-- DropIndex
DROP INDEX "student_subject_status_studentId_promoted_idx";
```

**Líneas 84-87: DROP CONSTRAINTs en evaluations**

```sql
-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_parentEvaluationId_fkey";

-- DropForeignKey
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_subjectId_fkey";
```

**Líneas 90: DROP CONSTRAINT en grades**

```sql
-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_evaluationId_fkey";
```

**Líneas 93: DROP CONSTRAINT en student_charges**

```sql
-- DropForeignKey
ALTER TABLE "student_charges" DROP CONSTRAINT "student_charges_academicTermId_fkey";
```

**Líneas 96: DROP CONSTRAINT en subject_enrollments**

```sql
-- DropForeignKey
ALTER TABLE "subject_enrollments" DROP CONSTRAINT "subject_enrollments_careerId_fkey";
```

**Líneas 106-110: ALTER TABLE evaluations**

```sql
-- AlterTable
ALTER TABLE "evaluations" DROP COLUMN "type",
ADD COLUMN     "type" "EvaluationType" NOT NULL,
ALTER COLUMN "maxScore" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "minPassingScore" SET DATA TYPE DECIMAL(6,2),
ALTER COLUMN "weight" SET DATA TYPE DECIMAL(6,2);
```

**Líneas 124: DROP COLUMN en grades**

```sql
-- AlterTable
ALTER TABLE "grades" DROP COLUMN "subjectId";
```

**Líneas 143-144: ALTER TABLE student_subject_status**

```sql
-- AlterTable
ALTER TABLE "student_subject_status" ALTER COLUMN "courseAverage" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "finalExamScore" SET DATA TYPE DECIMAL(5,2);
```

**Líneas 147-158: ALTER TABLE subject_enrollments**

```sql
-- AlterTable
ALTER TABLE "subject_enrollments" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "enrolledBy" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING';
```

**Líneas 332-338: CREATE INDEX en subject_enrollments**

```sql
-- CreateIndex
CREATE INDEX "subject_enrollments_studentId_status_idx" ON "subject_enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX "subject_enrollments_subjectId_status_idx" ON "subject_enrollments"("subjectId", "status");

-- CreateIndex
CREATE INDEX "subject_enrollments_academicTermId_status_idx" ON "subject_enrollments"("academicTermId", "status");
```

**Líneas 341, 344, 356, 359, 362: ADD CONSTRAINTs académicas**

```sql
-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_parentEvaluationId_fkey" FOREIGN KEY ("parentEvaluationId") REFERENCES "evaluations"("id") ON DELETE NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_enrollments" ADD CONSTRAINT "subject_enrollments_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### 2.3 SQL que Corresponde Realmente a Convenios de Pago

**Líneas 24-37: CREATE ENUMs de Convenios**

```sql
-- CreateEnum
CREATE TYPE "PaymentAgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'DEFAULTED', 'CANCELLED', 'REFINANCED');

-- CreateEnum
CREATE TYPE "PaymentAgreementInstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentAgreementChargeRelationType" AS ENUM ('REFINANCED', 'BLOCKED', 'ASSOCIATED');

-- CreateEnum
CREATE TYPE "PaymentAgreementEventType" AS ENUM ('CREATED', 'ACTIVATED', 'MODIFIED', 'CANCELLED', 'REFINANCED', 'INSTALLMENT_PAID', 'INSTALLMENT_OVERDUE', 'DEFAULTED', 'STATUS_CHANGED', 'BLOCK_EXCEPTION', 'BLOCK_REACTIVATED');

-- CreateEnum
CREATE TYPE "FinancialBlockExceptionSource" AS ENUM ('MANUAL', 'PAYMENT_AGREEMENT');
```

**Líneas 80-81: ALTER TYPE FinancialMovementType**

```sql
ALTER TYPE "FinancialMovementType" ADD VALUE 'PAYMENT_AGREEMENT';
ALTER TYPE "FinancialMovementType" ADD VALUE 'AGREEMENT_INSTALLMENT';
```

**Líneas 102-103: ALTER TABLE discounts**

```sql
-- AlterTable
ALTER TABLE "discounts" DROP COLUMN "discountType",
ADD COLUMN     "discountType" "DiscountType" NOT NULL;
```

**Líneas 113-116: ALTER TABLE financial_blocks**

```sql
-- AlterTable
ALTER TABLE "financial_blocks" ADD COLUMN     "exceptionAgreementId" TEXT,
ADD COLUMN     "exceptionSource" "FinancialBlockExceptionSource",
DROP COLUMN "blockType",
ADD COLUMN     "blockType" "FinancialBlockType" NOT NULL;
```

**Líneas 119-121: ALTER TABLE financial_movements**

```sql
-- AlterTable
ALTER TABLE "financial_movements" DROP COLUMN "movementType",
ADD COLUMN     "movementType" "FinancialMovementType" NOT NULL,
ALTER COLUMN "entityId" SET NOT NULL;
```

**Líneas 127-128: ALTER TABLE late_fees**

```sql
-- AlterTable
ALTER TABLE "late_fees" DROP COLUMN "feeType",
ADD COLUMN     "feeType" "LateFeeType" NOT NULL;
```

**Líneas 131: ALTER TABLE payment_allocations**

```sql
-- AlterTable
ALTER TABLE "payment_allocations" ADD COLUMN     "installmentId" TEXT;
```

**Líneas 134-140: ALTER TABLE receipts**

```sql
-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "agreementId" TEXT,
ADD COLUMN     "agreementNumber" INTEGER,
ADD COLUMN     "installmentNumber" INTEGER,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'ISSUED';
```

**Líneas 160-251: CREATE TABLEs de Convenios**

```sql
-- CreateTable
CREATE TABLE "payment_agreements" (...);

-- CreateTable
CREATE TABLE "payment_agreement_installments" (...);

-- CreateTable
CREATE TABLE "payment_agreement_charge_relations" (...);

-- CreateTable
CREATE TABLE "payment_agreement_events" (...);

-- CreateTable
CREATE TABLE "payment_agreement_numbers" (...);
```

**Líneas 253-330: CREATE INDEXs de Convenios**

```sql
-- CreateIndex (varios índices de payment_agreements, payment_agreement_installments, payment_agreement_charge_relations, payment_agreement_events, financial_blocks, financial_movements, payment_allocations, receipts)
```

**Líneas 347, 350, 353, 365-374: ADD CONSTRAINTs de Convenios**

```sql
-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "payment_agreement_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "payment_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_blocks" ADD CONSTRAINT "financial_blocks_exceptionAgreementId_fkey" FOREIGN KEY ("exceptionAgreementId") REFERENCES "payment_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (varios foreign keys de payment_agreement_installments, payment_agreement_charge_relations, payment_agreement_events)
```

---

## 3. Plan para Limpiar la Migración

### 3.1 Estrategia

**Crear una nueva migración limpia de Convenios de Pago que contenga solo cambios de Convenios.**

**Razón:**

- La migración existente está contaminada con cambios académicos
- Editar una migración ya commiteada es riesgoso y puede causar problemas en otras bases
- Es más seguro crear una nueva migración limpia y eliminar la contaminada

### 3.2 Cambios que NO Deben Estar en la Migración Limpia

- ❌ ALTER TYPE AcademicStatus
- ❌ ALTER TYPE CourseStatus
- ❌ ALTER TYPE FinalExamStatus
- ❌ DROP INDEX student_subject_status_studentId_promoted_idx
- ❌ DROP CONSTRAINT evaluations_parentEvaluationId_fkey
- ❌ DROP CONSTRAINT evaluations_subjectId_fkey
- ❌ DROP CONSTRAINT grades_evaluationId_fkey
- ❌ DROP CONSTRAINT student_charges_academicTermId_fkey
- ❌ DROP CONSTRAINT subject_enrollments_careerId_fkey
- ❌ ALTER TABLE evaluations (type, maxScore, minPassingScore, weight)
- ❌ DROP COLUMN subjectId en grades
- ❌ ALTER TABLE student_subject_status (courseAverage, finalExamScore)
- ❌ ALTER TABLE subject_enrollments (columnas adicionales, status)
- ❌ CREATE INDEX subject_enrollments_studentId_status_idx
- ❌ CREATE INDEX subject_enrollments_subjectId_status_idx
- ❌ CREATE INDEX subject_enrollments_academicTermId_status_idx
- ❌ ADD CONSTRAINT grades_evaluationId_fkey
- ❌ ADD CONSTRAINT student_charges_academicTermId_fkey
- ❌ ADD CONSTRAINT evaluations_parentEvaluationId_fkey
- ❌ ADD CONSTRAINT evaluations_subjectId_fkey
- ❌ ADD CONSTRAINT subject_enrollments_careerId_fkey

### 3.3 Cambios que DEBEN Estar en la Migración Limpia

- ✅ CREATE TYPE PaymentAgreementStatus
- ✅ CREATE TYPE PaymentAgreementInstallmentStatus
- ✅ CREATE TYPE PaymentAgreementChargeRelationType
- ✅ CREATE TYPE PaymentAgreementEventType
- ✅ CREATE TYPE FinancialBlockExceptionSource
- ✅ ALTER TYPE FinancialMovementType (ADD VALUE PAYMENT_AGREEMENT, AGREEMENT_INSTALLMENT)
- ✅ ALTER TABLE discounts (discountType)
- ✅ ALTER TABLE financial_blocks (exceptionAgreementId, exceptionSource, blockType)
- ✅ ALTER TABLE financial_movements (movementType, entityId)
- ✅ ALTER TABLE late_fees (feeType)
- ✅ ALTER TABLE payment_allocations (installmentId)
- ✅ ALTER TABLE receipts (agreementId, agreementNumber, installmentNumber, paymentMethod, status)
- ✅ CREATE TABLE payment_agreements
- ✅ CREATE TABLE payment_agreement_installments
- ✅ CREATE TABLE payment_agreement_charge_relations
- ✅ CREATE TABLE payment_agreement_events
- ✅ CREATE TABLE payment_agreement_numbers
- ✅ CREATE INDEXs de Convenios
- ✅ ADD CONSTRAINTs de Convenios

---

## 4. Plan para Recuperar la Migración Fallida

### 4.1 Comando Propuesto

```bash
npx prisma migrate resolve --rolled-back 20260620164627_add_payment_agreements_phase1
```

### 4.2 Por Qué Corresponde Usar --rolled-back

**Razón:** La migración falló con 0 steps aplicados, pero dejó enums huérfanos en la base real. Marcarla como rolled-back indica que la migración no se aplicó exitosamente y debe ser recuperada.

### 4.3 Confirmación de applied_steps_count = 0

**Confirmado:** `applied_steps_count = 0` según diagnóstico de \_prisma_migrations.

### 4.4 Confirmación de Que No Hubo Tablas de Convenios Creadas

**Confirmado:** No se crearon tablas de Convenios según diagnóstico de information_schema.tables.

### 4.5 Confirmación de Qué Objetos Parciales Sí Quedaron

**Confirmado:** Los 4 enums de Convenios quedaron huérfanos en la base real:

- PaymentAgreementChargeRelationType
- PaymentAgreementEventType
- PaymentAgreementInstallmentStatus
- PaymentAgreementStatus

---

## 5. Plan para Enums Huérfanos

### 5.1 Enums Huérfanos Exactos

- `PaymentAgreementChargeRelationType`
- `PaymentAgreementEventType`
- `PaymentAgreementInstallmentStatus`
- `PaymentAgreementStatus`

### 5.2 Confirmación de Que No Están Usados por Ninguna Tabla

**Confirmado:** Las dependencias verificadas con pg_depend son solo dependencias internas de pg_type (sistema), no dependencias de tablas o columnas.

### 5.3 SQL Controlado para Eliminarlos

```sql
DROP TYPE IF EXISTS "PaymentAgreementChargeRelationType";
DROP TYPE IF EXISTS "PaymentAgreementEventType";
DROP TYPE IF EXISTS "PaymentAgreementInstallmentStatus";
DROP TYPE IF EXISTS "PaymentAgreementStatus";
```

**Nota:** Usar `IF EXISTS` para evitar errores si ya fueron eliminados.

---

## 6. Validación en Copia Temporal

### 6.1 Limitación

**Limitación:** No se puede crear una copia temporal de la base real porque las herramientas de línea de comandos de PostgreSQL (createdb, pg_dump, psql) no están disponibles en el entorno.

### 6.2 Mitigación

**Mitigación:** Validar exhaustivamente en base temporal limpia y usar consultas read-only para verificar el estado de la base real antes de cualquier modificación.

---

## 7. Validación en Base Temporal Limpia

### 7.1 Recrear Flujo Desde Cero

**Pasos:**

1. Limpiar base temporal `sistema_freire_migration_test`:

   ```bash
   # No se puede hacer DROP DATABASE sin psql, pero se puede usar migrate reset si está autorizado
   # Por ahora, asumimos que la base temporal ya está en estado limpio
   ```

2. Aplicar todas las migraciones previas:

   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx prisma migrate deploy
   ```

3. Crear migración limpia de Convenios:

   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx prisma migrate dev --name add_payment_agreements_phase1_clean
   ```

4. Validar que la migración limpia no contenga cambios académicos:

   ```bash
   cat prisma/migrations/20260620XXXXXX_add_payment_agreements_phase1_clean/migration.sql
   ```

5. Aplicar migración limpia:

   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx prisma migrate deploy
   ```

6. Ejecutar script de prueba de Convenios:

   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx tsx scripts/test-payment-agreements-schema.ts
   ```

7. Validar que no falle por objetos académicos:
   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx prisma migrate status
   ```

---

## 8. Comandos Exactos Propuestos

### 8.1 Comandos de Diagnóstico Read-Only (Ya Ejecutados)

```bash
npx tsx scripts/diagnose-failed-migration.ts
npx tsx scripts/check-enum-dependencies.ts
```

### 8.2 Comandos de Recuperación Real (NO Ejecutar Aún)

```bash
# Paso 1: Marcar migración fallida como rolled-back
npx prisma migrate resolve --rolled-back 20260620164627_add_payment_agreements_phase1

# Paso 2: Eliminar enums huérfanos (requiere script SQL controlado)
# Crear script scripts/clean-orphan-enums.ts con el SQL de DROP TYPE
npx tsx scripts/clean-orphan-enums.ts

# Paso 3: Eliminar migración contaminada
rm -rf prisma/migrations/20260620164627_add_payment_agreements_phase1

# Paso 4: Crear migración limpia de Convenios
npx prisma migrate dev --name add_payment_agreements_phase1_clean

# Paso 5: Validar migración limpia
cat prisma/migrations/20260620XXXXXX_add_payment_agreements_phase1_clean/migration.sql

# Paso 6: Aplicar migración limpia en base real
npx prisma migrate deploy

# Paso 7: Generar Prisma Client
npx prisma generate

# Paso 8: Ejecutar seed de permisos (si es idempotente)
npx tsx prisma/seed-permissions.ts
```

### 8.3 Comandos de Validación Post-Recuperación (NO Ejecutar Aún)

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run check
npm run build
npx tsx scripts/test-payment-agreements-schema.ts
git status --short
git diff --name-status
git diff --stat
```

---

## 9. Riesgos

### 9.1 Riesgo de Editar una Migración Ya Commiteada

**Riesgo:** MEDIO
**Descripción:** Editar una migración ya commiteada puede causar problemas en otras bases que ya la aplicaron.
**Mitigación:** No editar la migración existente. Crear una nueva migración limpia y eliminar la contaminada.

### 9.2 Riesgo de Marcar Rollback Incorrectamente

**Riesgo:** BAJO
**Descripción:** Marcar una migración como rolled-back cuando no corresponde puede causar inconsistencias en el historial.
**Mitigación:** Confirmar que applied_steps_count = 0 y que no hubo tablas creadas antes de marcar rolled-back.

### 9.3 Riesgo de Borrar Enums si Tienen Dependencias

**Riesgo:** BAJO
**Descripción:** Eliminar enums que tienen dependencias puede causar errores en la base de datos.
**Mitigación:** Verificar dependencias con pg_depend antes de eliminar. Confirmado que solo tienen dependencias internas de pg_type.

### 9.4 Riesgo de Que Otra Base Ya Haya Aplicado la Migración Contaminada

**Riesgo:** NULO
**Descripción:** Si otra base ya aplicó la migración contaminada, la recuperación puede causar inconsistencias.
**Mitigación:** Confirmar que solo la base real `sistema_freire` tiene la migración fallida. No hay otras bases en producción.

### 9.5 Riesgo de Que el Deploy Vuelva a Intentar la Migración Contaminada

**Riesgo:** BAJO
**Descripción:** Si no se elimina la migración contaminada, el deploy puede volver a intentar aplicarla.
**Mitigación:** Eliminar la migración contaminada después de marcarla como rolled-back.

---

## 10. Recomendación Final

### 10.1 Opción Recomendada

**Opción:** Crear una nueva migración limpia de Convenios de Pago y eliminar la contaminada.

### 10.2 Por Qué

**Razones:**

1. La migración existente está contaminada con cambios académicos
2. No se puede aplicar directamente sin resolver el drift académico
3. Editar una migración ya commiteada es riesgoso
4. Crear una nueva migración limpia es más seguro y controlable
5. Permite validar exhaustivamente antes de aplicar en base real

### 10.3 Pasos que Deben Ejecutarse, en Qué Orden

**Orden:**

1. Marcar migración fallida como rolled-back
2. Eliminar enums huérfanos de la base real
3. Eliminar migración contaminada
4. Crear migración limpia de Convenios
5. Validar migración limpia en base temporal
6. Aplicar migración limpia en base real
7. Generar Prisma Client
8. Ejecutar seed de permisos (si es idempotente)
9. Ejecutar validaciones post-recuperación

### 10.4 Validaciones que Deben Pasar Antes y Después

**Validaciones antes:**

- ✅ npx prisma validate
- ✅ npx prisma migrate status (confirmar solo migración fallida pendiente)
- ✅ Verificar dependencias de enums huérfanos
- ✅ Validar migración limpia en base temporal

**Validaciones después:**

- ✅ npx prisma format
- ✅ npx prisma validate
- ✅ npx prisma generate
- ✅ npx prisma migrate status (confirmar todas las migraciones aplicadas)
- ✅ npm run check
- ✅ npm run build
- ✅ npx tsx scripts/test-payment-agreements-schema.ts

---

## 11. Contenido Exacto de la Migración Contaminada

**Archivo:** `prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql`

**Contenido completo:** 381 líneas de SQL

**Resumen:**

- Líneas 1-23: Warnings de Prisma
- Líneas 24-37: CREATE ENUMs de Convenios (✅ correcto)
- Líneas 39-70: ALTER TYPE AcademicStatus (❌ académico, NO debería estar)
- Líneas 50-59: ALTER TYPE CourseStatus (❌ académico, NO debería estar)
- Líneas 61-70: ALTER TYPE FinalExamStatus (❌ académico, NO debería estar)
- Líneas 80-81: ALTER TYPE FinancialMovementType (✅ correcto)
- Líneas 84-99: DROP CONSTRAINTs y DROP INDEX académicos (❌ académico, NO debería estar)
- Líneas 102-158: ALTER TABLEs académicas y financieras (❌ mezcla de académico y financiero)
- Líneas 160-251: CREATE TABLEs de Convenios (✅ correcto)
- Líneas 253-381: CREATE INDEXs y ADD CONSTRAINTs (❌ mezcla de académico y Convenios)

---

## 12. Propuesta de Versión Limpia de Migración de Convenios

**Nombre propuesto:** `20260620170000_add_payment_agreements_phase1_clean`

**Contenido propuesto:** Solo SQL de Convenios de Pago (líneas 24-37, 80-81, 102-103, 113-116, 119-121, 127-128, 131, 134-140, 160-251, 253-330, 347, 350, 353, 365-374 de la migración contaminada)

**Cambios financieros incluidos:**

- ALTER TABLE discounts (discountType)
- ALTER TABLE financial_blocks (exceptionAgreementId, exceptionSource, blockType)
- ALTER TABLE financial_movements (movementType, entityId)
- ALTER TABLE late_fees (feeType)
- ALTER TABLE receipts (paymentMethod, status)

**Cambios académicos excluidos:**

- Todos los cambios en AcademicStatus, CourseStatus, FinalExamStatus
- Todos los cambios en evaluations, grades, student_subject_status, subject_enrollments
- Todos los DROP CONSTRAINTs y DROP INDEXs académicos

---

## 13. Confirmación de Seguridad

**Confirmaciones:**

- ✅ NO se ejecutó `migrate resolve`
- ✅ NO se ejecutó `DROP TYPE`
- ✅ NO se editó `_prisma_migrations`
- ✅ NO se aplicaron migraciones nuevas
- ✅ NO se usó `db push`
- ✅ NO se usó `migrate reset` en base real
- ✅ NO se hizo SQL de escritura
- ✅ NO se hizo commit ni push
- ✅ NO se modificó la base real

**Estado:** Lista para revisión y aprobación del plan de recuperación.

---

## 14. Próximos Pasos Requeridos

1. **Revisar este plan** - El usuario debe revisar el plan de recuperación
2. **Autorizar la estrategia** - El usuario debe aprobar la creación de migración limpia
3. **Autorizar comandos de recuperación** - El usuario debe autorizar los comandos específicos
4. **Proceder con la recuperación** - Ejecutar los pasos del plan
5. **Validar resultado** - Ejecutar validaciones post-recuperación

---

## 15. Conclusión

**Estado:** Plan de recuperación controlado preparado.

**Recomendación:** Crear una nueva migración limpia de Convenios de Pago y eliminar la contaminada.

**Riesgo total:** MEDIO - Requiere intervención controlada pero es recuperable con validaciones exhaustivas.

**Autorización requerida:** El usuario debe aprobar el plan de recuperación antes de proceder.
