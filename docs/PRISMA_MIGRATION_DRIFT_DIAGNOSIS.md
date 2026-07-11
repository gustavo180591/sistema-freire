# Diagnóstico de Drift en Migraciones Prisma

**Fecha:** 2026-06-27  
**Fase:** 0.1 - Diagnóstico y reconciliación de historial Prisma  
**Migración afectada:** `20260620164627_add_payment_agreements_phase1`

---

## 1. Migración afectada

**Archivo:** `prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql`  
**SHA256 actual:** `e1b6d03b3f35b227be3de0333a22078963a3c6653d363641257ef8069eb26c89`

---

## 2. Historial de commits

### Commit que introdujo la migración original

```
commit 5b5ba199cbf19bcdb6eba58f97ce6025e93f65c2
Author: gustavo180591 <gustavo.faccendini@gmail.com>
Date:   Sat Jun 20 15:36:32 2026 -0300

    feat(payment-agreements): add phase 1 schema and base service

 .../migration.sql                                  | 380 +++++++++++++++++++++
 1 file changed, 380 insertions(+)
```

**Líneas:** 380 líneas (versión original)

### Commit que recuperó la migración

```
commit b78ce3017b8a0719326ebc8de7793c8f5d272c56
Author: gustavo180591 <gustavo.faccendini@gmail.com>
Date:   Sun Jun 21 21:19:30 2026 -0300

    fix(payment-agreements): recover clean migration and apply phase 1

 .../migration.sql                                  | 130 +--------------------
 1 file changed, 6 insertions(+), 124 deletions(-)
```

**Líneas:** 262 líneas (versión recuperada)  
**Cambios:** -124 líneas (eliminación de contaminación académica)

---

## 3. Diferencias entre migración original y recuperada

| Versión               | Líneas | SHA256      |
| --------------------- | ------ | ----------- |
| Original (5b5ba199)   | 380    | -           |
| Recuperada (b78ce301) | 262    | -           |
| Actual en disco       | 262    | e1b6d03b... |

**Confirmación:** El archivo actual coincide con la versión recuperada (diff vacío).

```bash
diff -u /tmp/payment_agreements_phase1_recovered.sql prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql
# Salida: vacía (sin diferencias)
```

---

## 4. Estado actual del schema académico

### Enums en schema.prisma actual

#### AcademicStatus

```prisma
enum AcademicStatus {
  EN_COURSE
  REGULAR
  LIBRE
  APROBADO
  PROMOCIONADO
}
```

**Valores faltantes según drift:** APPROVED, FAILED, DROPPED

#### CourseStatus

```prisma
enum CourseStatus {
  IN_PROGRESS
  PASSED_COURSE
  FAILED_COURSE
  PROMOTED
}
```

**Valores faltantes según drift:** APPROVED, FAILED, DROPPED

#### FinalExamStatus

```prisma
enum FinalExamStatus {
  PENDING
  NOT_REQUIRED
  PASSED
  FAILED
}
```

**Valores faltantes según drift:** APPROVED, EXEMPT

### Modelos académicos en schema.prisma actual

#### SubjectEnrollment

```prisma
model SubjectEnrollment {
  id                 String             @id @default(cuid())
  studentId          String
  subjectId          String
  commissionId       String?
  careerId           String
  studyPlanId        String?
  academicTermId     String?
  status             EnrollmentStatus   @default(PENDING)
  enrolledAt         DateTime           @default(now())
  confirmedAt        DateTime?
  cancelledAt        DateTime?
  rejectedAt         DateTime?
  rejectionReason    String?
  cancellationReason String?
  observations       String?
  enrolledBy         String?
  confirmedBy        String?
  cancelledBy        String?
  rejectedBy         String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  // ... relaciones
  @@unique([studentId, subjectId, academicTermId])
  @@index([studentId, status])
  @@index([subjectId, status])
  @@index([commissionId])
  @@index([academicTermId, status])
  @@map("subject_enrollments")
}
```

**Campos workflow de inscripción presentes:** confirmedAt, cancelledAt, rejectedAt, rejectionReason, cancellationReason, observations, enrolledBy, confirmedBy, cancelledBy, rejectedBy

#### Evaluation

```prisma
model Evaluation {
  id                  String             @id @default(cuid())
  subjectId           String
  title               String
  description         String?
  maxScore            Decimal            @default(10) @db.Decimal(6, 2)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  closedAt            DateTime?
  closedByUserId      String?
  closedReason        String?
  commissionId        String?
  createdByUserId     String
  evaluationDate      DateTime
  isClosed            Boolean            @default(false)
  minPassingScore     Decimal            @default(6) @db.Decimal(6, 2)
  observations        String?
  parentEvaluationId  String?
  reopenReason        String?
  reopenedAt          DateTime?
  reopenedByUserId    String?
  weight              Decimal            @default(1) @db.Decimal(6, 2)
  type                EvaluationType
  // ... relaciones
  @@index([subjectId])
  @@index([commissionId])
  @@index([createdByUserId])
  @@index([evaluationDate])
  @@index([isClosed])
  @@index([parentEvaluationId])
  @@map("evaluations")
}
```

**Tipos de campos:** maxScore, minPassingScore, weight como Decimal(6, 2)

#### Grade

```prisma
model Grade {
  id              String      @id @default(cuid())
  studentId       String
  value           Decimal?    @db.Decimal(5, 2)
  createdByUserId String
  createdAt       DateTime    @default(now())
  evaluationId    String
  observations    String?
  status          GradeStatus @default(PRESENT)
  updatedAt       DateTime    @updatedAt
  updatedByUserId String?
  // ... relaciones
  @@unique([evaluationId, studentId])
  @@index([studentId])
  @@index([evaluationId])
  @@map("grades")
}
```

**Sin campo subjectId** (eliminado según drift)

#### StudentSubjectStatus

```prisma
model StudentSubjectStatus {
  id                String           @id @default(cuid())
  studentId         String
  subjectId         String
  attendancePercent Decimal          @default(0) @db.Decimal(5, 2)
  regularityStatus  RegularityStatus @default(LIBRE)
  approved          Boolean          @default(false)
  promoted          Boolean          @default(false)
  finalGrade        Decimal?         @db.Decimal(5, 2)
  promotionDate     DateTime?
  updatedAt         DateTime         @updatedAt
  academicStatus    AcademicStatus   @default(EN_COURSE)
  courseAverage     Decimal?         @db.Decimal(5, 2)
  courseStatus      CourseStatus     @default(IN_PROGRESS)
  finalApprovalDate DateTime?
  finalExamScore    Decimal?         @db.Decimal(5, 2)
  finalExamStatus   FinalExamStatus  @default(PENDING)
  // ... relaciones
  @@unique([studentId, subjectId])
  @@index([studentId, regularityStatus])
  @@index([studentId, courseStatus])
  @@index([studentId, academicStatus])
  @@map("student_subject_status")
}
```

**Índice faltante según drift:** (studentId, promoted)

---

## 5. Diferencias entre DB real y schema.prisma actual

### Comando ejecutado

```bash
npx prisma migrate diff \
  --from-url "postgresql://freire:Freire123@localhost:5437/sistema-freire" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

### Resultado (6 líneas)

```sql
-- DropForeignKey
ALTER TABLE "student_charges" DROP CONSTRAINT "student_charges_academicTermId_fkey";

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Análisis:** Única diferencia es una restricción FK en `student_charges` que necesita ser recreada con ON DELETE RESTRICT en lugar de la configuración actual. Esto es menor y no explica el drift reportado por `migrate dev`.

---

## 6. Drift reportado por migrate dev

### Comando ejecutado

```bash
npx prisma migrate dev --create-only --name add_document_management_base
```

### Drift detectado

**Enums:**

- `AcademicStatus`: Removed APPROVED, FAILED, DROPPED
- `CourseStatus`: Removed APPROVED, FAILED, DROPPED
- `FinalExamStatus`: Removed APPROVED, EXEMPT

**Tablas:**

- `evaluations`: FK changes, type changes (maxScore, minPassingScore, weight)
- `grades`: FK changes, removed subjectId column
- `student_subject_status`: Index removed, type changes (courseAverage, finalExamScore)
- `subject_enrollments`: FK changes, added workflow columns, status default changed, new indexes

**Interpretación:** Prisma detecta que la base de datos tiene el estado **post-recuperación** (commit b78ce301), pero el historial de migraciones espera el estado **pre-recuperación** (commit 5b5ba199). Los cambios académicos legítimos existen en la base pero no están correctamente documentados en el historial.

---

## 7. ¿El schema actual coincide con la DB real?

**Parcialmente SÍ:**

- El `schema.prisma` actual refleja el estado académico correcto (enums simplificados, workflow de inscripción, tipos correctos)
- La base de datos tiene el mismo estado académico
- La única diferencia real es una FK en `student_charges` (menor)

**PERO:**

- El historial de migraciones no es reproducible desde cero
- La migración `20260620164627_add_payment_agreements_phase1` fue modificada después de aplicarse
- Prisma detecta drift porque el archivo de migración actual (262 líneas) no coincide con lo que Prisma espera que se haya aplicado

---

## 8. ¿El historial de migraciones actual es reproducible desde cero?

**NO.**

Si creamos una base nueva desde cero y aplicamos todas las migraciones en orden:

1. La migración `20260620164627_add_payment_agreements_phase1` (262 líneas) se aplicaría
2. Pero la base actual tiene el estado de la migración original (380 líneas) + cambios académicos
3. Habría divergencia entre base nueva y base actual

**Causa:** La migración fue modificada después de aplicarse, rompiendo la reproducibilidad del historial.

---

## 9. Riesgo de tocar la migración histórica

**ALTO.**

Riesgos identificados:

1. **Reintroducir contaminación académica:** Si restauramos la versión original (380 líneas), reintroducimos cambios académicos que ya se limpiaron
2. **Romper consistencia:** La base actual tiene el estado post-recuperación; cambiar la migración podría romper la relación entre historial y estado real
3. **Problemas en producción:** Si el historial no es reproducible, despliegues futuros podrían fallar
4. **Confusión de estado:** No está claro cuál es el estado "correcto" de la migración

**Conclusión:** No se debe modificar la migración histórica sin una estrategia completa y documentada.

---

## 10. Opciones de solución

### Opción A: Base local limpia

**Descripción:** Crear una base local limpia desde las migraciones actuales y continuar ahí.

**Pros:**

- Limpia el estado local
- Permite continuar con desarrollo
- No toca el historial

**Contras:**

- Pierde datos de desarrollo local
- No resuelve el problema de reproducibilidad del historial
- Puede ocultar el problema en lugar de resolverlo
- Si el historial no es reproducible, la base limpia también tendrá problemas

**Riesgo:** Medio

---

### Opción B: Reconciliación formal con migración de corrección

**Descripción:** Crear una nueva migración que documente los cambios académicos que ya existen en la base, sincronizando el historial con el estado real.

**Pros:**

- Documenta los cambios académicos legítimos
- Hace el historial reproducible
- No toca la migración histórica
- Resuelve el problema de raíz

**Contras:**

- Requiere entender exactamente qué cambios académicos se hicieron
- Puede ser complejo si hay dependencias
- Requiere testing cuidadoso

**Riesgo:** Medio-Alto

---

### Opción C: Marcar drift como resuelto (NO RECOMENDADO)

**Descripción:** Usar `migrate resolve --applied` para ignorar el drift.

**Pros:**

- Rápido
- Permite continuar inmediatamente

**Contras:**

- Oculta el problema
- Puede causar problemas futuros
- No resuelve la reproducibilidad
- Anti-pattern

**Riesgo:** Alto

---

### Opción D: Restaurar migración original (NO RECOMENDADO)

**Descripción:** Restaurar la migración a su estado original (380 líneas, commit 5b5ba199).

**Pros:**

- Alinearía el archivo con lo que Prisma espera

**Contras:**

- Reintroduce contaminación académica
- Rompe el estado actual de la base
- Ya se limpió esta contaminación en b78ce301
- Alto riesgo de romper funcionalidad académica

**Riesgo:** Muy Alto

---

## 11. Recomendación preliminar

**Recomendación preliminar: Pausar nuevas migraciones y validar reproducibilidad en una base temporal limpia antes de elegir estrategia.**

**Razones:**

1. El diff DB real vs schema actual muestra solo 6 líneas de diferencia (FK en student_charges)
2. Esto indica que la base real y `schema.prisma` están prácticamente alineados
3. El problema parece estar en la reproducibilidad del historial de migraciones / shadow database / checksum histórico, no necesariamente en el modelo actual
4. Si el historial actual del repo puede crear una base limpia desde cero sin drift, entonces el problema es la base local actual / metadata histórica
5. Si el historial actual del repo NO puede crear una base limpia desde cero, entonces hay que reconciliar formalmente el historial antes de Gestión Documental

**Plan propuesto (Fase 0.2):**

1. Crear una base temporal limpia: `sistema-freire-repro-test`
2. Aplicar todas las migraciones actuales en la base temporal
3. Comparar la base temporal contra `schema.prisma` actual
4. Probar `migrate dev --create-only` contra la base temporal
5. Si no hay drift: solución es usar una base local limpia para desarrollo
6. Si hay drift: diseñar reconciliación formal con evidencia real

---

## 12. Evidencia recopilada

### Archivos de evidencia

- `/tmp/migrate_dev_drift.log` - Log completo de drift detectado
- `/tmp/db_to_schema_diff.sql` - Diff DB real vs schema actual (6 líneas)
- `/tmp/payment_agreements_phase1_original.sql` - Migración original (380 líneas)
- `/tmp/payment_agreements_phase1_recovered.sql` - Migración recuperada (262 líneas)

### Estado del repositorio

```bash
git status --short
# Salida: vacío (working tree limpio)

npx prisma migrate status
# Salida: 29 migrations found, Database schema is up to date!
```

### DATABASE_URL verificado

```
postgresql://freire:Freire123@localhost:5437/sistema-freire
```

- Base correcta: `sistema-freire` (con guion)
- Puerto: `5437`
- No apunta a base vieja o de pruebas

---

## 13. Resultados de Fase 0.2: Prueba de reproducibilidad

**Fecha:** 2026-06-27  
**Objetivo:** Comprobar si el historial actual del repo puede crear una base limpia desde cero.

### Procedimiento

1. Crear base temporal limpia: `sistema-freire-repro-test`
2. Aplicar todas las migraciones actuales en la base temporal
3. Comparar la base temporal contra `schema.prisma` actual
4. Probar `migrate dev --create-only` contra la base temporal

### Resultados

**Migrate deploy:** 29 migraciones aplicadas exitosamente

**Diff base temporal vs schema actual:** 103 líneas de drift académico completo

**Cambios detectados en diff:**

- **Enums:** AcademicStatus, CourseStatus, FinalExamStatus (removiendo valores APPROVED, FAILED, DROPPED, EXEMPT)
- **Tablas:** evaluations, grades, student_subject_status, subject_enrollments
- **Índices:** student_subject_status_studentId_promoted_idx eliminado
- **FKs:** múltiples foreign keys recreadas

**Migrate dev create-only:** Error por modo no interactivo, pero con warnings importantes sobre valores de enum que serán removidos

### Conclusión de Fase 0.2

**CRÍTICO:** La base temporal creada desde las migraciones actuales **TIENE drift académico completo** (103 líneas de diff).

**Esto confirma:**

- El historial actual del repo **NO es reproducible desde cero**
- Las migraciones actuales crean un estado académico diferente al que espera el `schema.prisma` actual
- El problema NO es solo la base local actual / metadata histórica
- El problema está en el historial de migraciones del repo

**Comparación con base principal:**

- Base principal vs schema actual: solo 6 líneas de diferencia (FK en student_charges)
- Base temporal vs schema actual: 103 líneas de drift académico completo

**Implicación:** La base principal está casi alineada con `schema.prisma`, pero el historial de migraciones no puede reproducir ese estado desde cero.

---

## 14. Recomendación actualizada

**Recomendación actualizada: Reconciliación formal del historial Prisma (Fase 0.3)**

**Razones:**

1. Fase 0.2 confirmó que el historial actual **no es reproducible desde cero**
2. Una base temporal limpia termina con drift académico de 103 líneas
3. La base principal está casi alineada con `schema.prisma`, salvo la diferencia menor de FK en `student_charges`
4. No se debe tocar la migración histórica `20260620164627_add_payment_agreements_phase1`
5. Se requiere una migración nueva de reconciliación
6. La migración candidata debe probarse primero en base temporal limpia
7. La estrategia final para la base principal se decide después de revisar el SQL

**Plan propuesto (Fase 0.3):**

1. Generar SQL candidato desde base temporal limpia
2. Revisar SQL candidato (solo cambios académicos esperados)
3. Crear migración candidata, pero no aplicarla en base principal
4. Probar la migración candidata en una segunda base temporal limpia
5. Validar que el diff final sea vacío o sin cambios relevantes
6. Decidir estrategia para la base principal después de revisión

**Restricciones:**

- No tocar `prisma/schema.prisma`
- No tocar `prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql`
- No aplicar migración candidata en base principal hasta aprobación
- No usar `migrate resolve`, `migrate reset` ni `db push`

---

## 15. Próximos pasos

**EN PROGRESO - Fase 0.3:**

1. Generar SQL candidato desde base temporal limpia
2. Revisar SQL candidato
3. Crear migración candidata (no aplicar en base principal)
4. Probar migración candidata en segunda base temporal
5. Validar diff final
6. Decidir estrategia para base principal

**PENDIENTE APROBACIÓN:**

1. Revisar SQL candidato
2. Revisar resultado en base temporal de verificación
3. Aprobar aplicación en base principal
4. Continuar con Gestión Documental Fase 1.1

**GESTIÓN DOCUMENTAL:** PAUSADA hasta completar reconciliación.

---

## 16. Resultados de Fase 0.4: Reconciliación segura de la base principal

**Fecha:** 2026-06-27  
**Objetivo:** Dejar la base principal alineada con `schema.prisma` y marcar correctamente la migración candidata como aplicada.

### Procedimiento

1. Confirmar diff actual de la base principal
2. Backup antes de tocar base principal
3. Aplicar únicamente el delta real pendiente de la base principal
4. Verificar que la base principal quedó alineada con schema
5. Marcar migración candidata como aplicada en la base principal
6. Verificar estado final

### Resultados

**Diff principal antes de aplicar delta:** 6 líneas (FK en student_charges)

```sql
-- DropForeignKey
ALTER TABLE "student_charges" DROP CONSTRAINT "student_charges_academicTermId_fkey";

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Backup creado:** `backups/sistema-freire-before-prisma-reconcile-20260627-164149.sql` (369K)

**SQL aplicado a la base principal:** Solo el delta de FK (2 ALTER TABLE)

**Diff principal después de aplicar FK:** Vacío

```sql
-- This is an empty migration.
```

**Salida de migrate resolve --applied:**

```
Migration 20260627_reconcile_academic_schema_history marked as applied.
```

**Salida de npx prisma migrate status:**

```
30 migrations found in prisma/migrations
Database schema is up to date!
```

**Diff final:** Vacío

### Conclusión de Fase 0.4

**EXITOSO:** La base principal quedó alineada con `schema.prisma` y la migración candidata fue marcada como aplicada.

**Confirmaciones:**

- Solo se aplicó el delta real pendiente (FK en student_charges)
- No se usó `migrate reset` ni `db push`
- No se editó `_prisma_migrations` manualmente
- Backup creado antes de cambios
- Validaciones de Prisma y build exitosas
- Historial de migraciones ahora es reproducible para bases nuevas

---

## 17. Resumen final de reconciliación

### Fases completadas

**Fase 0.1:** Diagnóstico inicial del drift

- Identificada migración histórica modificada
- Detectada diferencia entre DB real y schema.prisma

**Fase 0.2:** Prueba de reproducibilidad en base temporal limpia

- Confirmado que el historial actual NO es reproducible desde cero
- Base temporal termina con drift académico de 103 líneas

**Fase 0.3:** Reconciliación formal del historial Prisma

- Creada migración candidata `20260627_reconcile_academic_schema_history`
- Validada en base temporal limpia
- Diff final vacío después de aplicar migración candidata

**Fase 0.4:** Reconciliación segura de la base principal

- Aplicado solo delta real pendiente (FK en student_charges)
- Marcada migración candidata como aplicada con `migrate resolve --applied`
- Base principal alineada con schema.prisma
- Historial reproducible para bases nuevas

### Archivos creados/modificados

- `docs/PRISMA_MIGRATION_DRIFT_DIAGNOSIS.md` - Documento de diagnóstico
- `prisma/migrations/20260627_reconcile_academic_schema_history/migration.sql` - Migración de reconciliación

### Restricciones respetadas

- No se modificó `prisma/schema.prisma`
- No se tocó `prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql`
- No se usó `migrate reset` ni `db push`
- No se creó migración de Gestión Documental
- Gestión Documental permanece pausada

### Estado final

- **Base principal:** Alineada con `schema.prisma`
- **Historial de migraciones:** Reproducible desde cero
- **Prisma status:** Database schema is up to date
- **Validaciones:** Todas exitosas
- **Build:** Exitoso

---

**Documento creado:** 2026-06-27  
**Estado:** COMPLETADO - Reconciliación exitosa del historial Prisma
