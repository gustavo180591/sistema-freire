# REPORTES - Fase 1: Base server-side de reportes

**Fecha:** 30/06/2026
**Estado:** Implementación completada
**Objetivo:** Crear la base interna del módulo de reportes sin UI ni endpoints públicos

---

## 1. Resumen de implementación

### 1.1 Archivos creados

```
src/lib/server/reports/
├── reports.types.ts                    # Tipos compartidos
├── institutional-reports.service.ts   # KPIs institucionales
├── financial-reports.service.ts       # Reportes financieros
├── academic-reports.service.ts        # Reportes académicos
├── attendance-reports.service.ts      # Reportes de asistencia
└── reports.service.ts                 # Export consolidado

scripts/
└── test-reports-services.ts           # Script de pruebas
```

### 1.2 Servicios implementados

| Servicio | Función principal | Métricas |
|----------|-------------------|-----------|
| **InstitutionalReportsService** | KPIs globales del sistema | 18 métricas |
| **FinancialReportsService** | Reportes financieros con filtros | 12 métricas |
| **AcademicReportsService** | Reportes académicos con filtros | 16 métricas |
| **AttendanceReportsService** | Reportes de asistencia con filtros | 9 métricas |

---

## 2. Tipos compartidos

### 2.1 InstitutionalMetrics

```typescript
export type InstitutionalMetrics = {
	totalStudents: number;
	activeStudents: number;
	totalTeachers: number;
	activeTeachers: number;
	totalUsers: number;
	activeUsers: number;
	totalDocuments: number;
	documentsByCategory: Record<string, number>;
	totalCareers: number;
	activeCareers: number;
	totalSubjects: number;
	activeSubjects: number;
	totalDebt: number;
	totalCollected: number;
	totalPending: number;
	overdueDebt: number;
	averageAttendance: number;
	lowAttendanceCount: number;
};
```

### 2.2 FinancialReportMetrics

```typescript
export type FinancialReportMetrics = {
	totalCharges: number;
	totalPaid: number;
	totalPending: number;
	overdueDebt: number;
	studentsWithDebt: number;
	paymentsCount: number;
	totalCollected: number;
	receiptsIssued: number;
	receiptsCancelled: number;
	activeAgreements: number;
	overdueAgreements: number;
	defaultedAgreements: number;
};
```

### 2.3 AcademicReportMetrics

```typescript
export type AcademicReportMetrics = {
	totalStudents: number;
	activeStudents: number;
	studentsByCareer: Record<string, number>;
	studentsByStatus: Record<string, number>;
	totalSubjects: number;
	activeSubjects: number;
	totalTeachers: number;
	activeTeachers: number;
	totalCommissions: number;
	activeCommissions: number;
	totalEvaluations: number;
	totalGrades: number;
	averageGrade: number;
	regularCount: number;
	libreCount: number;
	riskStudents: number;
};
```

### 2.4 AttendanceReportMetrics

```typescript
export type AttendanceReportMetrics = {
	totalAttendanceRecords: number;
	totalAttendanceEntries: number;
	presentCount: number;
	absentCount: number;
	justifiedCount: number;
	unjustifiedCount: number;
	averageAttendance: number;
	averageBySubject: Record<string, number>;
	averageByCommission: Record<string, number>;
};
```

### 2.5 ReportFilters

```typescript
export type ReportFilters = {
	careerId?: string;
	subjectId?: string;
	commissionId?: string;
	studentId?: string;
	teacherId?: string;
	startDate?: Date;
	endDate?: Date;
	locationId?: string;
};
```

### 2.6 ReportResult

```typescript
export type ReportResult<T> = {
	data: T;
	generatedAt: Date;
	recordCount: number;
};
```

---

## 3. InstitutionalReportsService

### 3.1 Función principal

```typescript
export async function getInstitutionalMetrics(): Promise<ReportResult<InstitutionalMetrics>>
```

### 3.2 Métricas implementadas

**Académicas:**
- `totalStudents` - Total de alumnos
- `activeStudents` - Alumnos activos
- `totalTeachers` - Total de docentes
- `activeTeachers` - Docentes activos
- `totalCareers` - Total de carreras
- `activeCareers` - Carreras activas
- `totalSubjects` - Total de materias
- `activeSubjects` - Materias activas

**Institucionales:**
- `totalUsers` - Total de usuarios
- `activeUsers` - Usuarios activos
- `totalDocuments` - Total de documentos
- `documentsByCategory` - Documentos por categoría

**Financieras:**
- `totalDebt` - Deuda total
- `totalCollected` - Total cobrado
- `totalPending` - Deuda pendiente
- `overdueDebt` - Deuda vencida

**Asistencia:**
- `averageAttendance` - Asistencia promedio
- `lowAttendanceCount` - Alumnos con baja asistencia (< 75%)

### 3.3 Funciones auxiliares

- `getTotalDebt()` - Suma de StudentCharge.amount
- `getTotalCollected()` - Suma de Payment.amount
- `getTotalPending()` - Suma de saldos pendientes
- `getOverdueDebt()` - Suma de deuda vencida
- `getAverageAttendance()` - Promedio de StudentSubjectStatus.attendancePercent
- `getLowAttendanceCount()` - Conteo de alumnos con asistencia < 75%

### 3.4 Modelos utilizados

- Student, Teacher, User, Document, Career, Subject
- StudentCharge, Payment
- StudentSubjectStatus

---

## 4. FinancialReportsService

### 4.1 Función principal

```typescript
export async function getFinancialReportMetrics(
	filters?: ReportFilters
): Promise<ReportResult<FinancialReportMetrics>>
```

### 4.2 Métricas implementadas

**Cargos y Pagos:**
- `totalCharges` - Total de cuotas generadas
- `totalPaid` - Total pagado
- `totalPending` - Deuda pendiente
- `overdueDebt` - Deuda vencida
- `studentsWithDebt` - Alumnos con deuda
- `paymentsCount` - Cantidad de pagos
- `totalCollected` - Total cobrado

**Recibos:**
- `receiptsIssued` - Recibos emitidos
- `receiptsCancelled` - Recibos anulados

**Convenios de Pago (reutilizando módulo existente):**
- `activeAgreements` - Convenios activos
- `overdueAgreements` - Convenios vencidos
- `defaultedAgreements` - Convenios incumplidos

### 4.3 Filtros soportados

- `studentId` - Filtrar por alumno
- `startDate` - Fecha desde
- `endDate` - Fecha hasta

### 4.4 Funciones auxiliares

- `getTotalCharges(filters)` - Total de cargos con filtros
- `getTotalPaid(filters)` - Total pagado con filtros
- `getTotalPending(filters)` - Deuda pendiente con filtros
- `getOverdueDebt(filters)` - Deuda vencida con filtros
- `getStudentsWithDebt(filters)` - Alumnos con deuda con filtros
- `getPaymentsCount(filters)` - Conteo de pagos con filtros
- `getTotalCollected(filters)` - Total cobrado con filtros
- `getReceiptsIssued(filters)` - Recibos emitidos con filtros
- `getReceiptsCancelled(filters)` - Recibos anulados con filtros
- `getActiveAgreements(filters)` - Convenios activos con filtros
- `getOverdueAgreements(filters)` - Convenios vencidos con filtros
- `getDefaultedAgreements(filters)` - Convenios incumplidos con filtros

### 4.5 Builders de filtros

- `buildChargeWhere(filters)` - Where clause para StudentCharge
- `buildPaymentWhere(filters)` - Where clause para Payment
- `buildReceiptWhere(filters)` - Where clause para Receipt
- `buildAgreementWhere(filters)` - Where clause para PaymentAgreement

### 4.6 Modelos utilizados

- StudentCharge, Payment, PaymentAllocation
- Receipt, ReceiptItem
- PaymentAgreement, PaymentAgreementInstallment (módulo existente)

### 4.7 Integración con Convenios de Pago

Reutiliza lógica existente del módulo Convenios de Pago sin duplicar código:
- Consulta directa a PaymentAgreement
- Estados: ACTIVE, OVERDUE, DEFAULTED
- Sin modificar lógica del módulo existente

---

## 5. AcademicReportsService

### 5.1 Función principal

```typescript
export async function getAcademicReportMetrics(
	filters?: ReportFilters
): Promise<ReportResult<AcademicReportMetrics>>
```

### 5.2 Métricas implementadas

**Alumnos:**
- `totalStudents` - Total de alumnos
- `activeStudents` - Alumnos activos
- `studentsByCareer` - Alumnos por carrera
- `studentsByStatus` - Alumnos por estado

**Materias y Docentes:**
- `totalSubjects` - Total de materias
- `activeSubjects` - Materias activas
- `totalTeachers` - Total de docentes
- `activeTeachers` - Docentes activos

**Comisiones:**
- `totalCommissions` - Total de comisiones
- `activeCommissions` - Comisiones activas

**Evaluaciones y Calificaciones:**
- `totalEvaluations` - Total de evaluaciones
- `totalGrades` - Total de calificaciones
- `averageGrade` - Promedio de calificaciones

**Regularidad y Riesgo:**
- `regularCount` - Alumnos regulares
- `libreCount` - Alumnos libres
- `riskStudents` - Alumnos en riesgo (asistencia < 75%)

### 5.3 Filtros soportados

- `careerId` - Filtrar por carrera
- `subjectId` - Filtrar por materia
- `studentId` - Filtrar por alumno

### 5.4 Funciones auxiliares

- `getTotalStudents(filters)` - Total de alumnos con filtros
- `getActiveStudents(filters)` - Alumnos activos con filtros
- `getStudentsByCareer(filters)` - Alumnos agrupados por carrera
- `getStudentsByStatus(filters)` - Alumnos agrupados por estado
- `getTotalSubjects(filters)` - Total de materias con filtros
- `getActiveSubjects(filters)` - Materias activas con filtros
- `getTotalTeachers(filters)` - Total de docentes
- `getActiveTeachers(filters)` - Docentes activos
- `getTotalCommissions(filters)` - Total de comisiones con filtros
- `getActiveCommissions(filters)` - Comisiones activas con filtros
- `getTotalEvaluations(filters)` - Total de evaluaciones con filtros
- `getTotalGrades(filters)` - Total de calificaciones con filtros
- `getAverageGrade(filters)` - Promedio de calificaciones con filtros
- `getRegularCount(filters)` - Alumnos regulares con filtros
- `getLibreCount(filters)` - Alumnos libres con filtros
- `getRiskStudents(filters)` - Alumnos en riesgo con filtros

### 5.5 Builders de filtros

- `buildStudentWhere(filters)` - Where clause para Student
- `buildSubjectWhere(filters)` - Where clause para Subject
- `buildCommissionWhere(filters)` - Where clause para SubjectCommission
- `buildEvaluationWhere(filters)` - Where clause para Evaluation
- `buildGradeWhere(filters)` - Where clause para Grade
- `buildStudentSubjectStatusWhere(filters)` - Where clause para StudentSubjectStatus

### 5.6 Modelos utilizados

- Student, Career, Subject, SubjectCommission
- Teacher, SubjectTeacher
- Evaluation, Grade
- StudentSubjectStatus

---

## 6. AttendanceReportsService

### 6.1 Función principal

```typescript
export async function getAttendanceReportMetrics(
	filters?: ReportFilters
): Promise<ReportResult<AttendanceReportMetrics>>
```

### 6.2 Métricas implementadas

**Registros y Entradas:**
- `totalAttendanceRecords` - Total de registros de clase
- `totalAttendanceEntries` - Total de entradas de asistencia

**Asistencia:**
- `presentCount` - Total de presentes
- `absentCount` - Total de ausentes
- `justifiedCount` - Ausencias justificadas (con notas)
- `unjustifiedCount` - Ausencias no justificadas (sin notas)
- `averageAttendance` - Porcentaje promedio de asistencia

**Promedios por entidad:**
- `averageBySubject` - Promedio de asistencia por materia
- `averageByCommission` - Promedio de asistencia por comisión

### 6.3 Filtros soportados

- `studentId` - Filtrar por alumno
- `subjectId` - Filtrar por materia
- `commissionId` - Filtrar por comisión
- `startDate` - Fecha desde
- `endDate` - Fecha hasta

### 6.4 Funciones auxiliares

- `getTotalAttendanceRecords(filters)` - Total de registros con filtros
- `getTotalAttendanceEntries(filters)` - Total de entradas con filtros
- `getPresentCount(filters)` - Conteo de presentes con filtros
- `getAbsentCount(filters)` - Conteo de ausentes con filtros
- `getJustifiedCount(filters)` - Ausencias justificadas con filtros
- `getUnjustifiedCount(filters)` - Ausencias no justificadas con filtros
- `getAverageAttendance(filters)` - Promedio de asistencia con filtros
- `getAverageBySubject(filters)` - Promedio por materia
- `getAverageByCommission(filters)` - Promedio por comisión

### 6.5 Builders de filtros

- `buildAttendanceRecordWhere(filters)` - Where clause para AttendanceRecord
- `buildAttendanceEntryWhere(filters)` - Where clause para AttendanceEntry

### 6.6 Modelos utilizados

- AttendanceRecord, AttendanceEntry
- Subject, SubjectCommission

### 6.7 Limitaciones documentadas

- **Justificaciones por tipo:** No existe modelo de tipos de justificación, se asume justificado si `notes` no es null
- **Historial de cambios:** No existe tracking de modificaciones en asistencia
- **Performance en promedios por entidad:** `getAverageBySubject` y `getAverageByCommission` hacen queries individuales por registro, podría optimizarse en fases futuras

---

## 7. Script de pruebas

### 7.1 Test implementados

| Test | Descripción |
|------|-------------|
| **Institutional Metrics** | Verifica métricas institucionales |
| **Financial Reports (No Filters)** | Verifica métricas financieras sin filtros |
| **Financial Reports (Date Filter)** | Verifica métricas financieras con filtro de fecha |
| **Academic Reports (No Filters)** | Verifica métricas académicas sin filtros |
| **Academic Reports (Career Filter)** | Verifica métricas académicas con filtro de carrera |
| **Attendance Reports (No Filters)** | Verifica métricas de asistencia sin filtros |
| **Attendance Reports (Date Filter)** | Verifica métricas de asistencia con filtro de fecha |
| **ReportResult Structure** | Verifica estructura de ReportResult |
| **Payment Agreements Integration** | Verifica integración con Convenios de Pago |
| **Academic Regularity Metrics** | Verifica métricas de regularidad académica |

### 7.2 Ejecución

```bash
npx tsx scripts/test-reports-services.ts
```

### 7.3 Resultado esperado

- 10 tests
- Todos deben pasar
- Output con métricas de cada servicio
- Resumen final con conteo de tests pasados/fallados

---

## 8. Reglas cumplidas

### 8.1 Patrones prohibidos NO utilizados

- ✅ Sin `$queryRaw`
- ✅ Sin `$executeRaw`
- ✅ Sin `any`
- ✅ Sin `as any`
- ✅ Sin `@ts-ignore`
- ✅ Sin `@ts-expect-error`

### 8.2 Comandos prohibidos NO ejecutados

- ✅ Sin `npx prisma db push`
- ✅ Sin `npx prisma migrate reset`
- ✅ Sin `npx prisma migrate resolve`

### 8.3 Implementaciones NO realizadas

- ✅ Sin UI
- ✅ Sin endpoints públicos
- ✅ Sin gráficos
- ✅ Sin exportación nueva
- ✅ Sin cambios de schema
- ✅ Sin migraciones
- ✅ Sin nuevos permisos en base
- ✅ Sin cambios en módulos existentes

---

## 9. Validaciones ejecutadas

```bash
npx prisma format        # ✅ Schema formateado
npx prisma validate      # ✅ Schema válido
npx prisma generate      # ✅ Prisma Client generado
npx prisma migrate status # ✅ Schema actualizado (33 migrations)
npm run check            # ✅ 0 errores, 104 warnings (warnings de a11y/state, no críticos)
npm run build            # ✅ Build exitoso
npx tsx scripts/test-reports-services.ts # ✅ Pruebas pasan
```

### 9.1 Verificación de patrones prohibidos

```bash
git diff -U0 | grep -E "^\+.*(\$queryRaw|\$executeRaw|@ts-ignore|@ts-expect-error|: any|as any)" || true
# Resultado: vacío ✅
```

```bash
grep -R "\$queryRaw\|\$executeRaw\|@ts-ignore\|@ts-expect-error\|: any\|as any" \
  src/lib/server/reports \
  scripts/test-reports-services.ts || true
# Resultado: vacío ✅
```

---

## 10. Estado del repositorio

### 10.1 Archivos creados

```
src/lib/server/reports/reports.types.ts
src/lib/server/reports/institutional-reports.service.ts
src/lib/server/reports/financial-reports.service.ts
src/lib/server/reports/academic-reports.service.ts
src/lib/server/reports/attendance-reports.service.ts
src/lib/server/reports/reports.service.ts
scripts/test-reports-services.ts
docs/REPORTS_MODULE_PHASE_1_SERVER_SERVICES.md
```

### 10.2 Archivos modificados

- Ninguno

### 10.3 Schema y migraciones

- Sin cambios de schema
- Sin nuevas migraciones
- 33 migrations existentes, todas aplicadas

---

## 11. Limitaciones encontradas

### 11.1 Asistencia

- **Justificaciones por tipo:** No existe modelo de tipos de justificación, se asume justificado si `notes` no es null
- **Historial de cambios:** No existe tracking de modificaciones en asistencia
- **Performance en promedios por entidad:** Queries individuales por registro, podría optimizarse

### 11.2 Académico

- **Certificados emitidos:** No existe modelo de certificados académicos emitidos
- **Correlatividades cumplidas:** SubjectCorrelative existe pero no tracking de cumplimiento
- **Evolución de matrícula histórica:** Requiere agregación temporal por año

### 11.3 Financiero

- **Proyección de ingresos:** Requiere modelo de presupuestos
- **Análisis de morosidad por cohorte:** Requiere agrupación temporal compleja
- **Comparación interanual:** Requiere data histórica consolidada

### 11.4 Institucional

- **Tasa de deserción:** Requiere tracking de egresos/deserciones
- **Tasa de aprobación:** Requiere consolidación de StudentSubjectStatus
- **Índice de satisfacción:** No existe modelo de encuestas

---

## 12. Próximos pasos (Fase 2)

### 12.1 Endpoints protegidos

- Crear endpoints para cada tipo de reporte
- Validación de permisos granulares (ACADEMIC_REPORT, ATTENDANCE_REPORT, INSTITUTIONAL_REPORT)
- Validación de ownership (alumnos, docentes, preceptores)
- Validación de location permissions
- Auditoría de consultas de reportes
- Rate limiting para endpoints pesados

### 12.2 Permisos a agregar

```typescript
'ACADEMIC_REPORT'      // Reportes académicos
'ATTENDANCE_REPORT'    // Reportes de asistencia
'INSTITUTIONAL_REPORT' // Reportes institucionales
'REPORTS_EXPORT'       // Exportación de reportes
```

---

## 13. Conclusión

La Fase 1 del Módulo de Reportes ha sido implementada exitosamente con:

- ✅ Tipos compartidos para todos los reportes
- ✅ Servicio de métricas institucionales (18 KPIs)
- ✅ Servicio de reportes financieros (12 métricas) con integración a Convenios de Pago
- ✅ Servicio de reportes académicos (16 métricas) con filtros
- ✅ Servicio de reportes de asistencia (9 métricas) con filtros
- ✅ Script de pruebas con 10 tests
- ✅ Sin cambios de schema
- ✅ Sin migraciones
- ✅ Sin patrones prohibidos
- ✅ Validaciones exitosas

La implementación sigue las mejores prácticas de:
- Separación de responsabilidades (servicios especializados)
- Tipado fuerte de TypeScript
- Reutilización de lógica existente (Convenios de Pago)
- Documentación completa
- Pruebas funcionales
- Sin dependencias nuevas

---

**Documento preparado por:** Cascade AI Assistant
**Fecha:** 30/06/2026
**Versión:** 1.0
