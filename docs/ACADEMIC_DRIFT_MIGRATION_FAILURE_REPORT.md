# Informe de Recuperación - Migración Fallida de Convenios de Pago

## Fecha de Informe

20 de Junio de 2026

## Estado de la Migración Fallida

**Migración:** `20260620164627_add_payment_agreements_phase1`
**Estado:** Fallida (registrada en `_prisma_migrations` con `finished_at = null`)
**Applied Steps Count:** 0
**Error:** `ERROR: index "student_subject_status_studentId_promoted_idx" does not exist`

---

## 1. Estado de _prisma_migrations

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

---

## 2. SQL Exacto Problemático

```sql
DROP INDEX "student_subject_status_studentId_promoted_idx";
```

**Error:**
```
ERROR: index "student_subject_status_studentId_promoted_idx" does not exist
Database error code: 42704
```

**Causa:** La migración intenta eliminar un índice que no existe en la base real.

---

## 3. Índices Actuales de student_subject_status

**Índices presentes en base real:**
1. `student_subject_status_pkey` - PRIMARY KEY
2. `student_subject_status_studentId_academicStatus_idx` - INDEX
3. `student_subject_status_studentId_courseStatus_idx` - INDEX
4. `student_subject_status_studentId_regularityStatus_idx` - INDEX
5. `student_subject_status_studentId_subjectId_key` - UNIQUE INDEX

**Índice faltante:** `student_subject_status_studentId_promoted_idx` - NO existe

**Confirmación:** El índice que la migración intenta eliminar no existe en la base real.

---

## 4. ¿La Migración Contiene Drift Académico Mezclado?

**SÍ, la migración contiene DRIFT ACADÉMICO MEZCLADO con Convenios de Pago.**

### Cambios académicos en la migración (NO DEBERÍAN ESTAR AQUÍ):

1. **ALTER TYPE "AcademicStatus"**
   - Cambio de enum académico
   - Valores: EN_COURSE, REGULAR, LIBRE, APROBADO, PROMOCIONADO

2. **ALTER TYPE "CourseStatus"**
   - Cambio de enum académico
   - Valores: IN_PROGRESS, PASSED_COURSE, FAILED_COURSE, PROMOTED

3. **ALTER TYPE "FinalExamStatus"**
   - Cambio de enum académico
   - Valores: PENDING, NOT_REQUIRED, PASSED, FAILED

4. **DROP INDEX "student_subject_status_studentId_promoted_idx"**
   - Eliminación de índice académico
   - **Este es el SQL que causó el error**

5. **ALTER TABLE "evaluations"**
   - DROP CONSTRAINT "evaluations_parentEvaluationId_fkey"
   - DROP CONSTRAINT "evaluations_subjectId_fkey"
   - ALTER COLUMN "type" (EvaluationType)
   - ALTER COLUMN "maxScore", "minPassingScore", "weight" (DECIMAL)

6. **ALTER TABLE "grades"**
   - DROP CONSTRAINT "grades_evaluationId_fkey"
   - DROP COLUMN "subjectId"

7. **ALTER TABLE "student_subject_status"**
   - ALTER COLUMN "courseAverage", "finalExamScore" (DECIMAL)

8. **ALTER TABLE "subject_enrollments"**
   - DROP CONSTRAINT "subject_enrollments_careerId_fkey"
   - Agregar columnas: cancellationReason, cancelledAt, cancelledBy, confirmedAt, confirmedBy, enrolledBy, observations, rejectedAt, rejectedBy, rejectionReason
   - ALTER COLUMN "status" (EnrollmentStatus)

### Cambios de Convenios de Pago (LOS ÚNICOS QUE DEBERÍAN ESTAR AQUÍ):

1. **ALTER TYPE "FinancialMovementType"**
   - ADD VALUE 'PAYMENT_AGREEMENT'
   - ADD VALUE 'AGREEMENT_INSTALLMENT'

2. **ALTER TABLE "financial_blocks"**
   - ADD COLUMN "exceptionAgreementId"
   - ADD COLUMN "exceptionSource"
   - DROP COLUMN "blockType"
   - ADD COLUMN "blockType" (FinancialBlockType)

3. **ALTER TABLE "financial_movements"**
   - DROP COLUMN "movementType"
   - ADD COLUMN "movementType" (FinancialMovementType)
   - ALTER COLUMN "entityId" SET NOT NULL

4. **ALTER TABLE "payment_allocations"**
   - ADD COLUMN "installmentId"

5. **ALTER TABLE "receipts"**
   - ADD COLUMN "agreementId"
   - ADD COLUMN "agreementNumber"
   - ADD COLUMN "installmentNumber"
   - DROP COLUMN "paymentMethod"
   - ADD COLUMN "paymentMethod" (PaymentMethod)
   - DROP COLUMN "status"
   - ADD COLUMN "status" (ReceiptStatus)

6. **CREATE TABLE "payment_agreements"**
   - Tabla principal de Convenios de Pago

7. **CREATE TABLE "payment_agreement_installments"**
   - Tabla de cuotas de Convenios

8. **CREATE TABLE "payment_agreement_charge_relations"**
   - Tabla de relaciones entre Convenios y Cargos

9. **CREATE TABLE "payment_agreement_events"**
   - Tabla de eventos de Convenios

**Confirmación:** La migración mezcla cambios académicos (que no deberían estar aquí) con cambios de Convenios de Pago (que sí deberían estar aquí).

---

## 5. ¿Se Creó Algo Parcial de Convenios?

### Tablas de Convenios:

**Resultado:** ✅ No se encontraron tablas de Convenios (no se creó nada parcial)

### Enums de Convenios:

**Resultado:** ⚠️ Se encontraron enums de Convenios en la base real:
- `PaymentAgreementChargeRelationType`: [REFINANCED, BLOCKED, ASSOCIATED]
- `PaymentAgreementEventType`: [CREATED, ACTIVATED, MODIFIED, CANCELLED, REFINANCED, INSTALLMENT_PAID, INSTALLMENT_OVERDUE, DEFAULTED, STATUS_CHANGED, BLOCK_EXCEPTION, BLOCK_REACTIVATED]
- `PaymentAgreementInstallmentStatus`: [PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, WAIVED]
- `PaymentAgreementStatus`: [DRAFT, ACTIVE, COMPLETED, OVERDUE, DEFAULTED, CANCELLED, REFINANCED]

**Análisis:** Los enums de Convenios ya existen en la base real, pero las tablas de Convenios no. Esto sugiere que:
- Los enums se crearon antes del error (posiblemente en un step anterior)
- La migración falló antes de crear las tablas
- Los enums quedaron "huérfanos" en la base real

**Confirmación:** Se crearon los enums de Convenios parcialmente, pero no las tablas.

---

## 6. Applied Steps Count

**Resultado:** 0

**Confirmación:** La migración falló antes de aplicar cualquier step completo. Sin embargo, los enums de Convenios ya existen, lo que sugiere que se crearon en un step parcial que no se contó.

---

## 7. Causa Raíz del Problema

**La migración de Convenios de Pago fue generada desde un schema.prisma que todavía arrastraba diferencias académicas.**

**Secuencia probable de eventos:**

1. Las migraciones académicas (`20260609163939`, `20260609170000`) se marcaron como aplicadas con 0 steps
2. El schema.prisma se actualizó con los cambios académicos (enums, columnas, índices)
3. La base real se modificó manualmente o con `db push` para coincidir con el schema académico
4. Se creó la migración de Convenios de Pago usando `migrate dev`
5. Prisma detectó diferencias entre el schema actual y la base real
6. Prisma generó una migración que incluye tanto los cambios de Convenios como los cambios académicos pendientes
7. Al aplicar la migración en la base real, falló porque algunos cambios académicos ya estaban aplicados (como el índice faltante)

**Conclusión:** La migración de Convenios de Pago está contaminada con cambios académicos y no puede aplicarse directamente.

---

## 8. Recomendación de Recuperación Segura

### Estrategia: Recrear la migración de Convenios de Pago limpia

**Pasos:**

1. **Marcar la migración fallida como rolled-back:**
   ```bash
   npx prisma migrate resolve --rolled-back 20260620164627_add_payment_agreements_phase1
   ```
   - Esto limpiará el registro de migración fallida
   - Permitirá aplicar nuevas migraciones

2. **Eliminar los enums de Convenios huérfanos de la base real:**
   ```sql
   DROP TYPE "PaymentAgreementChargeRelationType";
   DROP TYPE "PaymentAgreementEventType";
   DROP TYPE "PaymentAgreementInstallmentStatus";
   DROP TYPE "PaymentAgreementStatus";
   ```
   - Estos enums se crearon parcialmente y deben eliminarse
   - Se recrearán con la migración limpia

3. **Corregir el schema.prisma para eliminar cambios académicos:**
   - Revertir cambios en enums académicos (AcademicStatus, CourseStatus, FinalExamStatus)
   - Revertir cambios en tablas académicas (evaluations, grades, student_subject_status, subject_enrollments)
   - Mantener solo cambios de Convenios de Pago y cambios financieros

4. **Eliminar la migración contaminada:**
   ```bash
   rm -rf prisma/migrations/20260620164627_add_payment_agreements_phase1
   ```

5. **Crear una nueva migración limpia de Convenios de Pago:**
   ```bash
   npx prisma migrate dev --name add_payment_agreements_phase1_clean
   ```
   - Esta migración debe contener solo cambios de Convenios de Pago
   - No debe contener cambios académicos

6. **Validar la nueva migración en base temporal:**
   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx prisma migrate deploy
   ```
   - Verificar que la migración se aplique sin errores
   - Verificar que solo se creen tablas y enums de Convenios

7. **Aplicar la nueva migración en base real:**
   ```bash
   npx prisma migrate deploy
   ```
   - Verificar que se aplique sin errores
   - Verificar que se creen las tablas de Convenios

8. **Ejecutar validaciones post-migración:**
   ```bash
   npx prisma validate
   npx prisma migrate status
   npm run check
   npm run build
   npx tsx scripts/test-payment-agreements-schema.ts
   ```

### Riesgos y Mitigaciones

**Riesgo 1:** Eliminar los enums de Convenios huérfanos puede causar errores si hay código que los referencia.
- **Mitigación:** Verificar que no hay código usando estos enums antes de eliminarlos.

**Riesgo 2:** Corregir el schema.prisma puede introducir nuevos errores de drift.
- **Mitigación:** Validar exhaustivamente en base temporal antes de aplicar en base real.

**Riesgo 3:** La nueva migración puede contener cambios no deseados.
- **Mitigación:** Revisar manualmente el SQL de la nueva migración antes de aplicar.

---

## 9. Confirmación de Seguridad

**Confirmaciones:**

- ✅ NO se usó `db push`
- ✅ NO se usó `migrate reset`
- ✅ NO se usó `migrate resolve` (aún)
- ✅ NO se usó SQL manual de escritura
- ✅ NO se editó `_prisma_migrations` manualmente
- ✅ NO se creó otra migración nueva
- ✅ NO se modificó la migración de Convenios existente
- ✅ NO se hizo commit/push

**Estado:** Lista para proceder con la recuperación según la recomendación.

---

## 10. Próximos Pasos Requeridos

1. **Autorizar la estrategia de recuperación** - El usuario debe aprobar la recomendación
2. **Autorizar el uso de `migrate resolve --rolled-back`** - El usuario debe autorizar este comando específico
3. **Autorizar la eliminación de enums huérfanos** - El usuario debe autorizar la eliminación de los enums
4. **Proceder con la recuperación** - Ejecutar los pasos recomendados

---

## 11. Conclusión

**Estado:** La migración de Convenios de Pago falló porque está contaminada con cambios académicos.

**Causa:** La migración fue generada desde un schema.prisma que arrastraba diferencias académicas no resueltas.

**Solución:** Recrear la migración de Convenios de Pago limpia, sin cambios académicos.

**Riesgo total:** MEDIO - Requiere intervención controlada pero es recuperable.

**Autorización requerida:** El usuario debe aprobar la estrategia de recuperación antes de proceder.
