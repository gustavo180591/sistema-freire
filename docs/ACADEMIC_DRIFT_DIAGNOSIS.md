# Diagnóstico del Drift Académico

## Fecha de Diagnóstico

20 de Junio de 2026

## Contexto

Durante la implementación de la Fase 1 de Convenios de Pago, se detectó que la base de datos real `sistema-freire` tiene un drift (diferencia) con el historial de migraciones de Prisma. Este drift se encuentra en tablas académicas, no relacionadas con Convenios de Pago.

## Estado Actual

**Migraciones encontradas:** 28 migraciones en `prisma/migrations`
**Migración pendiente:** `20260620164627_add_payment_agreements_phase1` (Convenios de Pago - Fase 1)
**Estado de la base real:** Tiene drift académico que impide aplicar nuevas migraciones

## Migraciones Académicas Recientes

### 1. `20260609163939_refactor_exam_and_grade_module`

**Fecha:** 9 de Junio de 2026

**Cambios realizados:**

- Creación de nuevos enums:
  - `EvaluationType`: PARCIAL, TRABAJO_PRACTICO, INTEGRADOR, RECUPERATORIO, MESA_EXAMEN
  - `GradeStatus`: PRESENT, ABSENT, EXCUSED
  - `CourseStatus`: IN_PROGRESS, APPROVED, FAILED, DROPPED
  - `FinalExamStatus`: PENDING, APPROVED, FAILED, EXEMPT
  - `AcademicStatus`: EN_COURSE, APPROVED, FAILED, DROPPED

- Transformación de tabla `evaluations`:
  - Agregado de columnas: commissionId, evaluationDate, minPassingScore, weight, parentEvaluationId, createdByUserId, isClosed, closedAt, closedByUserId, closedReason, reopenedAt, reopenedByUserId, reopenReason
  - Migración de datos de columnas antiguas a nuevas
  - Eliminación de columnas antiguas: date, createdBy
  - Agregado de índices y foreign keys

- Transformación de tabla `grades`:
  - Agregado de columnas: evaluationId, status, observations, createdAt, updatedAt
  - Migración de datos de columnas antiguas a nuevas
  - Eliminación de columnas antiguas: gradeType, gradedAt
  - Agregado de índices y foreign keys

- Modificación de tabla `student_subject_status`:
  - Agregado de columnas: courseAverage, courseStatus, finalExamScore, finalExamStatus, academicStatus
  - Agregado de índices

### 2. `20260609170000_create_subject_commissions_and_sync_schema`

**Fecha:** 9 de Junio de 2026

**Cambios realizados:**

- Creación de tabla `subject_commissions`:
  - Campos: id, code, subjectId, academicTermId, careerId, studyPlanId, teacherId, locationId, maxCapacity, currentEnrolled, schedule, scheduleJson, active, observations, createdAt, updatedAt
  - Índices y foreign keys

- Creación de tabla `subject_enrollments`:
  - Campos: id, studentId, subjectId, commissionId, careerId, studyPlanId, academicTermId, status, enrolledAt, createdAt, updatedAt
  - Índices y foreign keys

- Modificación de enums:
  - `AcademicStatus`: Agregados REGULAR, LIBRE, APROBADO, PROMOCIONADO
  - `CourseStatus`: Agregados PASSED_COURSE, FAILED_COURSE, PROMOTED
  - `EvaluationType`: Agregados EXAMEN_FINAL, OTRO
  - `FinalExamStatus`: Agregados NOT_REQUIRED, PASSED

- Modificación de tablas existentes:
  - `attendance_records`: Agregado commissionId, modificación de índices
  - `evaluations`: Agregado observations, agregado foreign key a commissionId
  - `grades`: Agregado updatedByUserId, foreign key
  - `student_subject_status`: Agregado finalApprovalDate
  - Modificación de tipos y constraints en evaluations, grades, student_subject_status

## Análisis del Drift

**Posibles causas del drift:**

1. **Migraciones no aplicadas:** Las migraciones académicas recientes (`20260609163939`, `20260609170000`) pueden no haberse aplicado correctamente a la base real.

2. **Cambios manuales en la base real:** Puede haber habido cambios SQL manuales en la base real que no están reflejados en las migraciones de Prisma.

3. **Diferencia en definición de enums:** Los enums en la base real pueden tener valores diferentes a los definidos en las migraciones.

4. **Tablas o columnas faltantes:** La base real puede no tener las tablas `subject_commissions` y `subject_enrollments` creadas por la migración `20260609170000`.

## Estrategia de Resolución

**Opción 1: Migrate Resolve (NO RECOMENDADA)**

- Usar `prisma migrate resolve --applied` para marcar las migraciones como aplicadas
- **Riesgo:** Puede ocultar diferencias reales entre el schema y la base real
- **No aprobado por el usuario**

**Opción 2: Migrate Reset (NO RECOMENDADA)**

- Usar `prisma migrate reset --force` para recrear la base desde cero
- **Riesgo:** Perder todos los datos de la base real
- **No aprobado por el usuario**

**Opción 3: SQL Manual (NO RECOMENDADA)**

- Crear scripts SQL manuales para sincronizar la base real
- **Riesgo:** Propenso a errores, difícil de mantener
- **No aprobado por el usuario**

**Opción 4: Db Push (NO RECOMENDADA)**

- Usar `prisma db push` para sincronizar el schema directamente
- **Riesgo:** No crea migraciones, no es idempotente, puede causar problemas futuros
- **No aprobado por el usuario**

**Opción 5: Diagnóstico Detallado + Migración Corrección (RECOMENDADA)**

1. **Diagnóstico detallado:**
   - Conectar a la base real y listar todas las tablas
   - Listar todos los enums y sus valores
   - Comparar con el schema esperado de Prisma
   - Identificar exactamente qué difiere

2. **Crear migración de corrección:**
   - Basarse en el diagnóstico detallado
   - Crear una migración que sincronice la base real con el schema esperado
   - Usar `ALTER TYPE ... ADD VALUE IF NOT EXISTS` para enums
   - Usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para columnas
   - Usar `CREATE TABLE IF NOT EXISTS` para tablas

3. **Validar en base temporal:**
   - Aplicar la migración de corrección en base temporal
   - Verificar que no cause errores
   - Validar que el schema resultante coincide con Prisma

4. **Aplicar a base real:**
   - Aplicar la migración de corrección a la base real
   - Verificar que `prisma migrate status` muestre todas las migraciones como aplicadas
   - Validar que la aplicación funciona correctamente

## Próximos Pasos

1. **Diagnóstico detallado de la base real:**
   - Listar todas las tablas en la base real
   - Listar todos los enums y sus valores
   - Comparar con el schema de Prisma
   - Documentar las diferencias exactas

2. **Crear migración de corrección:**
   - Basarse en el diagnóstico
   - Crear migración que sincronice la base real
   - Validar en base temporal

3. **Aplicar migración de corrección:**
   - Aplicar a base real
   - Validar que el drift se resuelve
   - Permitir aplicar migraciones futuras (incluyendo Convenios de Pago)

## Restricciones

- NO usar `migrate resolve` sin aprobación explícita
- NO usar `migrate reset` en base real
- NO usar `db push`
- NO usar SQL manual improvisado
- NO mezclar este trabajo con Convenios de Pago

## Estado

**Diagnóstico:** En progreso
**Estrategia:** Pendiente de aprobación
**Resolución:** Pendiente

## Notas

Este drift académico es completamente independiente de Convenios de Pago. La Fase 1 de Convenios de Pago está completa y validada en base temporal, pero no puede aplicarse a la base real hasta que se resuelva este drift académico.
