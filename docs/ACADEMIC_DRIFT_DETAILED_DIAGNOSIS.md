# Diagnóstico Detallado del Drift Académico

## Fecha de Diagnóstico

20 de Junio de 2026

## Contexto

Diagnóstico read-only de la base de datos real `sistema_freire` para identificar el drift académico que impide aplicar nuevas migraciones (incluyendo Convenios de Pago Fase 1).

**Método:** Consultas SQL read-only usando Prisma Client
**Base de datos:** `sistema_freire` (localhost:5437)
**Confirmación de seguridad:** Solo se ejecutaron consultas SELECT, sin modificaciones a la base real

---

## 1. Resumen Ejecutivo

**Drift identificado:** La base real tiene las tablas y enums académicos creados por las migraciones recientes, pero el historial de migraciones muestra inconsistencias en el conteo de steps.

**Módulos afectados:**

- ✅ Módulo Académico (evaluations, grades, subject_commissions, subject_enrollments)
- ❌ Módulo Financiero (NO afectado - migraciones financieras aplicadas correctamente)
- ❌ Convenios de Pago (NO afectado - migración no aplicada, pendiente por drift académico)

**Impacto en Convenios de Pago:**

- Indirecto: El drift académico impide aplicar la migración `20260620164627_add_payment_agreements_phase1`
- Convenios de Pago Fase 1 está completamente validada en base temporal y lista para aplicar una vez resuelto el drift académico

**Impacto en Módulo Financiero:**

- Ninguno: La última migración financiera `20260614_add_financial_receipts_blocks_and_movements` se aplicó correctamente con 1 step

---

## 2. Estado de Migraciones

### Migraciones Aplicadas Recientemente (Base Real)

```
20260614_add_financial_receipts_blocks_and_movements: 14 Jun 2026 (1 step) ✅
20260609170000_create_subject_commissions_and_sync_schema: 13 Jun 2026 (0 steps) ⚠️
20260609163939_refactor_exam_and_grade_module: 09 Jun 2026 (0 steps) ⚠️
20260606023826_add_payslip_upload_tracking: 09 Jun 2026 (0 steps) ⚠️
20260606003341_add_liquidador_role: 09 Jun 2026 (0 steps) ⚠️
20260605044346_add_teacher_status_and_observations: 09 Jun 2026 (0 steps) ⚠️
20260605042346_add_academic_year_history: 09 Jun 2026 (0 steps) ⚠️
20260605011108_add_annual_grade_thresholds: 09 Jun 2026 (0 steps) ⚠️
20260605011107_add_locations_and_academic_terms: 09 Jun 2026 (0 steps) ⚠️
20260605011106_add_user_phone: 09 Jun 2026 (0 steps) ⚠️
```

### Anomalía Detectada

**Problema:** Las migraciones académicas recientes (`20260609170000`, `20260609163939`) y varias otras migraciones de junio 2026 están marcadas como aplicadas pero con **0 steps**.

**Implicación:** Esto sugiere que se usó `prisma migrate resolve --applied` o similar para marcar estas migraciones como aplicadas sin ejecutar realmente los SQL de migración.

**Migraciones Pendientes:**

- `20260620164627_add_payment_agreements_phase1` (Convenios de Pago Fase 1) - NO aplicada

**Migraciones Fallidas:** Ninguna detectada en el historial

---

## 3. Enums con Drift

### Enums Académicos - Comparación

#### AcademicStatus

**Schema.prisma esperado:** [EN_COURSE, APPROVED, FAILED, DROPPED, REGULAR, LIBRE, APROBADO, PROMOCIONADO]
**Base real:** [EN_COURSE, REGULAR, LIBRE, APROBADO, PROMOCIONADO]
**Diferencia:** La base real tiene los valores agregados por la migración `20260609170000`, pero NO tiene los valores originales (APPROVED, FAILED, DROPPED)
**Riesgo:** ALTO - Si se intenta agregar los valores faltantes, puede causar conflicto con datos existentes

#### CourseStatus

**Schema.prisma esperado:** [IN_PROGRESS, APPROVED, FAILED, DROPPED, PASSED_COURSE, FAILED_COURSE, PROMOTED]
**Base real:** [IN_PROGRESS, PASSED_COURSE, FAILED_COURSE, PROMOTED]
**Diferencia:** La base real tiene los valores agregados por la migración `20260609170000`, pero NO tiene los valores originales (APPROVED, FAILED, DROPPED)
**Riesgo:** ALTO - Misma situación que AcademicStatus

#### EvaluationType

**Schema.prisma esperado:** [PARCIAL, TRABAJO_PRACTICO, INTEGRADOR, RECUPERATORIO, MESA_EXAMEN, EXAMEN_FINAL, OTRO]
**Base real:** [PARCIAL, RECUPERATORIO, TRABAJO_PRACTICO, INTEGRADOR, EXAMEN_FINAL, MESA_EXAMEN, OTRO]
**Diferencia:** Ninguna - Los valores coinciden (orden diferente pero mismo contenido)
**Riesgo:** BAJO - Solo diferencia en orden, funcionalmente equivalente

#### FinalExamStatus

**Schema.prisma esperado:** [PENDING, APPROVED, FAILED, EXEMPT, NOT_REQUIRED, PASSED]
**Base real:** [PENDING, NOT_REQUIRED, PASSED, FAILED]
**Diferencia:** La base real tiene los valores agregados por la migración `20260609170000`, pero NO tiene los valores originales (APPROVED, EXEMPT)
**Riesgo:** ALTO - Valores faltantes pueden causar problemas si se intentan agregar

### Enums Financieros - Comparación

#### FinancialMovementType

**Schema.prisma esperado:** [CHARGE, PAYMENT, ALLOCATION, RECEIPT, CANCELLATION, ADJUSTMENT, LATE_FEE, DISCOUNT, SCHOLARSHIP, PAYMENT_AGREEMENT, AGREEMENT_INSTALLMENT]
**Base real:** [CHARGE, PAYMENT, ALLOCATION, RECEIPT, CANCELLATION, ADJUSTMENT, LATE_FEE, DISCOUNT, SCHOLARSHIP]
**Diferencia:** La base real NO tiene los valores de Convenios de Pago (PAYMENT_AGREEMENT, AGREEMENT_INSTALLMENT)
**Riesgo:** NULO - Esperado, ya que la migración de Convenios de Pago no se aplicó

---

## 4. Tablas con Drift

### Tablas Académicas Clave - Comparación

#### evaluations

**Columnas esperadas (migración 20260609163939):**

- id, subjectId, title, description, maxScore, createdAt, updatedAt
- closedAt, closedByUserId, closedReason
- commissionId, createdByUserId, evaluationDate, isClosed, minPassingScore, observations
- parentEvaluationId, reopenReason, reopenedAt, reopenedByUserId, weight, type

**Columnas reales (base real):**

- Todas las columnas esperadas están presentes
- Columna `type` tiene tipo `USER-DEFINED` (corresponde a enum EvaluationType)

**Diferencia:** Ninguna detectada - La tabla tiene la estructura esperada

#### grades

**Columnas esperadas (migración 20260609163939):**

- id, studentId, value, evaluationId, status, observations, createdAt, updatedAt
- createdByUserId, updatedByUserId

**Columnas reales (base real):**

- Todas las columnas esperadas están presentes
- Columna `status` tiene tipo `USER-DEFINED` (corresponde a enum GradeStatus)
- Columna `value` es nullable (esperado según migración)

**Diferencia:** Ninguna detectada - La tabla tiene la estructura esperada

#### student_subject_status

**Columnas esperadas (migración 20260609163939 + 20260609170000):**

- id, studentId, subjectId, attendancePercent, regularityStatus, approved, promoted
- finalGrade, promotionDate, updatedAt
- academicStatus, courseAverage, courseStatus, finalExamScore, finalExamStatus, finalApprovalDate

**Columnas reales (base real):**

- Todas las columnas esperadas están presentes
- Columnas de enum tienen tipo `USER-DEFINED` (corresponden a enums respectivos)

**Diferencia:** Ninguna detectada - La tabla tiene la estructura esperada

#### subject_commissions

**Columnas esperadas (migración 20260609170000):**

- id, code, subjectId, academicTermId, careerId, studyPlanId, teacherId, locationId
- maxCapacity, currentEnrolled, schedule, scheduleJson, active, observations, createdAt, updatedAt

**Columnas reales (base real):**

- Todas las columnas esperadas están presentes

**Diferencia:** Ninguna detectada - La tabla tiene la estructura esperada

#### subject_enrollments

**Columnas esperadas (migración 20260609170000):**

- id, studentId, subjectId, commissionId, careerId, studyPlanId, academicTermId
- status, enrolledAt, createdAt, updatedAt

**Columnas reales (base real):**

- Todas las columnas esperadas están presentes
- **Columnas adicionales NO esperadas:**
  - confirmedAt, cancelledAt, rejectedAt
  - rejectionReason, cancellationReason, observations
  - enrolledBy, confirmedBy, cancelledBy, rejectedBy

**Diferencia:** La tabla tiene columnas adicionales que NO están en la migración `20260609170000`
**Riesgo:** MEDIO - Las columnas adicionales no causan problemas con la migración actual, pero sugieren cambios manuales posteriores

### Foreign Keys y Constraints

**Tablas académicas tienen las foreign keys esperadas:**

- evaluations: closedByUserId, commissionId, createdByUserId, parentEvaluationId, subjectId, reopenedByUserId
- grades: createdByUserId, evaluationId, studentId, updatedByUserId
- student_subject_status: studentId, subjectId
- subject_commissions: academicTermId, careerId, locationId, studyPlanId, subjectId, teacherId
- subject_enrollments: academicTermId, careerId, commissionId, studentId, studyPlanId, subjectId

**Diferencia:** Ninguna detectada - Las foreign keys coinciden con lo esperado

---

## 5. Diagnóstico de Causa Probable

**Evidencia recopilada:**

1. **Migraciones con 0 steps:** Varias migraciones de junio 2026 están marcadas como aplicadas con 0 steps
2. **Tablas y enums presentes:** Las tablas y enums académicos están creados en la base real
3. **Columnas adicionales:** La tabla `subject_enrollments` tiene columnas adicionales no documentadas en migraciones
4. **Valores de enum faltantes:** Los enums académicos tienen valores agregados pero les faltan valores originales

**Hipótesis más probable:**

**Escenario:** Se aplicó un `db push` o intervención manual SQL en algún momento después de las migraciones académicas, y luego se usó `migrate resolve --applied` para sincronizar el historial de migraciones.

**Secuencia probable de eventos:**

1. Las migraciones académicas `20260609163939` y `20260609170000` se crearon originalmente
2. En lugar de aplicarlas con `migrate dev`, se usó `db push` o SQL manual para crear las tablas/enums
3. Posteriormente, se agregaron columnas adicionales a `subject_enrollments` (probablemente SQL manual)
4. Para sincronizar el historial, se usó `migrate resolve --applied` para marcar las migraciones como aplicadas
5. Esto explica por qué las migraciones tienen 0 steps pero las tablas existen

**Evidencia insuficiente:**

- No hay logs de comandos ejecutados
- No hay timestamps claros de cuándo se hicieron los cambios manuales
- No hay evidencia directa de `db push` vs SQL manual

---

## 6. Opciones de Solución

### Opción A: Migración Correctiva Formal (RECOMENDADA)

**Descripción:** Crear una migración de corrección que sincronice el schema.prisma con la base real, luego aplicar nuevas migraciones normalmente.

**Pasos:**

1. Modificar `schema.prisma` para coincidir con la base real:
   - Actualizar enums académicos para incluir solo los valores presentes en la base real
   - Agregar columnas adicionales de `subject_enrollments` al schema
2. Crear migración de corrección: `npx prisma migrate dev --name correct_academic_drift`
3. Validar en base temporal
4. Aplicar a base real
5. Aplicar migración de Convenios de Pago: `npx prisma migrate dev --name add_payment_agreements_phase1`

**Pros:**

- Mantiene el historial de migraciones limpio
- Usa el flujo normal de Prisma
- No pierde datos
- Permite aplicar futuras migraciones normalmente

**Contras:**

- Requiere modificar el schema.prisma para coincidir con la base real (puede parecer "retroceder")
- La migración de corrección puede ser compleja si hay muchas diferencias
- Los valores de enum faltantes (APPROVED, FAILED, DROPPED, EXEMPT) se pierden del schema

**Riesgos:**

- BAJO - Si se valida correctamente en base temporal

### Opción B: Restaurar Schema para Coincidir con Base Real y Luego Migrar

**Descripción:** Usar `db pull` para sobrescribir el schema.prisma con el estado actual de la base real, luego crear nuevas migraciones desde ese punto.

**Pasos:**

1. Hacer backup del schema.prisma actual
2. Ejecutar `npx prisma db pull` para sobrescribir schema.prisma
3. Revisar manualmente el schema y ajustar según sea necesario
4. Crear migración de Convenios de Pago desde el nuevo estado
5. Aplicar migración

**Pros:**

- El schema.prisma coincide exactamente con la base real
- No requiere crear migración de corrección compleja
- Flujo más simple

**Contras:**

- **NO APROBADO** - El usuario prohibió usar `db push`, y `db pull` es similar en riesgo
- Puede sobrescribir cambios intencionales en el schema
- No mantiene el historial de migraciones limpio
- Los comentarios y documentación en schema.prisma se pierden

**Riesgos:**

- ALTO - No aprobado por el usuario, similar a `db push`

### Opción C: Intervención Manual Controlada (ÚLTIMO RECURSO)

**Descripción:** Crear scripts SQL manuales para corregir las diferencias específicas, aplicarlos, y luego usar `migrate resolve`.

**Pasos:**

1. Crear script SQL para agregar valores de enum faltantes (si es seguro)
2. Crear script SQL para eliminar columnas adicionales (si es seguro)
3. Ejecutar scripts en base real
4. Usar `migrate resolve --applied` para sincronizar
5. Aplicar migración de Convenios de Pago

**Pros:**

- Control total sobre cada cambio
- Puede abordar problemas específicos uno por uno

**Contras:**

- **NO APROBADO** - El usuario prohibió SQL manual improvisado
- Propenso a errores
- Difícil de mantener
- No sigue el flujo de Prisma
- Puede causar problemas futuros

**Riesgos:**

- MUY ALTO - No aprobado por el usuario, propenso a errores

---

## 7. Recomendación

**Estrategia más segura:** Opción A - Migración Correctiva Formal

**Pasos exactos:**

1. **Backup del estado actual:**

   ```bash
   cp prisma/schema.prisma prisma/schema.prisma.backup
   git add prisma/schema.prisma.backup
   git commit -m "backup: schema.prisma before drift correction"
   ```

2. **Modificar schema.prisma para coincidir con base real:**
   - Actualizar `AcademicStatus` enum: mantener solo [EN_COURSE, REGULAR, LIBRE, APROBADO, PROMOCIONADO]
   - Actualizar `CourseStatus` enum: mantener solo [IN_PROGRESS, PASSED_COURSE, FAILED_COURSE, PROMOTED]
   - Actualizar `FinalExamStatus` enum: mantener solo [PENDING, NOT_REQUIRED, PASSED, FAILED]
   - Agregar columnas adicionales a `SubjectEnrollment` model:
     - confirmedAt, cancelledAt, rejectedAt
     - rejectionReason, cancellationReason, observations
     - enrolledBy, confirmedBy, cancelledBy, rejectedBy

3. **Validar schema:**

   ```bash
   npx prisma validate
   npx prisma format
   ```

4. **Crear migración de corrección en base temporal:**

   ```bash
   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx prisma migrate dev --name correct_academic_drift
   ```

5. **Validar en base temporal:**
   - Verificar que la migración no cause errores
   - Verificar que el schema resultante coincide con Prisma
   - Ejecutar `npx prisma migrate status` en base temporal

6. **Aplicar migración de corrección a base real:**

   ```bash
   npx prisma migrate dev --name correct_academic_drift
   ```

7. **Validar en base real:**

   ```bash
   npx prisma migrate status
   npx prisma validate
   ```

8. **Aplicar migración de Convenios de Pago:**
   ```bash
   npx prisma migrate dev --name add_payment_agreements_phase1
   ```

**Comandos NO ejecutar:**

- ❌ `npx prisma db push`
- ❌ `npx prisma migrate reset`
- ❌ `npx prisma migrate resolve` (sin aprobación explícita)
- ❌ SQL manual directo a base real
- ❌ `npx prisma db pull`

**Qué validar en base temporal antes de tocar la real:**

- Que la migración de corrección se aplique sin errores
- Que el schema resultante coincida con Prisma
- Que no se pierdan datos existentes
- Que la aplicación funcione correctamente con el schema corregido

---

## 8. Confirmación de Seguridad

**Confirmación de que no se modificó la base real:**

- ✅ Solo se ejecutaron consultas SELECT (read-only)
- ✅ No se ejecutó ALTER TABLE, DROP, CREATE, UPDATE, DELETE, INSERT
- ✅ No se usó `db push`, `migrate reset`, `migrate resolve`
- ✅ No se aplicó SQL de escritura
- ✅ No se creó baseline
- ✅ No se modificaron datos
- ✅ No se modificó estructura
- ✅ No se tocó la migración de Convenios
- ✅ No se mezcló este diagnóstico con Convenios de Pago

**Script utilizado:** `scripts/diagnose-academic-drift.ts`
**Tipo de consultas:** Solo `prisma.$queryRawUnsafe` con SELECT
**Resultado:** Diagnóstico completado exitosamente sin modificaciones

---

## 9. Estado Actual

**Diagnóstico:** ✅ Completado
**Estrategia recomendada:** Opción A - Migración Correctiva Formal
**Próximo paso:** Esperar aprobación del usuario para proceder con la corrección
**Convenios de Pago Fase 1:** ✅ Validada en base temporal, lista para aplicar después de corrección
**Base real:** ✅ No modificada durante diagnóstico

---

## 10. Notas Finales

**Independencia de módulos:**

- El drift académico es completamente independiente de Convenios de Pago
- El Módulo Financiero no está afectado
- Convenios de Pago Fase 1 está completa y validada en base temporal

**Riesgo de no resolver el drift:**

- No se pueden aplicar nuevas migraciones a la base real
- Convenios de Pago Fase 2 no puede comenzar
- Futuros cambios al schema académico serán problemáticos

**Urgencia:**

- MEDIA - No bloquea la operación actual del sistema, pero bloquea desarrollo futuro
