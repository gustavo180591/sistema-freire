# Estrategia de Migración del Módulo de Exámenes y Calificaciones

## Resumen

El módulo de exámenes y calificaciones ha sido completamente refactorizado con:
- Servicio de dominio `EvaluationService` centralizando toda la lógica de negocio
- Actions de SvelteKit delegando completamente al servicio
- Auditoría real implementada con metadata oldValue/newValue
- 2 migraciones incrementales completando el schema
- Estrategia de migración validada en bases temporales vacías

Este documento describe la estrategia de migración para bases de datos nuevas y existentes.

## Estado Actual de Migraciones

- **Migraciones totales**: 26
- **Migraciones originales**: 24 (hasta `20260606023826_add_payslip_upload_tracking`)
- **Migración incremental 1**: `20260609163939_refactor_exam_and_grade_module` - Refactor del módulo de exámenes
- **Migración incremental 2**: `20260609170000_create_subject_commissions_and_sync_schema` - Creación de subject_commissions y sincronización de schema

## Cambios en la Migración Incremental

La migración `refactor_exam_and_grade_module` agrega:

### Enums
- `EvaluationType`: PARCIAL, TRABAJO_PRACTICO, INTEGRADOR, RECUPERATORIO, MESA_EXAMEN
- `GradeStatus`: PRESENT, ABSENT, EXCUSED
- `CourseStatus`: IN_PROGRESS, APPROVED, FAILED, DROPPED
- `FinalExamStatus`: PENDING, APPROVED, FAILED, EXEMPT
- `AcademicStatus`: EN_COURSE, APPROVED, FAILED, DROPPED

### Tabla `evaluations`
- Columnas nuevas: `evaluationDate`, `minPassingScore`, `weight`, `parentEvaluationId`, `createdByUserId`, `isClosed`, `closedAt`, `closedByUserId`, `closedReason`, `reopenedAt`, `reopenedByUserId`, `reopenReason`, `commissionId`
- Migración de datos: `date` → `evaluationDate`, `createdBy` → `createdByUserId`
- Eliminación de columnas obsoletas: `date`, `createdBy`
- Índices: `subjectId`, `commissionId`, `evaluationDate`, `isClosed`, `parentEvaluationId`, `createdByUserId`
- Foreign keys: `subjectId` → subjects, `createdByUserId` → users, `parentEvaluationId` → evaluations (self), `closedByUserId` → users, `reopenedByUserId` → users

### Tabla `grades`
- Columnas nuevas: `evaluationId`, `status`, `observations`, `createdAt`, `updatedAt`
- Migración de datos: `gradedAt` → `createdAt`
- Eliminación de columnas obsoletas: `gradeType`, `gradedAt`
- Cambio: `value` ahora es nullable
- Índices: `evaluationId`, `studentId`, índice único `[evaluationId, studentId]`
- Foreign keys: `evaluationId` → evaluations, `createdByUserId` → users

### Tabla `student_subject_status`
- Columnas nuevas: `courseAverage`, `courseStatus`, `finalExamScore`, `finalExamStatus`, `academicStatus`
- Índices: `studentId, courseStatus`, `studentId, academicStatus`

## Estrategia para Bases de Datos Nuevas

Para bases de datos completamente nuevas:

```bash
# Aplicar todas las migraciones en orden
npx prisma migrate deploy
```

Esto aplicará las 26 migraciones secuencialmente y creará el schema completo del módulo de exámenes y calificaciones.

**Verificación:**
```bash
# Verificar estado de migraciones
npx prisma migrate status

# Debe mostrar: "Database is up to date"
```

## Estrategia para Bases de Datos Existentes

Para bases de datos existentes creadas con `prisma db push`:

### Paso 1: Inspección del Schema Real

Antes de aplicar cualquier migración, inspeccionar el schema real de la base de datos existente:

```bash
# Exportar schema actual
npx prisma db pull
```

Comparar manualmente el schema exportado con `prisma/schema.prisma` para identificar diferencias.

### Paso 2: Backup Obligatorio

Crear un backup completo de la base de datos existente:

```bash
# Usar pg_dump o herramienta equivalente
pg_dump -h localhost -U postgres -d sistema-freire > backup_before_migration.sql
```

### Paso 3: Aplicar Migración Incremental

Si el schema es compatible, aplicar solo la migración incremental:

```bash
# Aplicar migración incremental específica
npx prisma migrate resolve --applied "20260609163939_refactor_exam_and_grade_module"
```

**⚠️ ADVERTENCIA:** No marcar todas las migraciones como aplicadas sin inspección previa. Esto puede causar inconsistencias entre el schema real y el historial de migraciones.

### Paso 4: Verificación

```bash
# Verificar estado de migraciones
npx prisma migrate status

# Verificar que el schema coincide
npx prisma db pull
diff prisma/schema.prisma prisma/schema.prisma
```

## Limitaciones Conocidas

**RESUELTO:** La foreign key `evaluations.commissionId → subject_commissions.id` fue creada en la migración `20260609170000_create_subject_commissions_and_sync_schema`.

**Confirmación:**
- Constraint: `evaluations_commissionId_fkey`
- Referencia: `subject_commissions.id`
- ON DELETE: `RESTRICT` (coincide con schema.prisma)

La segunda migración incremental también agrega:
- Tabla `subject_commissions` completa con todas sus foreign keys
- Tabla `subject_enrollments` con todas sus foreign keys
- Nuevas variantes de enums (REGULAR, LIBRE, APROBADO, PROMOCIONADO, etc.)
- Columnas adicionales en `evaluations`, `grades`, `student_subject_status`
- Foreign key faltante de `commissionId` en `evaluations`

## Arquitectura del Módulo

### Servicio de Dominio EvaluationService
**Archivo:** `src/lib/server/academic/evaluation-service.ts`

**Responsabilidades:**
- Centralizar toda la lógica de negocio del módulo de evaluaciones
- Validar permisos y reglas de negocio
- Gestionar transacciones atómicas
- Implementar auditoría con metadata estructurado
- Recalcular situación académica de alumnos

**Métodos operativos:**
- `createEvaluation()` - Creación con validaciones de materia, comisión, docente y recuperatorios
- `loadGradesBatch()` - Carga masiva con transacción y recálculo
- `editGrade()` - Edición con validaciones y auditoría
- `deleteGrade()` - Eliminación con validaciones y auditoría
- `closeEvaluation()` - Cierre con validaciones y auditoría
- `reopenEvaluation()` - Reapertura con validaciones y auditoría

**Métodos de validación:**
- `canCloseEvaluation()` - Valida permisos de cierre
- `canReopenEvaluation()` - Valida permisos de reapertura
- `canLoadGrades()` - Valida permisos de carga
- `canEditGrade()` - Valida permisos de edición
- `canDeleteGrade()` - Valida permisos de eliminación

### Actions de SvelteKit
**Archivos:**
- `src/routes/(app)/docente/evaluaciones/+page.server.ts`
- `src/routes/(app)/docente/calificaciones/+page.server.ts`

**Responsabilidades:**
- Lectura de `FormData`
- Validación de formato básico
- Obtención de `locals.user`
- Llamada al servicio
- Devolución de respuesta para la UI

**Confirmación:** ✅ No hay escritura directa a Prisma fuera del servicio

## Procedimiento de Validación

### Prueba en Base Temporal

Antes de aplicar en producción, probar en una base temporal:

```bash
# Crear base temporal
docker run -d --name test-migration -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=test -p 5432:5432 postgres:15-alpine

# Aplicar migraciones
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test" npx prisma migrate deploy

# Verificar schema
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test" npx tsx scripts/verify-migration-schema.ts

# Limpiar
docker rm -f test-migration
```

### Validación de Aplicación

```bash
# Generar cliente Prisma
npx prisma generate

# Verificar que la aplicación compila
npm run build

# Ejecutar seed
npx tsx prisma/seed.ts
```

## Recuperación de Errores

Si la migración falla:

1. **Identificar el error**: Revisar el mensaje de error de Prisma
2. **Resolver manualmente**: Si es un conflicto de datos, resolver manualmente
3. **Marcar como resuelta**: `npx prisma migrate resolve --applied <migration_name>`
4. **Continuar**: `npx prisma migrate deploy`

## Contacto

Para consultas sobre esta estrategia de migración, contactar al equipo de desarrollo.
