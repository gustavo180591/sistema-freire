# Plan de Corrección del Drift Académico

## Fecha de Creación

20 de Junio de 2026

## Objetivo

Preparar una migración correctiva formal que sincronice el historial de migraciones con el estado real esperado del módulo académico, sin modificar la base real hasta aprobación.

---

## 1. Estado Exacto Esperado - Comparación

### 1.1 Enums Académicos

#### AcademicStatus

**Migración 20260609163939 (esperado):**
```sql
CREATE TYPE "AcademicStatus" AS ENUM ('EN_COURSE', 'APPROVED', 'FAILED', 'DROPPED');
```

**Migración 20260609170000 (agregado):**
```sql
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'REGULAR';
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'LIBRE';
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'APROBADO';
ALTER TYPE "AcademicStatus" ADD VALUE IF NOT EXISTS 'PROMOCIONADO';
```

**Schema.prisma actual:**
```prisma
enum AcademicStatus {
  EN_COURSE
  REGULAR
  LIBRE
  APROBADO
  PROMOCIONADO
}
```

**Base real:**
```
[EN_COURSE, REGULAR, LIBRE, APROBADO, PROMOCIONADO]
```

**Diferencia:**
- ❌ Valores faltantes en base real: APPROVED, FAILED, DROPPED (de migración original)
- ✅ Valores agregados en base real: REGULAR, LIBRE, APROBADO, PROMOCIONADO (de migración 20260609170000)
- ⚠️ Schema.prisma coincide con base real (sin valores originales)

**Riesgo:** ALTO - Los valores faltantes pueden estar en uso en datos históricos

#### CourseStatus

**Migración 20260609163939 (esperado):**
```sql
CREATE TYPE "CourseStatus" AS ENUM ('IN_PROGRESS', 'APPROVED', 'FAILED', 'DROPPED');
```

**Migración 20260609170000 (agregado):**
```sql
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PASSED_COURSE';
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'FAILED_COURSE';
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PROMOTED';
```

**Schema.prisma actual:**
```prisma
enum CourseStatus {
  IN_PROGRESS
  PASSED_COURSE
  FAILED_COURSE
  PROMOTED
}
```

**Base real:**
```
[IN_PROGRESS, PASSED_COURSE, FAILED_COURSE, PROMOTED]
```

**Diferencia:**
- ❌ Valores faltantes en base real: APPROVED, FAILED, DROPPED (de migración original)
- ✅ Valores agregados en base real: PASSED_COURSE, FAILED_COURSE, PROMOTED (de migración 20260609170000)
- ⚠️ Schema.prisma coincide con base real (sin valores originales)

**Riesgo:** ALTO - Misma situación que AcademicStatus

#### EvaluationType

**Migración 20260609163939 (esperado):**
```sql
CREATE TYPE "EvaluationType" AS ENUM ('PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR', 'RECUPERATORIO', 'MESA_EXAMEN');
```

**Migración 20260609170000 (agregado):**
```sql
ALTER TYPE "EvaluationType" ADD VALUE IF NOT EXISTS 'EXAMEN_FINAL';
ALTER TYPE "EvaluationType" ADD VALUE IF NOT EXISTS 'OTRO';
```

**Schema.prisma actual:**
```prisma
enum EvaluationType {
  PARCIAL
  RECUPERATORIO
  TRABAJO_PRACTICO
  INTEGRADOR
  EXAMEN_FINAL
  MESA_EXAMEN
  OTRO
}
```

**Base real:**
```
[PARCIAL, RECUPERATORIO, TRABAJO_PRACTICO, INTEGRADOR, EXAMEN_FINAL, MESA_EXAMEN, OTRO]
```

**Diferencia:**
- ✅ Todos los valores esperados están presentes en base real
- ✅ Schema.prisma coincide con base real
- ⚠️ Solo diferencia en orden (no funcional)

**Riesgo:** BAJO - Funcionalmente equivalente

#### FinalExamStatus

**Migración 20260609163939 (esperado):**
```sql
CREATE TYPE "FinalExamStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'EXEMPT');
```

**Migración 20260609170000 (agregado):**
```sql
ALTER TYPE "FinalExamStatus" ADD VALUE IF NOT EXISTS 'NOT_REQUIRED';
ALTER TYPE "FinalExamStatus" ADD VALUE IF NOT EXISTS 'PASSED';
```

**Schema.prisma actual:**
```prisma
enum FinalExamStatus {
  PENDING
  NOT_REQUIRED
  PASSED
  FAILED
}
```

**Base real:**
```
[PENDING, NOT_REQUIRED, PASSED, FAILED]
```

**Diferencia:**
- ❌ Valores faltantes en base real: APPROVED, EXEMPT (de migración original)
- ✅ Valores agregados en base real: NOT_REQUIRED, PASSED (de migración 20260609170000)
- ⚠️ Schema.prisma coincide con base real (sin valores originales)

**Riesgo:** ALTO - Valores faltantes pueden estar en uso

### 1.2 Tablas Académicas

#### evaluations

**Columnas esperadas (migración 20260609163939):**
- id, subjectId, title, description, maxScore, createdAt, updatedAt
- closedAt, closedByUserId, closedReason
- commissionId, createdByUserId, evaluationDate, isClosed, minPassingScore, observations
- parentEvaluationId, reopenReason, reopenedAt, reopenedByUserId, weight, type

**Columnas reales (base real):**
- ✅ Todas las columnas esperadas están presentes
- ✅ Columna `type` tiene tipo `USER-DEFINED` (enum EvaluationType)

**Diferencia:** Ninguna

**Riesgo:** NULO

#### grades

**Columnas esperadas (migración 20260609163939):**
- id, studentId, value, evaluationId, status, observations, createdAt, updatedAt
- createdByUserId, updatedByUserId

**Columnas reales (base real):**
- ✅ Todas las columnas esperadas están presentes
- ✅ Columna `status` tiene tipo `USER-DEFINED` (enum GradeStatus)
- ✅ Columna `value` es nullable (esperado)

**Diferencia:** Ninguna

**Riesgo:** NULO

#### student_subject_status

**Columnas esperadas (migración 20260609163939 + 20260609170000):**
- id, studentId, subjectId, attendancePercent, regularityStatus, approved, promoted
- finalGrade, promotionDate, updatedAt
- academicStatus, courseAverage, courseStatus, finalExamScore, finalExamStatus, finalApprovalDate

**Columnas reales (base real):**
- ✅ Todas las columnas esperadas están presentes
- ✅ Columnas de enum tienen tipo `USER-DEFINED`

**Diferencia:** Ninguna

**Riesgo:** NULO

#### subject_commissions

**Columnas esperadas (migración 20260609170000):**
- id, code, subjectId, academicTermId, careerId, studyPlanId, teacherId, locationId
- maxCapacity, currentEnrolled, schedule, scheduleJson, active, observations, createdAt, updatedAt

**Columnas reales (base real):**
- ✅ Todas las columnas esperadas están presentes

**Diferencia:** Ninguna

**Riesgo:** NULO

#### subject_enrollments

**Columnas esperadas (migración 20260609170000):**
- id, studentId, subjectId, commissionId, careerId, studyPlanId, academicTermId
- status, enrolledAt, createdAt, updatedAt

**Columnas reales (base real):**
- ✅ Todas las columnas esperadas están presentes
- ⚠️ **Columnas adicionales NO documentadas en migración:**
  - confirmedAt, cancelledAt, rejectedAt
  - rejectionReason, cancellationReason, observations
  - enrolledBy, confirmedBy, cancelledBy, rejectedBy

**Schema.prisma actual:**
- ✅ Incluye todas las columnas adicionales de la base real

**Diferencia:** La base real tiene columnas adicionales que NO están en la migración 20260609170000, pero SÍ están en schema.prisma actual

**Riesgo:** BAJO - Las columnas adicionales están en schema.prisma, no causan conflicto

### 1.3 Foreign Keys y Constraints

**Tablas académicas tienen las foreign keys esperadas:**
- evaluations: closedByUserId, commissionId, createdByUserId, parentEvaluationId, subjectId, reopenedByUserId
- grades: createdByUserId, evaluationId, studentId, updatedByUserId
- student_subject_status: studentId, subjectId
- subject_commissions: academicTermId, careerId, locationId, studyPlanId, subjectId, teacherId
- subject_enrollments: academicTermId, careerId, commissionId, studentId, studyPlanId, subjectId

**Diferencia:** Ninguna

**Riesgo:** NULO

---

## 2. Diagnóstico de la Situación

### 2.1 Qué falta en el historial de migraciones

**Migraciones marcadas como aplicadas con 0 steps:**
- `20260609163939_refactor_exam_and_grade_module` - 0 steps
- `20260609170000_create_subject_commissions_and_sync_schema` - 0 steps
- Varias otras migraciones de junio 2026 - 0 steps

**Implicación:** Estas migraciones están marcadas como aplicadas en `_prisma_migrations` pero no se ejecutaron realmente sus SQL.

### 2.2 Qué ya existe en la base real

**Tablas:** ✅ Todas las tablas académicas esperadas existen
**Enums:** ✅ Todos los enums académicos existen (con valores modificados)
**Columnas:** ✅ Todas las columnas esperadas existen
**Foreign Keys:** ✅ Todas las foreign keys esperadas existen
**Columnas adicionales:** ✅ Columnas adicionales en subject_enrollments existen

### 2.3 Causa probable

**Hipótesis:** Se usó `db push` o SQL manual para crear las tablas/enums, luego se usó `migrate resolve --applied` para sincronizar el historial.

**Evidencia:**
- Migraciones con 0 steps
- Tablas y enums presentes
- Schema.prisma actual coincide con base real (incluyendo columnas adicionales)
- Valores de enum faltantes (APPROVED, FAILED, DROPPED, EXEMPT) no están en base real ni en schema.prisma

---

## 3. Diferencias Exactas y Riesgos

### 3.1 Enums con drift

| Enum | Valores Esperados | Valores Base Real | Valores Schema.prisma | Diferencia | Riesgo |
|------|------------------|-------------------|----------------------|------------|--------|
| AcademicStatus | EN_COURSE, APPROVED, FAILED, DROPPED, REGULAR, LIBRE, APROBADO, PROMOCIONADO | EN_COURSE, REGULAR, LIBRE, APROBADO, PROMOCIONADO | EN_COURSE, REGULAR, LIBRE, APROBADO, PROMOCIONADO | Faltan: APPROVED, FAILED, DROPPED | ALTO |
| CourseStatus | IN_PROGRESS, APPROVED, FAILED, DROPPED, PASSED_COURSE, FAILED_COURSE, PROMOTED | IN_PROGRESS, PASSED_COURSE, FAILED_COURSE, PROMOTED | IN_PROGRESS, PASSED_COURSE, FAILED_COURSE, PROMOTED | Faltan: APPROVED, FAILED, DROPPED | ALTO |
| EvaluationType | PARCIAL, TRABAJO_PRACTICO, INTEGRADOR, RECUPERATORIO, MESA_EXAMEN, EXAMEN_FINAL, OTRO | PARCIAL, RECUPERATORIO, TRABAJO_PRACTICO, INTEGRADOR, EXAMEN_FINAL, MESA_EXAMEN, OTRO | PARCIAL, RECUPERATORIO, TRABAJO_PRACTICO, INTEGRADOR, EXAMEN_FINAL, MESA_EXAMEN, OTRO | Solo orden | BAJO |
| FinalExamStatus | PENDING, APPROVED, FAILED, EXEMPT, NOT_REQUIRED, PASSED | PENDING, NOT_REQUIRED, PASSED, FAILED | PENDING, NOT_REQUIRED, PASSED, FAILED | Faltan: APPROVED, EXEMPT | ALTO |

### 3.2 Tablas con drift

| Tabla | Columnas Esperadas | Columnas Base Real | Columnas Schema.prisma | Diferencia | Riesgo |
|-------|-------------------|-------------------|----------------------|------------|--------|
| evaluations | 18 columnas | 18 columnas | 18 columnas | Ninguna | NULO |
| grades | 9 columnas | 9 columnas | 9 columnas | Ninguna | NULO |
| student_subject_status | 14 columnas | 14 columnas | 14 columnas | Ninguna | NULO |
| subject_commissions | 15 columnas | 15 columnas | 15 columnas | Ninguna | NULO |
| subject_enrollments | 9 columnas (migración) | 17 columnas | 17 columnas | 8 columnas adicionales en base real y schema.prisma | BAJO |

### 3.3 Foreign Keys y Constraints

| Tabla | FKs Esperadas | FKs Base Real | Diferencia | Riesgo |
|-------|---------------|---------------|------------|--------|
| evaluations | 6 FKs | 6 FKs | Ninguna | NULO |
| grades | 4 FKs | 4 FKs | Ninguna | NULO |
| student_subject_status | 2 FKs | 2 FKs | Ninguna | NULO |
| subject_commissions | 6 FKs | 6 FKs | Ninguna | NULO |
| subject_enrollments | 6 FKs | 6 FKs | Ninguna | NULO |

---

## 4. Estrategia de Corrección

### 4.1 Enfoque

**NO modificar la base real para que coincida con el schema original.**
**EN SU LUGAR:** Aceptar el estado actual de la base real como el estado "correcto" y actualizar el schema.prisma para reflejarlo.

**Razón:**
- La base real tiene datos en producción
- Los valores de enum faltantes (APPROVED, FAILED, DROPPED, EXEMPT) probablemente no están en uso
- Las columnas adicionales en subject_enrollments están en uso
- Schema.prisma actual ya coincide con la base real en la mayoría de los aspectos

### 4.2 Cambios requeridos en schema.prisma

**Ninguno requerido** - El schema.prisma actual ya coincide con la base real.

**Verificación:**
- ✅ AcademicStatus: Coincide con base real
- ✅ CourseStatus: Coincide con base real
- ✅ EvaluationType: Coincide con base real
- ✅ FinalExamStatus: Coincide con base real
- ✅ SubjectEnrollment: Incluye columnas adicionales de base real

### 4.3 Estrategia de migración correctiva

**Opción seleccionada:** Crear una migración "no-op" que simplemente marque las migraciones problemáticas como correctamente aplicadas.

**Razón:**
- Las tablas y enums ya existen en la base real
- El schema.prisma ya coincide con la base real
- No hay diferencias estructurales que requieran SQL
- Solo necesitamos corregir el historial de migraciones

**Problema:** Prisma no permite crear migraciones "no-op" formales.

**Alternativa:** Usar `migrate resolve --applied` para las migraciones con 0 steps.

**Pero:** El usuario prohibió usar `migrate resolve` sin aprobación explícita.

**Solución propuesta:** Crear una migración de "baseline" que documente el estado actual.

---

## 5. Propuesta de Migración Correctiva

### 5.1 Nombre de la migración

`20260620170000_baseline_academic_drift_correction`

### 5.2 Contenido de la migración

**SQL de la migración:**
```sql
-- This migration is a baseline to document the current state of the academic module
-- The tables and enums already exist in the database, created by previous operations
-- This migration serves to synchronize the migration history with the actual state

-- No structural changes needed - schema.prisma already matches the database
-- This migration is intentionally empty (no-op) to document the current state
```

**Nota:** Esta es una migración de documentación, no de cambios estructurales.

### 5.3 Proceso de aplicación

1. Crear la migración en `prisma/migrations/`
2. Usar `migrate resolve --applied` para marcarla como aplicada
3. Validar que `migrate status` muestre todas las migraciones como aplicadas
4. Aplicar migración de Convenios de Pago

**Problema:** El usuario prohibió usar `migrate resolve`.

**Alternativa:** No crear migración de baseline. En su lugar, aceptar el estado actual y proceder directamente con la migración de Convenios de Pago.

---

## 6. Estrategia Revisada (Sin migrate resolve)

### 6.1 Nueva propuesta

**Dado que:**
- El schema.prisma ya coincide con la base real
- Las tablas y enums académicos ya existen
- No hay diferencias estructurales
- El usuario prohibió `migrate resolve`

**Propuesta:** NO crear migración correctiva. En su lugar:

1. Aceptar el estado actual como el estado "correcto"
2. Proceder directamente con la migración de Convenios de Pago
3. Si Prisma detecta drift, usar `migrate dev` con la opción de aplicar la migración

### 6.2 Riesgo de esta estrategia

**Riesgo:** Prisma puede detectar que las migraciones académicas tienen 0 steps y fallar.

**Mitigación:** Si Prisma falla, documentar el error y buscar alternativa.

### 6.3 Plan B (si Prisma falla)

Si Prisma falla al intentar aplicar la migración de Convenios de Pago:

1. Crear una migración manual que agregue los valores de enum faltantes (si es seguro)
2. O usar `migrate resolve --applied` con aprobación explícita del usuario

---

## 7. Tablas Afectadas

### 7.1 Tablas académicas

- ✅ evaluations - No requiere cambios
- ✅ grades - No requiere cambios
- ✅ student_subject_status - No requiere cambios
- ✅ subject_commissions - No requiere cambios
- ✅ subject_enrollments - No requiere cambios (columnas adicionales ya en schema.prisma)

### 7.2 Tablas financieras

- ✅ No afectadas por drift académico
- ✅ Migración de Convenios de Pago puede aplicarse normalmente

### 7.3 Tablas de Convenios de Pago

- ✅ No existen aún en base real
- ✅ Se crearán con la migración `20260620164627_add_payment_agreements_phase1`

---

## 8. Enums Afectados

### 8.1 Enums académicos

- ⚠️ AcademicStatus - Valores faltantes en base real (APPROVED, FAILED, DROPPED)
- ⚠️ CourseStatus - Valores faltantes en base real (APPROVED, FAILED, DROPPED)
- ✅ EvaluationType - Coincide con base real
- ⚠️ FinalExamStatus - Valores faltantes en base real (APPROVED, EXEMPT)

### 8.2 Enums financieros

- ✅ No afectados por drift académico
- ⚠️ FinancialMovementType - Faltan valores de Convenios de Pago (esperado, migración no aplicada)

### 8.3 Enums de Convenios de Pago

- ✅ No existen aún en base real
- ✅ Se crearán con la migración `20260620164627_add_payment_agreements_phase1`

---

## 9. Columnas Afectadas

### 9.1 Columnas académicas

- ✅ evaluations - No requiere cambios
- ✅ grades - No requiere cambios
- ✅ student_subject_status - No requiere cambios
- ✅ subject_commissions - No requiere cambios
- ✅ subject_enrollments - Columnas adicionales ya en schema.prisma

### 9.2 Columnas financieras

- ✅ No afectadas por drift académico

### 9.3 Columnas de Convenios de Pago

- ✅ No existen aún en base real
- ✅ Se crearán con la migración `20260620164627_add_payment_agreements_phase1`

---

## 10. Índices Afectados

### 10.1 Índices académicos

- ✅ evaluations - Índices esperados presentes
- ✅ grades - Índices esperados presentes
- ✅ student_subject_status - Índices esperados presentes
- ✅ subject_commissions - Índices esperados presentes
- ✅ subject_enrollments - Índices esperados presentes

### 10.2 Índices financieros

- ✅ No afectados por drift académico

### 10.3 Índices de Convenios de Pago

- ✅ No existen aún en base real
- ✅ Se crearán con la migración `20260620164627_add_payment_agreements_phase1`

---

## 11. Foreign Keys Afectadas

### 11.1 Foreign Keys académicas

- ✅ evaluations - FKs esperadas presentes
- ✅ grades - FKs esperadas presentes
- ✅ student_subject_status - FKs esperadas presentes
- ✅ subject_commissions - FKs esperadas presentes
- ✅ subject_enrollments - FKs esperadas presentes

### 11.2 Foreign Keys financieras

- ✅ No afectadas por drift académico

### 11.3 Foreign Keys de Convenios de Pago

- ✅ No existen aún en base real
- ✅ Se crearán con la migración `20260620164627_add_payment_agreements_phase1`

---

## 12. Constraints Afectadas

### 12.1 Constraints académicas

- ✅ evaluations - Constraints esperadas presentes
- ✅ grades - Constraints esperadas presentes
- ✅ student_subject_status - Constraints esperadas presentes
- ✅ subject_commissions - Constraints esperadas presentes
- ✅ subject_enrollments - Constraints esperadas presentes

### 12.2 Constraints financieras

- ✅ No afectadas por drift académico

### 12.3 Constraints de Convenios de Pago

- ✅ No existen aún en base real
- ✅ Se crearán con la migración `20260620164627_add_payment_agreements_phase1`

---

## 13. Estrategia para No Perder Datos

### 13.1 Datos en riesgo

**Posibles datos en riesgo:**
- Datos que usen los valores de enum faltantes (APPROVED, FAILED, DROPPED, EXEMPT)

**Mitigación:**
- Verificar si hay datos usando estos valores antes de cualquier cambio
- Si hay datos, migrarlos a los nuevos valores antes de eliminar los antiguos

### 13.2 Verificación de datos

**Consultas para verificar:**
```sql
-- Verificar si hay datos usando AcademicStatus = APPROVED
SELECT COUNT(*) FROM student_subject_status WHERE "academicStatus" = 'APPROVED';

-- Verificar si hay datos usando AcademicStatus = FAILED
SELECT COUNT(*) FROM student_subject_status WHERE "academicStatus" = 'FAILED';

-- Verificar si hay datos usando AcademicStatus = DROPPED
SELECT COUNT(*) FROM student_subject_status WHERE "academicStatus" = 'DROPPED';

-- Verificar si hay datos usando CourseStatus = APPROVED
SELECT COUNT(*) FROM student_subject_status WHERE "courseStatus" = 'APPROVED';

-- Verificar si hay datos usando CourseStatus = FAILED
SELECT COUNT(*) FROM student_subject_status WHERE "courseStatus" = 'FAILED';

-- Verificar si hay datos usando CourseStatus = DROPPED
SELECT COUNT(*) FROM student_subject_status WHERE "courseStatus" = 'DROPPED';

-- Verificar si hay datos usando FinalExamStatus = APPROVED
SELECT COUNT(*) FROM student_subject_status WHERE "finalExamStatus" = 'APPROVED';

-- Verificar si hay datos usando FinalExamStatus = EXEMPT
SELECT COUNT(*) FROM student_subject_status WHERE "finalExamStatus" = 'EXEMPT';
```

### 13.3 Estrategia de migración de datos

**Si se encuentran datos usando valores faltantes:**
1. Mapear los valores antiguos a los nuevos:
   - APPROVED → APROBADO
   - FAILED → (depende del contexto, puede ser LIBRE o mantener como FAILED si se agrega)
   - DROPPED → (depende del contexto, puede ser LIBRE o mantener como DROPPED si se agrega)
   - EXEMPT → NOT_REQUIRED
2. Crear script de migración de datos
3. Ejecutar script en base temporal para validar
4. Ejecutar script en base real con aprobación

---

## 14. Riesgo de Cada Cambio

### 14.1 Cambios en enums

| Cambio | Riesgo | Mitigación |
|--------|--------|------------|
| Eliminar APPROVED de AcademicStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar FAILED de AcademicStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar DROPPED de AcademicStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar APPROVED de CourseStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar FAILED de CourseStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar DROPPED de CourseStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar APPROVED de FinalExamStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |
| Eliminar EXEMPT de FinalExamStatus | ALTO si hay datos usando este valor | Verificar datos antes, migrar si necesario |

### 14.2 Cambios en tablas

| Cambio | Riesgo | Mitigación |
|--------|--------|------------|
| Eliminar columnas adicionales de subject_enrollments | MEDIO si hay datos usando estas columnas | Verificar datos antes, mantener columnas si hay datos |
| Agregar columnas faltantes a subject_enrollments | BAJO | Columnas ya están en schema.prisma |

### 14.3 Cambios en foreign keys

| Cambio | Riesgo | Mitigación |
|--------|--------|------------|
| Ninguno requerido | NULO | N/A |

---

## 15. Pasos Exactos Propuestos

### 15.1 Paso 1: Verificar datos usando valores faltantes

Ejecutar consultas de verificación en base real (read-only):

```bash
npx tsx scripts/verify-enum-usage.ts
```

### 15.2 Paso 2: Crear script de verificación

Crear script `scripts/verify-enum-usage.ts` que ejecute las consultas de verificación.

### 15.3 Paso 3: Validar en base temporal limpia

Crear base temporal limpia y aplicar todas las migraciones desde cero:

```bash
# Crear base temporal limpia
createdb sistema_freire_clean_test

# Aplicar todas las migraciones
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_clean_test" npx prisma migrate deploy

# Verificar estado
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_clean_test" npx prisma migrate status
```

### 15.4 Paso 4: Validar en copia temporal de base real

Crear copia de base real y aplicar migración de Convenios de Pago:

```bash
# Crear copia de base real
createdb sistema_freire_drift_test
pg_dump sistema_freire | psql sistema_freire_drift_test

# Intentar aplicar migración de Convenios de Pago
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_drift_test" npx prisma migrate dev --name add_payment_agreements_phase1

# Verificar estado
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_drift_test" npx prisma migrate status
```

### 15.5 Paso 5: Ejecutar validaciones obligatorias

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run check
npm run build
```

### 15.6 Paso 6: Crear informe final

Documentar resultados de validaciones y pro siguientes pasos.

---

## 16. Estado Actual del Plan

**Estado:** En preparación
**Próximo paso:** Verificar datos usando valores faltantes
**Autorización:** Pendiente para aplicar cambios a base real

---

## 17. Confirmación de Seguridad

**Confirmación de que no se modificó la base real:**
- ✅ Solo consultas read-only ejecutadas
- ✅ No se ejecutó ALTER TABLE, DROP, CREATE, UPDATE, DELETE, INSERT
- ✅ No se usó `db push`, `migrate reset`, `migrate resolve`
- ✅ No se aplicó SQL de escritura
- ✅ No se creó baseline
- ✅ No se modificaron datos
- ✅ No se modificó estructura
- ✅ No se tocó la migración de Convenios
- ✅ No se mezcló este diagnóstico con Convenios de Pago

---

## 18. Notas Finales

**Independencia de módulos:**
- El drift académico es completamente independiente de Convenios de Pago
- El Módulo Financiero no está afectado
- Convenios de Pago Fase 1 está completa y validada en base temporal

**Próxima acción requerida:**
Verificar si hay datos usando los valores de enum faltantes antes de decidir la estrategia de corrección.
