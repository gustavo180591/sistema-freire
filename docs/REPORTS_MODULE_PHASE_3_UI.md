# REPORTES - Fase 3: UI de reportes

**Fecha:** 30/06/2026
**Estado:** Implementación completada
**Objetivo:** Crear interfaz protegida para consultar reportes institucionales, financieros, académicos y de asistencia

---

## 1. Resumen de implementación

### 1.1 Archivos creados

```
src/routes/(app)/reportes/dashboard/
├── +page.server.ts              # Server load con validación de sesión
└── +page.svelte                 # Página principal con tabs

src/lib/components/reports/
├── ReportKpiCard.svelte        # Componente de tarjeta KPI
├── ReportSectionTabs.svelte     # Componente de tabs de sección
├── InstitutionalReportsPanel.svelte    # Panel de reportes institucionales
├── FinancialReportsPanel.svelte       # Panel de reportes financieros
├── AcademicReportsPanel.svelte        # Panel de reportes académicos
├── AttendanceReportsPanel.svelte      # Panel de reportes de asistencia
├── ReportErrorState.svelte      # Componente de estado de error
└── ReportLoadingState.svelte    # Componente de estado de carga

scripts/
└── test-reports-ui.ts           # Script de pruebas de UI
```

### 1.2 Rutas implementadas

| Ruta                  | Propósito                      |
| --------------------- | ------------------------------ |
| `/reportes/dashboard` | Dashboard de reportes con tabs |

**Nota sobre la ruta:** Se implementó en `/reportes/dashboard` en lugar de `/reportes` porque la ruta `/reportes` ya existe con una página de navegación a reportes existentes (académico, financiero, oficiales, recibos). El dashboard de Fase 3 complementa esa navegación existente con una vista unificada de métricas en tiempo real.

---

## 2. Protección de página

### 2.1 `+page.server.ts`

**Propósito:** Validar sesión y redirigir si no autenticado

**Implementación:**

```typescript
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	return {
		title: 'Dashboard de Reportes'
	};
};
```

**Validaciones:**

- ✅ Verifica `locals.user`
- ✅ Redirige a `/login` si no autenticado
- ✅ No consulta reportes desde server load
- ✅ Deja que la UI consuma endpoints protegidos

---

## 3. Página principal

### 3.1 `+page.svelte`

**Propósito:** Orquestar tabs y paneles de reportes

**Características:**

- Tabs para Institucional, Financiero, Académico, Asistencia
- Estado de carga global
- Estado de error global
- Manejo de errores desde paneles
- Banner de error con acción de cerrar

**Implementación:**

```typescript
type Tab = 'institutional' | 'financial' | 'academic' | 'attendance';
let activeTab = $state<Tab>('institutional');
let loading = $state(false);
let error = $state<string | null>(null);
```

---

## 4. Componentes de reportes

### 4.1 `ReportKpiCard.svelte`

**Propósito:** Mostrar una tarjeta de KPI con label, valor y descripción opcional

**Props:**

- `label: string` - Etiqueta del KPI
- `value: string | number` - Valor del KPI
- `description?: string` - Descripción opcional

**Uso:**

```svelte
<ReportKpiCard label="Alumnos Totales" value={metrics.totalStudents} />
<ReportKpiCard label="Deuda Total" value={formatCurrency(metrics.totalDebt)} />
```

### 4.2 `ReportSectionTabs.svelte`

**Propósito:** Navegación entre secciones de reportes

**Props:**

- `activeTab: Tab` - Tab activo
- `onTabChange: (tab: Tab) => void` - Callback al cambiar tab

**Tabs:**

- Institucional
- Financiero
- Académico
- Asistencia

### 4.3 `ReportErrorState.svelte`

**Propósito:** Mostrar estado de error con icono y mensaje

**Props:**

- `message?: string` - Mensaje de error (default: "Error al cargar el reporte")

### 4.4 `ReportLoadingState.svelte`

**Propósito:** Mostrar estado de carga con spinner

**Props:**

- `message?: string` - Mensaje de carga (default: "Cargando reporte...")

---

## 5. Paneles de reportes

### 5.1 `InstitutionalReportsPanel.svelte`

**Propósito:** Consumir endpoint `/api/reports/institutional` y mostrar KPIs

**Props:**

- `onError: (message: string) => void` - Callback de error
- `onLoading: (isLoading: boolean) => void` - Callback de carga

**KPIs mostrados:**

- Alumnos Totales
- Alumnos Activos
- Docentes
- Documentos
- Carreras
- Materias
- Deuda Total
- Cobrado
- Asistencia Promedio
- Baja Asistencia

**Manejo de errores:**

- 401: Redirige a `/login`
- 403: Muestra error "No tienes permiso para ver reportes institucionales (requiere SUPERADMIN)"
- Otros: Muestra error genérico

**Sin filtros:** El endpoint institucional no soporta filtros

### 5.2 `FinancialReportsPanel.svelte`

**Propósito:** Consumir endpoint `/api/reports/financial` con filtros

**Props:**

- `onError: (message: string) => void` - Callback de error
- `onLoading: (isLoading: boolean) => void` - Callback de carga

**Filtros:**

- `studentId` - ID del alumno
- `startDate` - Fecha desde
- `endDate` - Fecha hasta

**KPIs mostrados:**

- Cargos Totales
- Pagado
- Pendiente
- Vencido
- Alumnos con Deuda
- Pagos
- Recibos
- Convenios Activos

**Manejo de errores:**

- 401: Redirige a `/login`
- 403: Muestra error "No tienes permiso para ver reportes financieros (requiere FINANCIAL_REPORT:read)"
- 400: Muestra error de filtros inválidos
- Otros: Muestra error genérico

**Formato:** Usa `Intl.NumberFormat` para moneda ARS

### 5.3 `AcademicReportsPanel.svelte`

**Propósito:** Consumir endpoint `/api/reports/academic` con filtros

**Props:**

- `onError: (message: string) => void` - Callback de error
- `onLoading: (isLoading: boolean) => void` - Callback de carga

**Filtros:**

- `careerId` - ID de la carrera
- `subjectId` - ID de la materia
- `studentId` - ID del alumno

**KPIs mostrados:**

- Alumnos Totales
- Alumnos Activos
- Materias
- Docentes
- Comisiones
- Evaluaciones
- Calificaciones
- Promedio
- Regulares
- Libres
- Alumnos en Riesgo

**Manejo de errores:**

- 401: Redirige a `/login`
- 403: Muestra error "No tienes permiso para ver reportes académicos (requiere GRADE:read)"
- 400: Muestra error de filtros inválidos
- Otros: Muestra error genérico

**Formato:** Usa formato de porcentaje para promedios

### 5.4 `AttendanceReportsPanel.svelte`

**Propósito:** Consumir endpoint `/api/reports/attendance` con filtros

**Props:**

- `onError: (message: string) => void` - Callback de error
- `onLoading: (isLoading: boolean) => void` - Callback de carga

**Filtros:**

- `studentId` - ID del alumno
- `subjectId` - ID de la materia
- `commissionId` - ID de la comisión
- `startDate` - Fecha desde
- `endDate` - Fecha hasta

**KPIs mostrados:**

- Total Registros
- Total Entradas
- Presentes
- Ausentes
- Con Observación (criterio provisional por `notes`)
- Sin Observación
- Asistencia Promedio

**Manejo de errores:**

- 401: Redirige a `/login`
- 403: Muestra error "No tienes permiso para ver reportes de asistencia (requiere ATTENDANCE:read)"
- 400: Muestra error de filtros inválidos
- Otros: Muestra error genérico

**Nota:** "Con Observación" se presenta como criterio provisional, no como justificación formal

---

## 6. Consumo de endpoints

### 6.1 Patrones de fetch

Todos los paneles usan el mismo patrón:

```typescript
const response = await fetch(url);

if (response.status === 401) {
	goto('/login');
	return;
}

if (response.status === 403) {
	onError('No tienes permiso...');
	return;
}

if (response.status === 400) {
	const result = await response.json();
	onError(result.error || 'Filtros inválidos');
	return;
}

if (!response.ok) {
	throw new Error(`Error: ${response.statusText}`);
}

const result = await response.json();
if (result.success) {
	metrics = result.data;
} else {
	onError(result.error || 'Error al cargar reporte');
}
```

### 6.2 Construcción de query params

```typescript
const queryParams = new URLSearchParams();
if (filters.studentId) queryParams.append('studentId', filters.studentId);
if (filters.startDate) queryParams.append('startDate', filters.startDate);
if (filters.endDate) queryParams.append('endDate', filters.endDate);

const queryString = queryParams.toString();
const url = `/api/reports/financial${queryString ? `?${queryString}` : ''}`;
```

---

## 7. Seguridad y arquitectura

### 7.1 No se usa

- ✅ Sin Prisma en componentes
- ✅ Sin Prisma en `+page.svelte`
- ✅ Sin llamadas directas a filesystem
- ✅ Sin `storage/private`
- ✅ Sin `static/uploads`
- ✅ Sin SQL raw
- ✅ Sin `any`
- ✅ Sin `as any`
- ✅ Sin `@ts-ignore`
- ✅ Sin `@ts-expect-error`

### 7.2 No se creó

- ✅ Sin endpoints nuevos
- ✅ Sin migraciones
- ✅ Sin cambios de schema
- ✅ Sin permisos nuevos en base
- ✅ Sin exportación avanzada
- ✅ Sin gráficos con dependencias nuevas
- ✅ Sin PDF/Excel nuevo

### 7.3 Solo se consumen endpoints de Fase 2

- `/api/reports/institutional`
- `/api/reports/financial`
- `/api/reports/academic`
- `/api/reports/attendance`

---

## 8. Script de pruebas UI

### 8.1 `test-reports-ui.ts`

**Tests implementados:**

| Test                                | Descripción                                      |
| ----------------------------------- | ------------------------------------------------ |
| **Dashboard page server exists**    | Verifica existencia de `+page.server.ts`         |
| **Dashboard page svelte exists**    | Verifica existencia de `+page.svelte`            |
| **Validates locals.user**           | Verifica validación de sesión                    |
| **Uses redirect**                   | Verifica uso de redirect                         |
| **Report components exist**         | Verifica existencia de 8 componentes             |
| **Consumes institutional endpoint** | Verifica consumo de `/api/reports/institutional` |
| **Consumes financial endpoint**     | Verifica consumo de `/api/reports/financial`     |
| **Consumes academic endpoint**      | Verifica consumo de `/api/reports/academic`      |
| **Consumes attendance endpoint**    | Verifica consumo de `/api/reports/attendance`    |
| **Uses fetch**                      | Verifica uso de fetch en paneles                 |
| **Handles 401**                     | Verifica manejo de 401                           |
| **Handles 403**                     | Verifica manejo de 403                           |
| **Handles financial filters**       | Verifica filtros financieros                     |
| **Handles academic filters**        | Verifica filtros académicos                      |
| **Handles attendance filters**      | Verifica filtros de asistencia                   |
| **No Prisma in UI**                 | Verifica ausencia de Prisma en UI                |
| **No storage/private in UI**        | Verifica ausencia de storage/private             |
| **No static/uploads in UI**         | Verifica ausencia de static/uploads              |
| **No forbidden patterns**           | Verifica ausencia de patrones prohibidos         |
| **No new API routes**               | Verifica que no se crearon rutas API nuevas      |

**Ejecución:**

```bash
npx tsx scripts/test-reports-ui.ts
```

---

## 9. Reglas cumplidas

### 9.1 Patrones prohibidos NO utilizados

- ✅ Sin `$queryRaw`
- ✅ Sin `$executeRaw`
- ✅ Sin `any`
- ✅ Sin `as any`
- ✅ Sin `@ts-ignore`
- ✅ Sin `@ts-expect-error`

### 9.2 Comandos prohibidos NO ejecutados

- ✅ Sin `npx prisma db push`
- ✅ Sin `npx prisma migrate reset`
- ✅ Sin `npx prisma migrate resolve`

### 9.3 Implementaciones NO realizadas

- ✅ Sin UI para exportación
- ✅ Sin gráficos
- ✅ Sin exportación PDF/Excel/CSV nueva
- ✅ Sin cambios de schema
- ✅ Sin migraciones
- ✅ Sin nuevos permisos en base
- ✅ Sin cambios operativos en Convenios de Pago
- ✅ Sin batch jobs
- ✅ Sin cron
- ✅ Sin cache
- ✅ Sin índices

---

## 10. Validaciones ejecutadas

```bash
npx prisma format        # ✅ Schema formateado
npx prisma validate      # ✅ Schema válido
npx prisma generate      # ✅ Prisma Client generado
npx prisma migrate status # ✅ Schema actualizado (33 migrations)
npm run check            # ✅ 0 errores, 104 warnings (warnings de a11y/state, no críticos)
npm run build            # ✅ Build exitoso
npx tsx scripts/test-reports-services.ts # ✅ Pruebas de servicios pasan
npx tsx scripts/test-reports-endpoints.ts # ✅ Pruebas de endpoints pasan
npx tsx scripts/test-reports-ui.ts # ✅ Pruebas de UI pasan
```

### 10.1 Verificación de patrones prohibidos

```bash
git diff -U0 | grep -E "^\+.*(\$queryRaw|\$executeRaw|@ts-ignore|@ts-expect-error|: any|as any)" || true
# Resultado: vacío ✅
```

```bash
git diff --name-only --diff-filter=AM | grep -E '\.(ts|svelte)$' | xargs grep -n "\$queryRaw\|\$executeRaw\|@ts-ignore\|@ts-expect-error\|: any\|as any" || true
# Resultado: vacío ✅
```

---

## 11. Estado del repositorio

### 11.1 Archivos creados

```
src/routes/(app)/reportes/dashboard/+page.server.ts
src/routes/(app)/reportes/dashboard/+page.svelte
src/lib/components/reports/ReportKpiCard.svelte
src/lib/components/reports/ReportSectionTabs.svelte
src/lib/components/reports/InstitutionalReportsPanel.svelte
src/lib/components/reports/FinancialReportsPanel.svelte
src/lib/components/reports/AcademicReportsPanel.svelte
src/lib/components/reports/AttendanceReportsPanel.svelte
src/lib/components/reports/ReportErrorState.svelte
src/lib/components/reports/ReportLoadingState.svelte
scripts/test-reports-ui.ts
docs/REPORTS_MODULE_PHASE_3_UI.md
```

### 11.2 Archivos modificados

- Ninguno

### 11.3 Schema y migraciones

- Sin cambios de schema
- Sin nuevas migraciones
- 33 migrations existentes, todas aplicadas

---

## 12. Confirmaciones de seguridad

### 12.1 Validación de sesión

- ✅ `+page.server.ts` verifica `locals.user`
- ✅ Redirige a `/login` si no autenticado

### 12.2 No uso de Prisma en UI

- ✅ Ningún componente usa Prisma
- ✅ Ningún archivo Svelte usa Prisma
- ✅ Solo se consumen endpoints protegidos

### 12.3 No acceso a filesystem

- ✅ Sin llamadas directas a filesystem
- ✅ Sin `storage/private`
- ✅ Sin `static/uploads`

### 12.4 Manejo de errores

- ✅ 401: Redirección a login
- ✅ 403: Mensaje de permiso denegado
- ✅ 400: Mensaje de filtros inválidos
- ✅ 500: Mensaje genérico sin detalles internos

### 12.5 Respuestas seguras

- ✅ No se exponen stack traces
- ✅ No se exponen detalles internos
- ✅ Errores genéricos en producción
- ✅ Formato consistente de respuesta

---

## 13. Limitaciones pendientes

### 13.1 Exportación

- Sin exportación PDF
- Sin exportación Excel/CSV
- Sin integración con auditoría existente
- Sin validación de permisos de exportación

### 13.2 Gráficos

- Sin gráficos de tendencias
- Sin visualizaciones complejas
- Sin dependencias de gráficos

### 13.3 Filtros mejorados

- Sin selectores desplegables para carreras/materias
- Sin autocompletado
- Sin validación en tiempo real

### 13.4 UX mejorada

- Sin recarga automática
- Sin persistencia de filtros
- Sin exportación de filtros

---

## 14. Próximos pasos (Fase 4)

### 14.1 Exportación

- Implementar exportación PDF
- Implementar exportación Excel/CSV
- Integrar con auditoría existente
- Validar permisos de exportación

### 14.2 Permisos a agregar

```typescript
'REPORTS_EXPORT'       # Exportación de reportes
```

### 14.3 Gráficos

- Implementar gráficos de tendencias
- Visualizaciones interactivas
- Dependencias de gráficos

---

## 15. Conclusión

La Fase 3 del Módulo de Reportes ha sido implementada exitosamente con:

- ✅ Página protegida con validación de sesión
- ✅ Dashboard con tabs para 4 tipos de reportes
- ✅ 8 componentes reutilizables
- ✅ Consumo de endpoints protegidos de Fase 2
- ✅ Manejo de 401, 403 y 400
- ✅ Filtros por sección
- ✅ Visualización de KPIs
- ✅ Estados de carga y error
- ✅ Sin Prisma en UI
- ✅ Sin endpoints nuevos
- ✅ Sin cambios de schema
- ✅ Sin migraciones
- ✅ Sin patrones prohibidos
- ✅ Validaciones exitosas
- ✅ Script de pruebas con 20 tests
- ✅ Documentación completa
- ✅ Sin dependencias nuevas

La implementación sigue las mejores prácticas de:

- Validación estricta de sesión
- Consumo de endpoints protegidos
- Manejo de errores
- Estados de carga
- Componentes reutilizables
- Documentación completa
- Pruebas funcionales
- Sin dependencias nuevas

---

**Documento preparado por:** Cascade AI Assistant
**Fecha:** 30/06/2026
**Versión:** 1.0
