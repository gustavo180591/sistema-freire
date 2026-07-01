# REPORTS MODULE - Fase 4: Exportación básica controlada

## Objetivo

Agregar exportación básica y segura de reportes en formato CSV, utilizando los servicios y endpoints ya creados en fases anteriores. La exportación respeta permisos, filtros y seguridad, sin modificar datos.

## Archivos creados

### Helpers de exportación CSV

**`src/lib/server/reports/report-export.helpers.ts`**

Funciones de utilidad para generación segura de CSV:

- **`escapeCsvField(value)`**: Escapa campos CSV para prevenir inyección CSV
  - Escapa comillas dobles duplicándolas
  - Envuelve campos con comillas cuando contienen comas, comillas, saltos de línea o espacios
  - Prefija con `'` valores que empiezan con `=`, `+`, `-`, `@` para prevenir fórmulas de Excel
- **`objectToCsvRow(obj, headers)`**: Convierte un objeto a fila CSV
- **`generateCsv(data, headers, headerLabels)`**: Genera CSV completo con encabezados
- **`generateSafeFilename(baseName)`**: Genera nombre de archivo seguro con timestamp
- **`CSV_HEADERS`**: Headers para cada tipo de reporte
- **`CSV_HEADER_LABELS`**: Labels en español para los headers

### Servicio de exportación

**`src/lib/server/reports/report-export.service.ts`**

Funciones de exportación que reutilizan los servicios de reportes existentes:

- **`exportInstitutionalReport()`**: Exporta reporte institucional a CSV
- **`exportFinancialReport(filters?)`**: Exporta reporte financiero a CSV con filtros
- **`exportAcademicReport(filters?)`**: Exporta reporte académico a CSV con filtros
- **`exportAttendanceReport(filters?)`**: Exporta reporte de asistencia a CSV con filtros

Todas las funciones retornan `{ csv: string, filename: string }`.

### Endpoints de exportación

#### `GET /api/reports/institutional/export`

- **Permisos**: SUPERADMIN únicamente
- **Filtros**: No soporta filtros
- **Headers**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="reporte-institucional-{timestamp}.csv"`
- **Errores**:
  - `401`: Usuario no autenticado
  - `403`: Usuario no es SUPERADMIN
  - `500`: Error interno del servidor

#### `GET /api/reports/financial/export`

- **Permisos**: `FINANCIAL_REPORT:read` (permiso explícito requerido)
- **Filtros**:
  - `studentId`: ID del alumno (opcional)
  - `startDate`: Fecha desde (opcional, formato YYYY-MM-DD)
  - `endDate`: Fecha hasta (opcional, formato YYYY-MM-DD)
- **Validación**:
  - Fechas deben ser válidas
  - `startDate` debe ser menor o igual a `endDate`
- **Headers**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="reporte-financiero-{timestamp}.csv"`
- **Errores**:
  - `401`: Usuario no autenticado
  - `403`: Usuario sin permiso `FINANCIAL_REPORT:read`
  - `400`: Filtros inválidos o rango de fechas inválido
  - `500`: Error interno del servidor

#### `GET /api/reports/academic/export`

- **Permisos**: `GRADE:read` (permiso explícito requerido para reportes académicos)
- **Filtros**:
  - `careerId`: ID de la carrera (opcional)
  - `subjectId`: ID de la materia (opcional)
  - `studentId`: ID del alumno (opcional)
- **Headers**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="reporte-academico-{timestamp}.csv"`
- **Errores**:
  - `401`: Usuario no autenticado
  - `403`: Usuario sin permiso `GRADE:read`
  - `500`: Error interno del servidor

#### `GET /api/reports/attendance/export`

- **Permisos**: `ATTENDANCE:read` (permiso explícito requerido)
- **Filtros**:
  - `studentId`: ID del alumno (opcional)
  - `subjectId`: ID de la materia (opcional)
  - `commissionId`: ID de la comisión (opcional)
  - `startDate`: Fecha desde (opcional, formato YYYY-MM-DD)
  - `endDate`: Fecha hasta (opcional, formato YYYY-MM-DD)
- **Validación**:
  - Fechas deben ser válidas
  - `startDate` debe ser menor o igual a `endDate`
- **Headers**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="reporte-asistencia-{timestamp}.csv"`
- **Errores**:
  - `401`: Usuario no autenticado
  - `403`: Usuario sin permiso `ATTENDANCE:read`
  - `400`: Filtros inválidos o rango de fechas inválido
  - `500`: Error interno del servidor

### Actualización de UI

Se actualizaron los siguientes componentes para agregar botones de exportación CSV:

- **`src/lib/components/reports/InstitutionalReportsPanel.svelte`**
  - Agregado botón "Exportar CSV" en la parte superior
  - Función `exportToCsv()` que llama a `/api/reports/institutional/export`
  - Maneja 401 (redirect a login), 403 (mensaje de error), y otros errores

- **`src/lib/components/reports/FinancialReportsPanel.svelte`**
  - Agregado botón "Exportar CSV" junto a "Aplicar Filtros"
  - Función `exportToCsv()` que llama a `/api/reports/financial/export` con filtros actuales
  - Maneja 401, 403, 400 y otros errores

- **`src/lib/components/reports/AcademicReportsPanel.svelte`**
  - Agregado botón "Exportar CSV" junto a "Aplicar Filtros"
  - Función `exportToCsv()` que llama a `/api/reports/academic/export` con filtros actuales
  - Maneja 401, 403, 400 y otros errores

- **`src/lib/components/reports/AttendanceReportsPanel.svelte`**
  - Agregado botón "Exportar CSV" junto a "Aplicar Filtros"
  - Función `exportToCsv()` que llama a `/api/reports/attendance/export` con filtros actuales
  - Maneja 401, 403, 400 y otros errores

### Script de validación

**`scripts/test-reports-exports.ts`**

Script de prueba con 32 tests que verifica:

1. Existencia de archivos de helpers y servicio de exportación
2. Existencia de endpoints de exportación
3. Funciones de escape CSV y protección contra inyección
4. Headers CSV y labels
5. Funciones de exportación por tipo de reporte
6. Validación de sesión y permisos en endpoints
7. Headers de respuesta (Content-Type, Content-Disposition)
8. Botones de exportación en UI
9. Llamadas a endpoints `/export` desde UI
10. Ausencia de Prisma en código de exportación
11. Ausencia de patrones prohibidos
12. Reutilización de servicios de reportes existentes
13. Manejo de errores 401, 403, 400

## Seguridad CSV

### Protección contra inyección CSV

La implementación incluye protección contra CSV injection:

1. **Prefijado de valores peligrosos**: Valores que empiezan con `=`, `+`, `-`, `@` se prefijan con `'` para prevenir que Excel los interprete como fórmulas.
2. **Escape de comillas**: Las comillas dobles se escapan duplicándolas (`"` → `""`).
3. **Envoltura en comillas**: Campos que contienen comas, comillas, saltos de línea o espacios se envuelven en comillas dobles.

### Headers seguros

Los nombres de archivo generados por `generateSafeFilename()`:
- Reemplazan caracteres no alfanuméricos con guiones
- Usan timestamp ISO 8606 (sin `:` y `.`) para unicidad
- Siempre terminan en `.csv`

### No exposición de datos sensibles

Los archivos CSV:
- No incluyen rutas internas del filesystem
- No incluyen datos técnicos sensibles
- No incluyen stack traces
- Solo contienen los KPIs ya expuestos por los endpoints JSON

## Reglas de permisos

Los permisos siguen la misma lógica estricta de Fase 2:

| Reporte | Permiso requerido | Justificación |
|---------|------------------|---------------|
| Institucional | `SUPERADMIN` | Datos sensibles de toda la institución |
| Financiero | `FINANCIAL_REPORT:read` | Datos financieros confidenciales |
| Académico | `GRADE:read` | Datos académicos de calificaciones |
| Asistencia | `ATTENDANCE:read` | Datos de asistencia de alumnos |

No se depende del permiso read global permisivo. Se usa `checkExplicitPermission()` que retorna `false` si no existe un registro de permiso explícito.

## Formato CSV

### Estructura

Cada CSV generado tiene:
- Primera línea: headers en español
- Segunda línea: datos del reporte (una sola fila de KPIs)

### Ejemplo: Reporte institucional

```csv
Total Alumnos,Alumnos Activos,Total Docentes,Docentes Activos,Total Usuarios,Usuarios Activos,Total Documentos,Total Carreras,Carreras Activas,Total Materias,Materias Activas,Deuda Total,Cobrado Total,Pendiente Total,Deuda Vencida,Asistencia Promedio,Alumnos con Baja Asistencia
150,142,25,23,180,175,450,5,5,40,38,1500000,1200000,300000,50000,85.5,12
```

### Campos por reporte

**Institucional (17 campos)**:
- Alumnos: total, activos
- Docentes: total, activos
- Usuarios: total, activos
- Documentos: total
- Carreras: total, activas
- Materias: total, activas
- Financiero: deuda total, cobrado, pendiente, vencido
- Asistencia: promedio, baja asistencia

**Financiero (12 campos)**:
- Cargos: total, pagado, pendiente, vencido
- Alumnos: con deuda
- Pagos: cantidad, total cobrado
- Recibos: emitidos, cancelados
- Convenios: activos, vencidos, en mora

**Académico (14 campos)**:
- Alumnos: total, activos
- Materias: total, activas
- Docentes: total, activos
- Comisiones: total, activas
- Evaluaciones: total
- Calificaciones: total, promedio
- Estado: regulares, libres, en riesgo

**Asistencia (7 campos)**:
- Registros: total, entradas
- Estado: presentes, ausentes, con observación, sin observación
- Promedio: asistencia promedio

## Integración con UI

### Flujo de exportación desde UI

1. Usuario hace clic en botón "Exportar CSV"
2. UI llama a función `exportToCsv()` del componente
3. Función construye URL con filtros actuales (si aplica)
4. Se hace `fetch()` al endpoint `/export`
5. Se manejan errores:
   - 401: redirect a `/login`
   - 403: muestra mensaje de error de permisos
   - 400: muestra mensaje de filtros inválidos
6. Si exitoso, se crea blob y se descarga archivo
7. Nombre de archivo se obtiene de header `Content-Disposition`

### Uso de filtros

Los filtros aplicados en la UI se respetan en la exportación:
- Financiero: `studentId`, `startDate`, `endDate`
- Académico: `careerId`, `subjectId`, `studentId`
- Asistencia: `studentId`, `subjectId`, `commissionId`, `startDate`, `endDate`

## Limitaciones y restricciones

### No implementado en Fase 4

- Exportación PDF
- Exportación Excel/XLSX
- Plantillas profesionales
- Gráficos exportables
- Envío por email
- Reportes programados
- Cache
- Jobs
- Cron

### Restricciones de seguridad

- No se modifican datos durante la exportación
- No se alteran estados de `PaymentAgreement`
- No se usa `storage/private`
- No se usa `static/uploads`
- No se crean permisos nuevos en base
- No se hacen cambios de schema
- No se ejecutan migraciones

## Validaciones

### Comandos de validación

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run check
npm run build
npx tsx scripts/test-reports-services.ts
npx tsx scripts/test-reports-endpoints.ts
npx tsx scripts/test-reports-ui.ts
npx tsx scripts/test-reports-exports.ts
```

### Verificación de patrones prohibidos

```bash
git add -N \
  docs/REPORTS_MODULE_PHASE_4_EXPORTS.md \
  scripts/test-reports-exports.ts \
  src/lib/server/reports/report-export.service.ts \
  src/lib/server/reports/report-export.helpers.ts \
  src/routes/api/reports/institutional/export/+server.ts \
  src/routes/api/reports/financial/export/+server.ts \
  src/routes/api/reports/academic/export/+server.ts \
  src/routes/api/reports/attendance/export/+server.ts

git diff -U0 | grep -E "^\+.*(\$queryRaw|\$executeRaw|@ts-ignore|@ts-expect-error|: any|as any)" || true

git diff --name-only --diff-filter=AM | grep -E '\.(ts|svelte)$' | xargs grep -n "\$queryRaw\|\$executeRaw\|@ts-ignore\|@ts-expect-error\|: any\|as any" || true
```

Ambos comandos deben devolver vacío.

## Próximos pasos (Fase 5)

Fase 5 implementará:
- Visualizaciones/gráficos simples
- Gráficos de barras, líneas, torta
- Librería de gráficos ligera (sin dependencias pesadas)
- Integración con UI existente
- Exportación de gráficos (opcional)

## Próximos pasos (Fase 6)

Fase 6 implementará:
- Auditoría integral del módulo
- Performance optimization
- Prueba manual completa
- Cierre final del módulo REPORTES
