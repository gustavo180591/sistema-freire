# REPORTES - Fase 0: Diagnóstico técnico e inventario de datos

**Fecha:** 30/06/2026
**Estado:** Diagnóstico completado
**Objetivo:** Relevar datos existentes, reportes implementados y arquitectura para construir un módulo de reportes sólido, seguro y escalable.

---

## 1. Estado actual del sistema

### 1.1 Schema Prisma
- **Total de modelos:** 40+ modelos
- **Migrations:** 33 migrations activas
- **Schema:** Estable, sin cambios pendientes
- **Base de datos:** PostgreSQL en localhost:5437

### 1.2 Módulos ya cerrados
- **Gestión Documental (Fase 1.5):** Completado con UI protegida
- **Convenios de Pago (Fase 6):** Completado con integración financiera
- **Módulo Financiero (Fase 6):** Reportes financieros básicos implementados

### 1.3 Arquitectura existente
- **Framework:** SvelteKit con TypeScript
- **ORM:** Prisma Client
- **Autenticación:** Sesiones con TOTP opcional
- **Permisos:** Sistema granular por entidad y acción
- **Auditoría:** AuditLog para acciones sensibles
- **Storage:** filesystem privado para documentos

---

## 2. Modelos disponibles para reportes académicos

### 2.1 Modelos principales

| Modelo | Propósito | Campos clave para reportes |
|--------|-----------|---------------------------|
| **Student** | Alumnos | status, careerId, currentYear, isBecado, isRecursante |
| **Career** | Carreras | name, trainingField, durationYears, active |
| **Subject** | Materias | name, subjectType, trainingField, yearLevel, active |
| **SubjectCommission** | Comisiones | code, maxCapacity, currentEnrolled, schedule, active |
| **SubjectEnrollment** | Inscripciones | status, enrolledAt, confirmedAt, cancelledAt |
| **Grade** | Calificaciones | value, status, createdAt, evaluationId |
| **Evaluation** | Evaluaciones | title, maxScore, evaluationDate, type, isClosed |
| **StudentSubjectStatus** | Estado por materia | attendancePercent, regularityStatus, approved, promoted, finalGrade |
| **AcademicYearHistory** | Historial anual | year, status, observations |
| **StudyPlan** | Planes de estudio | name, version, durationYears, active |
| **PlanSubject** | Materias por plan | sortOrder |
| **Teacher** | Docentes | status, hireDate, observations |
| **SubjectTeacher** | Asignación docente-materia | subjectId, teacherId |

### 2.2 Modelos de asistencia

| Modelo | Propósito | Campos clave |
|--------|-----------|--------------|
| **AttendanceRecord** | Registro de clase | subjectId, classDate, commissionId, createdByUserId |
| **AttendanceEntry** | Asistencia por alumno | attendanceId, studentId, present, notes |

### 2.3 Reportes académicos posibles sin cambios de schema

✅ **Alumnos por carrera:** Student + Career
✅ **Alumnos activos/inactivos:** Student.status
✅ **Matrícula por año:** Student.currentYear + AcademicYearHistory
✅ **Historial académico:** AcademicYearHistory + StudentSubjectStatus
✅ **Desempeño por materia:** StudentSubjectStatus + Subject
✅ **Docentes asignados:** SubjectTeacher + Teacher
✅ **Distribución por institución:** CareerLocation + Location
✅ **Asistencia por alumno:** AttendanceEntry + Student
✅ **Asistencia por curso:** AttendanceRecord + AttendanceEntry
✅ **Inasistencias justificadas/no justificadas:** AttendanceEntry.notes
✅ **Porcentaje de asistencia:** StudentSubjectStatus.attendancePercent
✅ **Alertas por baja asistencia:** StudentSubjectStatus.attendancePercent < threshold
✅ **Calificaciones por evaluación:** Grade + Evaluation
✅ **Promedios por materia:** StudentSubjectStatus.courseAverage
✅ **Estado de regularidad:** StudentSubjectStatus.regularityStatus
✅ **Estado de aprobación:** StudentSubjectStatus.approved, promoted

### 2.4 Reportes académicos que requieren schema futuro

❌ **Certificados emitidos:** No existe modelo de certificados académicos emitidos
❌ **Documentos académicos por tipo:** Document model existe pero no está integrado a académico
❌ **Correlatividades cumplidas:** SubjectCorrelative existe pero no tracking de cumplimiento
❌ **Evolución de matrícula histórica:** Requiere agregación temporal por año
❌ **Desempeño comparativo por período:** Requiere análisis temporal de StudentSubjectStatus

---

## 3. Modelos disponibles para reportes financieros

### 3.1 Modelos principales

| Modelo | Propósito | Campos clave para reportes |
|--------|-----------|---------------------------|
| **StudentCharge** | Cuotas/Cargos | amount, paidAmount, status, dueDate, periodLabel, isOverdue |
| **Payment** | Pagos | amount, method, reference, paidAt, isCancelled, receiptId |
| **PaymentAllocation** | Asignación pago-cuota | paymentId, chargeId, installmentId, amount |
| **Receipt** | Recibos | receiptNumber, receiptYear, totalAmount, paymentMethod, status |
| **ReceiptItem** | Ítems de recibo | concept, periodLabel, baseAmount, lateFeeAmount, discountAmount, finalAmount |
| **FinancialMovement** | Historial unificado | movementType, entityType, entityId, amount, balanceBefore, balanceAfter |
| **FinancialBlock** | Bloqueos | blockType, blockReason, debtAmount, isActive, exceptionGranted |
| **Scholarship** | Becas | percentage, active, startDate, endDate, appliedAmount |
| **Discount** | Descuentos | discountType, value, applicableTo, validFrom, validUntil |
| **LateFee** | Recargos por mora | feeType, feeValue, calculatedAmount, isAutomatic |
| **FinancialConfig** | Configuración | key, value, category |
| **ChargeConcept** | Conceptos de cobro | code, name, description, active |
| **AcademicTerm** | Períodos académicos | name, year, termType, startDate, endDate, active |

### 3.2 Modelos de Convenios de Pago (módulo cerrado)

| Modelo | Propósito | Campos clave |
|--------|-----------|--------------|
| **PaymentAgreement** | Convenios | agreementNumber, originalDebt, agreedAmount, paidAmount, status |
| **PaymentAgreementInstallment** | Cuotas de convenio | installmentNumber, dueDate, amount, paidAmount, status |
| **PaymentAgreementChargeRelation** | Relación cuota-convenio | relationType, amountIncluded, newStatus |
| **PaymentAgreementEvent** | Eventos de convenio | eventType, previousStatus, newStatus, oldValue, newValue |

### 3.3 Reportes financieros posibles sin cambios de schema

✅ **Deuda total por alumno:** StudentCharge agrupado por studentId
✅ **Deuda por período:** StudentCharge.periodLabel + AcademicTerm
✅ **Pagos recibidos:** Payment + PaymentAllocation
✅ **Cuotas vencidas:** StudentCharge.isOverdue = true
✅ **Convenios activos:** PaymentAgreement.status = ACTIVE
✅ **Convenios incumplidos:** PaymentAgreement.status = DEFAULTED/OVERDUE
✅ **Ingresos por período:** Payment.paidAt agrupado por fecha
✅ **Recibos emitidos:** Receipt.status = ISSUED
✅ **Deuda efectiva integrada:** StudentCharge + PaymentAgreement (ya implementado)
✅ **Morosidad:** StudentCharge.isOverdue + FinancialBlock
✅ **Resumen financiero institucional:** Agregación de todos los modelos
✅ **Movimientos financieros:** FinancialMovement con filtros
✅ **Becas activas:** Scholarship.active = true
✅ **Descuentos aplicados:** Discount + PaymentAllocation
✅ **Recargos por mora:** LateFee agrupado por período
✅ **Pagos por método:** Payment.method agrupado
✅ **Historial de recibos:** Receipt con filtros

### 3.4 Reportes financieros que requieren schema futuro

❌ **Proyección de ingresos:** Requiere modelo de presupuestos
❌ **Análisis de morosidad por cohorte:** Requiere agrupación temporal compleja
❌ **Comparación interanual:** Requiere data histórica consolidada
❌ **Indicadores de cobranza:** Requiere métricas calculadas adicionales

---

## 4. Modelos disponibles para asistencia

### 4.1 Modelos principales

| Modelo | Propósito | Campos clave |
|--------|-----------|-------------|
| **AttendanceRecord** | Registro de clase | subjectId, classDate, commissionId, createdByUserId |
| **AttendanceEntry** | Asistencia por alumno | attendanceId, studentId, present, notes |
| **Subject** | Materias | name, active |
| **SubjectCommission** | Comisiones | code, teacherId, schedule |
| **Student** | Alumnos | status, careerId |

### 4.2 Reportes de asistencia posibles sin cambios de schema

✅ **Asistencia por alumno:** AttendanceEntry agrupado por studentId
✅ **Asistencia por curso:** AttendanceRecord + AttendanceEntry
✅ **Inasistencias justificadas:** AttendanceEntry.notes != null
✅ **Inasistencias no justificadas:** AttendanceEntry.present = false && notes = null
✅ **Porcentaje de asistencia:** Cálculo desde AttendanceEntry.present
✅ **Alertas por baja asistencia:** StudentSubjectStatus.attendancePercent < threshold
✅ **Asistencia por período:** AttendanceRecord.classDate agrupado
✅ **Asistencia institucional:** Agregación global de AttendanceEntry

### 4.3 Reportes de asistencia que requieren schema futuro

❌ **Justificaciones por tipo:** No existe modelo de tipos de justificación
❌ **Alertas automáticas:** Requiere configuración de umbrales por materia
❌ **Historial de cambios de asistencia:** No existe tracking de modificaciones
❌ **Comparación de asistencia entre períodos:** Requiere análisis temporal

---

## 5. Modelos disponibles para estadísticas institucionales

### 5.1 Modelos principales

| Modelo | Propósito | Campos clave |
|--------|-----------|-------------|
| **User** | Usuarios | status, roles |
| **Student** | Alumnos | status, careerId, currentYear |
| **Teacher** | Docentes | status |
| **Career** | Carreras | active, locations |
| **Subject** | Materias | active |
| **StudentCharge** | Deuda | amount, paidAmount, status |
| **Payment** | Pagos | amount, paidAt |
| **Document** | Documentos | category, status, visibility |
| **AuditLog** | Auditoría | action, entityType, createdAt |
| **Location** | Sedes | active |

### 5.2 KPIs institucionales posibles sin cambios de schema

✅ **Total de alumnos:** Student.count()
✅ **Alumnos activos:** Student.count({ where: { status: 'ACTIVE' } })
✅ **Alumnos por institución:** Student + CareerLocation
✅ **Alumnos por carrera:** Student.groupBy({ by: ['careerId'] })
✅ **Alumnos por año:** Student.groupBy({ by: ['currentYear'] })
✅ **Evolución de matrícula:** AcademicYearHistory.year agrupado
✅ **Deuda total:** StudentCharge.aggregate({ _sum: { amount: true } })
✅ **Ingresos del mes:** Payment.where({ paidAt: este mes }).aggregate({ _sum: { amount: true } })
✅ **Documentos cargados:** Document.count()
✅ **Docentes activos:** Teacher.count({ where: { status: 'ACTIVE' } })
✅ **Usuarios activos:** User.count({ where: { status: 'ACTIVE' } })
✅ **Asistencia promedio:** StudentSubjectStatus.attendancePercent average
✅ **Distribución por estados:** Student.status agrupado
✅ **Indicadores académicos:** StudentSubjectStatus agregados
✅ **Indicadores financieros:** StudentCharge + Payment agregados
✅ **Indicadores documentales:** Document.category agrupado

### 5.3 KPIs institucionales que requieren schema futuro

❌ **Tasa de deserción:** Requiere tracking de egresos/deserciones
❌ **Tasa de aprobación:** Requiere consolidación de StudentSubjectStatus
❌ **Índice de satisfacción:** No existe modelo de encuestas
❌ **Utilización de capacidad:** Requiere métricas de ocupación vs capacidad

---

## 6. Reportes ya existentes

### 6.1 Rutas implementadas

| Ruta | Propósito | Servicio usado | Estado |
|------|-----------|----------------|--------|
| `/reportes` | Dashboard general de reportes | Prisma directo | ✅ Activo |
| `/reportes/academico` | Reporte académico general | academic-report.service.ts | ✅ Activo |
| `/reportes/financiero` | Reporte financiero de morosidad | financial-report.service.ts | ✅ Activo |
| `/reportes/oficiales` | Documentación oficial institucional | official-report.service.ts | ✅ Activo |
| `/reportes/academico/export.pdf` | Exportación PDF académico | pdfkit + financial-report | ✅ Activo |
| `/reportes/academico/export.xlsx` | Exportación Excel académico | xlsx + financial-report | ✅ Activo |
| `/reportes/oficiales/export.pdf` | Exportación PDF oficial | pdfkit + official-report | ✅ Activo |
| `/reportes/oficiales/export.xlsx` | Exportación Excel oficial | xlsx + official-report | ✅ Activo |
| `/finanzas` | Dashboard financiero | financial-service.getFinancialDashboardMetrics() | ✅ Activo |
| `/finanzas/reportes` | Reportes financieros avanzados | financial-service | ✅ Activo |
| `/finanzas/alumnos/[id]` | Reporte individual por alumno | financial-service.getStudentFinancialReport() | ✅ Activo |
| `/finanzas/movimientos` | Historial de movimientos | financial-service.getFinancialMovementsHistory() | ✅ Activo |
| `/dashboard` | Dashboard institucional | Prisma directo | ✅ Activo |
| `/finanzas/reportes` | Exportación CSV financiera | financial-service.exportPeriodReportToCSV() | ✅ Activo |

### 6.2 Servicios de reportes existentes

| Servicio | Archivo | Funciones principales |
|----------|---------|----------------------|
| **AcademicReportService** | `src/lib/server/services/reports/academic-report.service.ts` | getAcademicReport() - alumnos, materias, riesgo académico |
| **FinancialReportService** | `src/lib/server/services/reports/financial-report.service.ts` | getFinancialReport() - deuda, pagos, métricas |
| **OfficialReportService** | `src/lib/server/services/reports/official-report.service.ts` | getOfficialReport() - actas, libro matriz, nóminas |
| **FinancialService** | `src/lib/server/financial/financial-service.ts` | getFinancialDashboardMetrics(), getStudentFinancialReport(), getPeriodFinancialReport(), getFinancialMovementsHistory(), exportPeriodReportToCSV(), exportMovementsToCSV() |

### 6.3 Limitaciones de reportes existentes

- **AcademicReportService:** Solo reporte básico, sin filtros por carrera/período
- **FinancialReportService:** Integrado con Convenios de Pago, pero sin filtros avanzados
- **OfficialReportService:** Documentos estáticos, no dinámicos desde datos reales
- **Exportación PDF:** Formato básico sin templates profesionales
- **Exportación Excel:** Sin formato avanzado (gráficos, tablas dinámicas)
- **Dashboard institucional:** Métricas limitadas, sin visualizaciones
- **Sin reportes de asistencia:** No existe servicio específico
- **Sin dashboard de KPIs institucionales:** No existe consolidación

---

## 7. Utilidades de exportación existentes

### 7.1 Librerías instaladas

| Librería | Propósito | Uso actual |
|----------|-----------|------------|
| **pdfkit** | Generación PDF | Exportación PDF de reportes académicos/oficiales |
| **xlsx** | Generación Excel | Exportación Excel de reportes académicos/oficiales |
| **Decimal** | Precisión financiera | Cálculos monetarios en financial-service |

### 7.2 Implementaciones de exportación

**CSV (manual en financial-service.ts):**
- `escapeCSV()` - Escape de comillas, comas, saltos de línea
- `generateCSV()` - Generación de contenido CSV
- `exportPeriodReportToCSV()` - Exportación con auditoría
- `exportMovementsToCSV()` - Exportación con auditoría

**PDF (pdfkit):**
- Formato básico A4
- Header institucional
- Texto simple
- Sin templates profesionales

**Excel (xlsx):**
- Hojas simples
- JSON a sheet
- Sin formato avanzado

### 7.3 Auditoría de exportaciones

- **AuditLog action:** `EXPORT`
- **EntityTypes:** `FinancialReport`, `FinancialReportPDF`, `OfficialReport`, `OfficialReportPDF`
- **Metadata:** format, filters, recordCount, filename
- **Implementado:** ✅ En todas las exportaciones financieras

---

## 8. Sistema de permisos existente

### 8.1 Entidades de permisos

| Entidad | Propósito | Estado |
|---------|-----------|--------|
| **FINANCIAL_REPORT** | Reportes financieros | ✅ Existe |
| **USER** | Usuarios | ✅ Existe |
| **STUDENT** | Alumnos | ✅ Existe |
| **TEACHER** | Docentes | ✅ Existe |
| **CAREER** | Carreras | ✅ Existe |
| **SUBJECT** | Materias | ✅ Existe |
| **ATTENDANCE** | Asistencia | ✅ Existe |
| **GRADE** | Calificaciones | ✅ Existe |
| **DOCUMENT** | Documentos | ✅ Existe |
| **PAYMENT_AGREEMENT** | Convenios de pago | ✅ Existe |

### 8.2 Permisos por rol (por defecto)

| Rol | FINANCIAL_REPORT | ATTENDANCE | GRADE | DOCUMENT |
|-----|------------------|------------|-------|----------|
| **SUPERADMIN** | CRUD | CRUD | CRUD | CRUD |
| **DIRECTOR** | R | R | R | R |
| **FINANZAS** | R | - | - | - |
| **SECRETARIA** | - | - | - | - |
| **DOCENTE** | - | CRUD | CRUD | R |
| **PRECEPTOR** | - | - | - | - |
| **ALUMNO** | - | - | - | - |

### 8.3 Funciones de permisos

- `hasPermission(roleCode, entity, permission)` - Verifica permiso específico
- `checkPermission(user, entity, permission)` - Verifica permiso para usuario
- `requirePermission(user, entity, permission)` - Lanza error si no tiene permiso
- `getRolePermissions(roleCode)` - Obtiene todos los permisos de un rol
- `setPermission(roleCode, entity, permissions)` - Crea/actualiza permiso

### 8.4 Permisos faltantes para módulo de reportes

❌ **ACADEMIC_REPORT** - No existe entidad específica
❌ **ATTENDANCE_REPORT** - No existe entidad específica
❌ **INSTITUTIONAL_REPORT** - No existe entidad específica
❌ **REPORTS_EXPORT** - No existe permiso específico para exportación

---

## 9. Riesgos técnicos detectados

### 9.1 Riesgos de arquitectura

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| **Duplicación de lógica de reportes** | Alta | Consolidar en servicios centralizados |
| **Exportación sin templates profesionales** | Media | Implementar sistema de templates |
| **Falta de filtros avanzados** | Media | Agregar filtros por carrera, período, locación |
| **Performance en queries complejas** | Alta | Implementar índices y optimización |
| **Sin caché de reportes pesados** | Media | Implementar caché para reportes frecuentes |

### 9.2 Riesgos de seguridad

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| **Exportación sin validación de permisos** | Alta | Validar permisos en cada endpoint |
| **Exposición de datos sensibles en CSV** | Alta | Sanitizar datos sensibles antes de exportar |
| **Sin rate limiting en exportación** | Media | Implementar rate limiting |
| **Auditoría incompleta** | Media | Asegurar auditoría en todas las exportaciones |

### 9.3 Riesgos de datos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| **Inconsistencia en StudentSubjectStatus** | Alta | Validar datos antes de reportar |
| **Datos financieros sin reconciliación** | Media | Implementar validaciones de integridad |
| **Asistencia sin justificaciones tipificadas** | Baja | Documentar limitación |
| **Historial incompleto de cambios** | Media | Usar AuditLog para tracking |

---

## 10. Reglas de seguridad y permisos recomendadas

### 10.1 Nuevas entidades de permisos propuestas

```typescript
'ACADEMIC_REPORT'      // Reportes académicos
'ATTENDANCE_REPORT'    // Reportes de asistencia
'INSTITUTIONAL_REPORT' // Reportes institucionales
'REPORTS_EXPORT'       // Exportación de reportes
```

### 10.2 Permisos recomendados por rol

| Rol | ACADEMIC_REPORT | ATTENDANCE_REPORT | INSTITUTIONAL_REPORT | REPORTS_EXPORT |
|-----|-----------------|------------------|---------------------|----------------|
| **SUPERADMIN** | CRUD | CRUD | CRUD | CRUD |
| **DIRECTOR** | R | R | R | R |
| **SECRETARIA** | R | R | - | R |
| **FINANZAS** | - | - | R | R |
| **DOCENTE** | R (sus materias) | R (sus materias) | - | R (sus materias) |
| **PRECEPTOR** | R (sus alumnos) | R (sus alumnos) | - | R (sus alumnos) |
| **ALUMNO** | R (sus datos) | R (sus datos) | - | R (sus datos) |

### 10.3 Reglas de ownership

- **Alumnos:** Solo pueden ver sus propios datos académicos/financieros
- **Docentes:** Solo pueden ver datos de sus materias asignadas
- **Preceptores:** Solo pueden ver datos de sus alumnos asignados
- **Finanzas:** Solo pueden ver datos financieros, no académicos
- **Secretaría:** Solo pueden ver datos académicos, no financieros

### 10.4 Validación de location

- **Usuarios con locationPermissions:** Solo ven datos de sus sedes asignadas
- **SUPERADMIN:** Ve todos los datos de todas las sedes
- **Reportes globales:** Deben respetar filtros de location

---

## 11. Propuesta de arquitectura del módulo

### 11.1 Estructura de servicios

```
src/lib/server/services/reports/
├── academic-report.service.ts (existente, expandir)
├── financial-report.service.ts (existente, expandir)
├── attendance-report.service.ts (nuevo)
├── institutional-report.service.ts (nuevo)
├── export/
│   ├── csv-export.service.ts (nuevo, consolidar)
│   ├── pdf-export.service.ts (nuevo, con templates)
│   └── excel-export.service.ts (nuevo, con formato)
└── helpers/
    ├── report-filters.ts (nuevo)
    ├── report-aggregations.ts (nuevo)
    └── report-cache.ts (nuevo)
```

### 11.2 Estructura de rutas

```
src/routes/(app)/reportes/
├── +page.server.ts (existente, expandir)
├── +page.svelte (existente, expandir)
├── academic/
│   ├── +page.server.ts (existente, expandir con filtros)
│   ├── +page.svelte (existente, expandir)
│   ├── export.pdf/+server.ts (existente, mejorar)
│   └── export.xlsx/+server.ts (existente, mejorar)
├── financial/
│   ├── +page.server.ts (existente, expandir con filtros)
│   ├── +page.svelte (existente, expandir)
│   ├── export.pdf/+server.ts (nuevo)
│   └── export.xlsx/+server.ts (nuevo)
├── attendance/
│   ├── +page.server.ts (nuevo)
│   ├── +page.svelte (nuevo)
│   ├── export.pdf/+server.ts (nuevo)
│   └── export.xlsx/+server.ts (nuevo)
└── institutional/
    ├── +page.server.ts (nuevo)
    ├── +page.svelte (nuevo)
    ├── export.pdf/+server.ts (nuevo)
    └── export.xlsx/+server.ts (nuevo)
```

### 11.3 Separación de responsabilidades

- **Services:** Lógica de negocio, queries Prisma, agregaciones
- **Routes:** Validación de permisos, ownership, location
- **Export Services:** Generación de archivos (CSV, PDF, Excel)
- **Helpers:** Filtros, caché, utilidades comunes

### 11.4 Estrategia de caché

- **Reportes pesados:** Caché por 5-15 minutos
- **KPIs institucionales:** Caché por 1 hora
- **Reportes individuales:** Sin caché (datos en tiempo real)
- **Invalidación:** Manual por acción administrativa

---

## 12. Propuesta de fases futuras

### Fase 1: Base server-side de reportes

**Objetivo:** Consolidar y expandir servicios de reportes existentes

**Tareas:**
- Expandir `academic-report.service.ts` con filtros (carrera, período, año)
- Expandir `financial-report.service.ts` con filtros avanzados
- Crear `attendance-report.service.ts` con reportes de asistencia
- Crear `institutional-report.service.ts` con KPIs institucionales
- Crear `report-filters.ts` con utilidades de filtrado
- Crear `report-aggregations.ts` con funciones de agregación reutilizables
- Scripts de prueba para cada servicio
- Sin UI todavía
- Sin SQL raw
- Sin cambios de schema

**Entregables:**
- Servicios expandidos y nuevos
- Scripts de prueba
- Documentación de APIs

### Fase 2: Endpoints protegidos

**Objetivo:** Crear endpoints para cada tipo de reporte con validación de permisos

**Tareas:**
- Crear endpoints para reportes académicos con filtros
- Crear endpoints para reportes financieros con filtros
- Crear endpoints para reportes de asistencia
- Crear endpoints para KPIs institucionales
- Validación de permisos granulares (ACADEMIC_REPORT, ATTENDANCE_REPORT, INSTITUTIONAL_REPORT)
- Validación de ownership (alumnos, docentes, preceptores)
- Validación de location permissions
- Auditoría de consultas de reportes
- Rate limiting para endpoints pesados

**Entregables:**
- Endpoints protegidos
- Validación de permisos
- Auditoría
- Documentación de endpoints

### Fase 3: UI de reportes

**Objetivo:** Crear interfaz unificada de reportes con filtros y visualizaciones

**Tareas:**
- Dashboard general de reportes (expandir `/reportes`)
- UI para reportes académicos con filtros (carrera, período, año)
- UI para reportes financieros con filtros (período, método, estado)
- UI para reportes de asistencia con filtros (materia, período, alumno)
- UI para KPIs institucionales con tarjetas
- Tablas con paginación y ordenamiento
- Filtros reactivos
- Indicadores de carga
- Manejo de errores
- Responsive design

**Entregables:**
- UI de reportes
- Componentes reutilizables
- Documentación de UI

### Fase 4: Exportación mejorada

**Objetivo:** Implementar exportación profesional con templates

**Tareas:**
- Consolidar exportación CSV en `csv-export.service.ts`
- Crear `pdf-export.service.ts` con templates profesionales
- Crear `excel-export.service.ts` con formato avanzado
- Templates PDF con header institucional, footer, logos
- Excel con múltiples hojas, gráficos, tablas dinámicas
- Validación de permisos REPORTS_EXPORT
- Auditoría de todas las exportaciones
- Sanitización de datos sensibles

**Entregables:**
- Servicios de exportación consolidados
- Templates profesionales
- Validación de permisos
- Auditoría

### Fase 5: Dashboard institucional

**Objetivo:** Crear dashboard de KPIs institucionales con visualizaciones

**Tareas:**
- Dashboard principal con KPIs clave (alumnos, deuda, asistencia, documentos)
- Gráficos de evolución temporal (matrícula, ingresos, asistencia)
- Tarjetas de alertas (morosidad, baja asistencia, bloqueos)
- Filtros por período y location
- Actualización en tiempo real (caché corto)
- Responsive design
- Exportación de dashboard

**Entregables:**
- Dashboard institucional
- Visualizaciones
- Documentación

### Fase 6: Auditoría, performance y cierre

**Objetivo:** Optimizar performance, validar seguridad, documentar

**Tareas:**
- Análisis de performance de queries pesadas
- Agregar índices si es necesario
- Optimizar agregaciones complejas
- Validar seguridad de todos los endpoints
- Validar auditoría completa
- Tests de carga para endpoints críticos
- Documentación final del módulo
- Guía de uso para administradores

**Entregables:**
- Optimizaciones de performance
- Validación de seguridad
- Documentación final
- Guía de uso

---

## 13. Conclusiones

### 13.1 Estado actual

**Fortalezas:**
- ✅ Schema robusto con modelos completos para académico, financiero, asistencia
- ✅ Servicios de reportes financieros ya implementados y funcionales
- ✅ Sistema de permisos granulares robusto
- ✅ Auditoría implementada para acciones sensibles
- ✅ Exportación CSV, PDF, Excel ya funcional
- ✅ Módulos financieros y de gestión documental cerrados

**Debilidades:**
- ❌ Reportes académicos limitados sin filtros
- ❌ No existe servicio de reportes de asistencia
- ❌ No existe dashboard de KPIs institucionales
- ❌ Exportación sin templates profesionales
- ❌ Faltan permisos específicos para reportes
- ❌ Sin caché para reportes pesados
- ❌ Dashboard institucional con métricas limitadas

### 13.2 Recomendaciones

1. **Priorizar Fase 1:** Consolidar servicios existentes y crear servicios faltantes
2. **No duplicar lógica:** Reutilizar servicios financieros existentes
3. **Respetar módulos cerrados:** No modificar Convenios de Pago ni Gestión Documental
4. **Implementar permisos:** Agregar entidades ACADEMIC_REPORT, ATTENDANCE_REPORT, INSTITUTIONAL_REPORT
5. **Validar ownership:** Asegurar que cada rol solo vea sus datos permitidos
6. **Optimizar performance:** Implementar caché y revisar índices
7. **Mejorar exportación:** Implementar templates profesionales
8. **Auditoría completa:** Asegurar tracking de todas las consultas y exportaciones

### 13.3 Próximos pasos

1. **Aprobar este diagnóstico** con el usuario
2. **Definir prioridades** de fases según necesidades del negocio
3. **Comenzar Fase 1** con expansión de servicios existentes
4. **Validar permisos** antes de implementar endpoints
5. **Implementar tests** para cada servicio antes de UI

---

**Documento preparado por:** Cascade AI Assistant
**Fecha:** 30/06/2026
**Versión:** 1.0
