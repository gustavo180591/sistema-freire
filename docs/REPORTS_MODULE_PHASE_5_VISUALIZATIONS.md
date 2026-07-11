# REPORTS MODULE - Fase 5: Gráficos y visualizaciones simples

## Objetivo

Mejorar la UI de reportes agregando visualizaciones simples y livianas para que los datos sean más fáciles de interpretar, sin dependencias externas pesadas y sin tocar backend, schema ni endpoints.

## Componentes de gráficos creados

### `src/lib/components/reports/charts/SimpleBarChart.svelte`

Componente de barras horizontales simples para mostrar comparaciones de valores.

**Props:**

- `data`: Array de `{ label: string; value: number; color?: string }`
- `maxValue`: Valor máximo opcional (auto-calculado si no se proporciona)
- `height`: Altura de las barras en px (default: 24)
- `showValues`: Mostrar valores numéricos (default: true)

**Características:**

- Barras horizontales con ancho proporcional al valor
- Colores personalizables por barra
- Etiquetas truncadas con tooltip
- Valores formateados con `toLocaleString()`
- Protección contra división por cero

### `src/lib/components/reports/charts/SimpleProgressBar.svelte`

Componente de barra de progreso circular para mostrar porcentajes.

**Props:**

- `value`: Valor actual
- `total`: Valor total
- `label`: Etiqueta opcional
- `color`: Color de la barra (default: `rgb(99, 102, 241)`)
- `height`: Altura de la barra en px (default: 8)
- `showPercentage`: Mostrar porcentaje (default: true)

**Características:**

- Barra de progreso con porcentaje calculado
- Etiqueta opcional arriba de la barra
- Porcentaje mostrado con 1 decimal
- Protección contra división por cero

### `src/lib/components/reports/charts/SimpleMetricComparison.svelte`

Componente de comparación de métricas en tarjetas.

**Props:**

- `metrics`: Array de `{ label: string; value: number; color?: string }`
- `total`: Total opcional (auto-calculado si no se proporciona)
- `showTotal`: Mostrar tarjeta de total (default: true)

**Características:**

- Grid de tarjetas con métricas
- Colores personalizables por métrica
- Porcentaje del total calculado automáticamente
- Tarjeta de total opcional
- Protección contra división por cero

### `src/lib/components/reports/charts/SimpleDistributionList.svelte`

Componente de lista de distribución con barras horizontales.

**Props:**

- `data`: Record<string, number> (clave-valor)
- `title`: Título opcional
- `color`: Color de las barras (default: `rgb(99, 102, 241)`)

**Características:**

- Convierte Record a array y ordena por valor descendente
- Barras horizontales proporcionales
- Etiquetas truncadas con tooltip
- Valores formateados con `toLocaleString()`
- Estado vacío cuando no hay datos
- Protección contra división por cero

## Paneles actualizados

### InstitutionalReportsPanel.svelte

**Visualizaciones agregadas:**

1. **Alumnos Activos vs Total** - ProgressBar
   - Muestra porcentaje de alumnos activos sobre total
   - Color: indigo

2. **Deuda vs Cobrado** - MetricComparison
   - Compara deuda total vs cobrado
   - Colores: rojo (deuda), verde (cobrado)

3. **Asistencia Promedio** - ProgressBar
   - Muestra porcentaje de asistencia promedio
   - Total: 100
   - Color: indigo

4. **Baja Asistencia** - Tarjeta de métrica destacada
   - Muestra número de alumnos con asistencia baja
   - Color: amber

### FinancialReportsPanel.svelte

**Visualizaciones agregadas:**

1. **Pagado vs Pendiente** - MetricComparison
   - Compara pagado vs pendiente
   - Colores: verde (pagado), rojo (pendiente)

2. **Deuda Vencida vs Total** - ProgressBar
   - Muestra porcentaje de deuda vencida sobre total
   - Color: rojo

3. **Alumnos con Deuda** - Tarjeta de métrica destacada
   - Muestra número de alumnos con deuda
   - Color: amber

4. **Convenios Activos** - Tarjeta de métrica destacada
   - Muestra número de convenios activos
   - Color: indigo

### AcademicReportsPanel.svelte

**Visualizaciones agregadas:**

1. **Alumnos Activos vs Total** - ProgressBar
   - Muestra porcentaje de alumnos activos sobre total
   - Color: indigo

2. **Regularidad Académica** - MetricComparison
   - Compara regulares vs libres
   - Colores: verde (regulares), rojo (libres)

3. **Alumnos por Carrera** - DistributionList
   - Distribución de alumnos por carrera
   - Color: indigo

4. **Alumnos por Estado** - DistributionList
   - Distribución de alumnos por estado
   - Color: verde

5. **Alumnos en Riesgo** - Tarjeta de métrica destacada
   - Muestra número de alumnos en riesgo
   - Color: amber

6. **Promedio de Calificaciones** - Tarjeta de métrica destacada
   - Muestra promedio general
   - Color: indigo

### AttendanceReportsPanel.svelte

**Visualizaciones agregadas:**

1. **Presentes vs Ausentes** - MetricComparison
   - Compara presentes vs ausentes
   - Colores: verde (presentes), rojo (ausentes)

2. **Ausencias con/sin Observación** - MetricComparison
   - Compara ausencias con observación vs sin observación
   - Colores: amber (con observación), rojo (sin observación)
   - **Nota:** Se usa "con observación" y no "justificada formal" según requerimiento

3. **Asistencia Promedio** - ProgressBar
   - Muestra porcentaje de asistencia promedio
   - Total: 100
   - Color: indigo

4. **Promedio por Materia** - DistributionList
   - Distribución de asistencia promedio por materia
   - Color: indigo

5. **Promedio por Comisión** - DistributionList
   - Distribución de asistencia promedio por comisión
   - Color: verde
   - Ocupa 2 columnas en desktop

## Reglas visuales aplicadas

- **Diseño oscuro:** Todos los componentes usan colores slate/indigo del tema existente
- **Responsive mobile-first:** Grids adaptativos con `md:grid-cols-2` y `md:grid-cols-3`
- **No ocultar datos numéricos:** Los gráficos complementan las tarjetas KPI existentes
- **Estados vacíos:** Todos los componentes muestran mensaje cuando no hay datos
- **Protección contra división por cero:** Todos los componentes calculan porcentajes solo si total > 0
- **Formateo correcto:** Porcentajes con 1-2 decimales, montos con `toLocaleString()`
- **Sin gráficos engañosos:** No se muestran gráficos cuando el total es 0

## Seguridad

**No se usaron patrones prohibidos del proyecto:**

- Consultas raw de Prisma
- Ejecuciones raw de Prisma
- Tipo any
- Casts peligrosos
- Directivas de omisión de TypeScript
- Directivas de expect-error de TypeScript

**No se usó Prisma en UI.**

**No se leyó filesystem desde UI.**

**No se crearon endpoints nuevos.**

**No se modificó schema.**

**No se crearon migraciones.**

**No se usó:**

- `npx prisma db push`
- `npx prisma migrate reset`
- `npx prisma migrate resolve`

## Dependencias

**No se agregaron dependencias nuevas.** Todos los componentes son Svelte puro con HTML/CSS/Tailwind.

## Limitaciones

- Gráficos simples sin librerías externas
- Sin interactividad avanzada (zoom, tooltips complejos, etc.)
- Sin exportación de gráficos
- Sin animaciones complejas
- Sin gráficos 3D o avanzados

## Próximos pasos (Fase 6)

Fase 6 implementará:

- Auditoría integral del módulo
- Performance optimization
- Prueba manual completa
- Cierre final del módulo REPORTES
