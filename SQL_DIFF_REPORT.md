# SQL Diff Report - Prisma Schema Changes

## Fecha
2025-01-XX

## Comparación
Schema actual: `prisma/schema.prisma`
Schema anterior: `prisma/schema-backup.prisma`

## Resumen
**No hay cambios estructurales pendientes en el schema de Prisma.**

Los modelos principales del módulo de Evaluaciones y Calificaciones ya están definidos correctamente en el schema actual:

- `Evaluation` - Identical en ambos schemas
- `Grade` - Identical en ambos schemas  
- `StudentSubjectStatus` - Identical en ambos schemas

## Modelos Verificados

### Evaluation
- Campos: id, subjectId, commissionId, title, description, type, evaluationDate, maxScore, minPassingScore, weight, observations, isClosed, closedAt, closedByUserId, closedReason, reopenedAt, reopenedByUserId, reopenReason, parentEvaluationId, createdAt, updatedAt, createdByUserId
- Relaciones: subject, commission, createdByUser, closedByUser, reopenedByUser, parentEvaluation, recoveryEvaluations, grades
- Índices: subjectId, commissionId, createdByUserId, evaluationDate, isClosed, parentEvaluationId
- **Estado:** SIN CAMBIOS

### Grade
- Campos: id, evaluationId, studentId, status, value, observations, createdByUserId, updatedByUserId, createdAt, updatedAt
- Relaciones: evaluation, student, createdByUser, updatedByUser
- Índices: studentId, evaluationId
- Unique constraint: (evaluationId, studentId)
- **Estado:** SIN CAMBIOS

### StudentSubjectStatus
- Campos: id, studentId, subjectId, attendancePercent, regularityStatus, courseAverage, courseStatus, finalExamScore, finalExamStatus, academicStatus, promotionDate, finalApprovalDate, updatedAt, approved, promoted, finalGrade
- Relaciones: student, subject
- Índices: (studentId, regularityStatus), (studentId, courseStatus), (studentId, academicStatus)
- Unique constraint: (studentId, subjectId)
- **Estado:** SIN CAMBIOS

## Enums
Los siguientes enums ya están definidos en el schema:
- `GradeStatus`: PRESENT, ABSENT, EXCUSED
- `EvaluationType`: PARCIAL, FINAL, RECUPERATORIO, TRABAJO_PRACTICO, EXAMEN, EXAMEN_FINAL, MESA_EXAMEN
- `CourseStatus`: IN_PROGRESS, APPROVED, FAILED, PENDING
- `FinalExamStatus`: PENDING, APPROVED, FAILED, EXEMPT
- `AcademicStatus`: EN_COURSE, APPROVED, FAILED, IN_PROGRESS

## Tablas Existentes en Base de Datos
- `grades`: 0 registros (vacía)
- `evaluations`: 0 registros (vacía)
- `student_subject_status`: Tabla existente (verificar conteo)

## Conclusión
El schema de Prisma ya está sincronizado con la base de datos. No se requieren cambios estructurales adicionales. Las tablas `grades` y `evaluations` están vacías, por lo que no hay riesgo de pérdida de datos al ejecutar `prisma db push`.

## Comando Ejecutable
```bash
npx prisma db push
```

**Advertencia:** No se requiere `--accept-data-loss` ya que no hay cambios destructivos pendientes.
