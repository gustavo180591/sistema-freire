# REPORTS MODULE - Checklist Operativo

## Checklist de Pruebas de Reportes

### Reportes Institucionales

**Prerequisites:**
- [ ] Usuario con rol SUPERADMIN autenticado
- [ ] Base de datos con datos de prueba (alumnos, docentes, carreras, etc.)

**Pasos de prueba:**
1. [ ] Navegar a `/reportes/dashboard`
2. [ ] Verificar que el tab "Institucional" está activo por defecto
3. [ ] Verificar que se muestran KPIs (Total Alumnos, Alumnos Activos, Total Docentes, etc.)
4. [ ] Verificar que se muestran visualizaciones (Alumnos Activos vs Total, Deuda vs Cobrado, etc.)
5. [ ] Verificar que no hay errores en consola
6. [ ] Verificar que los datos son consistentes con la base de datos

**Prueba de permisos:**
1. [ ] Cerrar sesión
2. [ ] Intentar navegar a `/reportes/dashboard`
3. [ ] Verificar redirección a `/login`
4. [ ] Iniciar sesión con usuario sin rol SUPERADMIN
5. [ ] Intentar navegar a `/reportes/dashboard`
6. [ ] Verificar que la UI carga pero el tab institucional muestra error 403

**Prueba de exportación CSV:**
1. [ ] Navegar a `/reportes/dashboard` como SUPERADMIN
2. [ ] Hacer clic en "Exportar CSV" en tab institucional
3. [ ] Verificar que se descarga archivo CSV
4. [ ] Verificar que el filename tiene formato seguro
5. [ ] Abrir CSV y verificar que tiene headers en español
6. [ ] Verificar que los datos son correctos
7. [ ] Verificar que no hay caracteres peligrosos (CSV injection)

### Reportes Financieros

**Prerequisites:**
- [ ] Usuario con permiso `FINANCIAL_REPORT:read` autenticado
- [ ] Base de datos con datos financieros (cargos, pagos, recibos, convenios)

**Pasos de prueba:**
1. [ ] Navegar a `/reportes/dashboard`
2. [ ] Hacer clic en tab "Financiero"
3. [ ] Verificar que se muestran KPIs financieros (Cargos Totales, Pagado Total, Pendiente Total, etc.)
4. [ ] Verificar que se muestran visualizaciones (Pagado vs Pendiente, Deuda Vencida vs Total, etc.)
5. [ ] Aplicar filtro por estudiante (si hay datos)
6. [ ] Verificar que los datos se actualizan según el filtro
7. [ ] Aplicar filtro por rango de fechas
8. [ ] Verificar que los datos se actualizan según el filtro
9. [ ] Verificar que no hay errores en consola

**Prueba de permisos:**
1. [ ] Iniciar sesión con usuario sin permiso `FINANCIAL_REPORT:read`
2. [ ] Navegar a `/reportes/dashboard`
3. [ ] Hacer clic en tab "Financiero"
4. [ ] Verificar que se muestra error 403
5. [ ] Verificar que el mensaje de error es claro

**Prueba de exportación CSV:**
1. [ ] Navegar a `/reportes/dashboard` con permiso `FINANCIAL_REPORT:read`
2. [ ] Hacer clic en tab "Financiero"
3. [ ] Aplicar filtros si es necesario
4. [ ] Hacer clic en "Exportar CSV"
5. [ ] Verificar que se descarga archivo CSV
6. [ ] Verificar que el CSV incluye solo datos filtrados
7. [ ] Verificar que los headers están en español

### Reportes Académicos

**Prerequisites:**
- [ ] Usuario con permiso `GRADE:read` autenticado
- [ ] Base de datos con datos académicos (alumnos, materias, comisiones, calificaciones)

**Pasos de prueba:**
1. [ ] Navegar a `/reportes/dashboard`
2. [ ] Hacer clic en tab "Académico"
3. [ ] Verificar que se muestran KPIs académicos (Total Alumnos, Alumnos Activos, Total Materias, etc.)
4. [ ] Verificar que se muestran visualizaciones (Alumnos Activos vs Total, Regularidad Académica, etc.)
5. [ ] Aplicar filtro por carrera (si hay datos)
6. [ ] Verificar que los datos se actualizan según el filtro
7. [ ] Verificar que "Alumnos por Carrera" muestra distribución correcta
8. [ ] Verificar que "Alumnos por Estado" muestra distribución correcta
9. [ ] Verificar que no hay errores en consola

**Prueba de permisos:**
1. [ ] Iniciar sesión con usuario sin permiso `GRADE:read`
2. [ ] Navegar a `/reportes/dashboard`
3. [ ] Hacer clic en tab "Académico"
4. [ ] Verificar que se muestra error 403

**Prueba de exportación CSV:**
1. [ ] Navegar a `/reportes/dashboard` con permiso `GRADE:read`
2. [ ] Hacer clic en tab "Académico"
3. [ ] Hacer clic en "Exportar CSV"
4. [ ] Verificar que se descarga archivo CSV
5. [ ] Verificar que el CSV tiene datos académicos correctos

### Reportes de Asistencia

**Prerequisites:**
- [ ] Usuario con permiso `ATTENDANCE:read` autenticado
- [ ] Base de datos con datos de asistencia (registros, entradas)

**Pasos de prueba:**
1. [ ] Navegar a `/reportes/dashboard`
2. [ ] Hacer clic en tab "Asistencia"
3. [ ] Verificar que se muestran KPIs de asistencia (Presentes, Ausentes, Justificados, Injustificados)
4. [ ] Verificar que se muestran visualizaciones (Presentes vs Ausentes, Ausencias con/sin Observación, etc.)
5. [ ] Verificar que la terminología es "Con Observación" y "Sin Observación", no "Justificados/Injustificados"
6. [ ] Aplicar filtro por materia (si hay datos)
7. [ ] Verificar que "Promedio por Materia" se actualiza
8. [ ] Aplicar filtro por comisión (si hay datos)
9. [ ] Verificar que "Promedio por Comisión" se actualiza
10. [ ] Aplicar filtro por rango de fechas
11. [ ] Verificar que los datos se actualizan según el filtro
12. [ ] Verificar que no hay errores en consola

**Prueba de permisos:**
1. [ ] Iniciar sesión con usuario sin permiso `ATTENDANCE:read`
2. [ ] Navegar a `/reportes/dashboard`
3. [ ] Hacer clic en tab "Asistencia"
4. [ ] Verificar que se muestra error 403

**Prueba de exportación CSV:**
1. [ ] Navegar a `/reportes/dashboard` con permiso `ATTENDANCE:read`
2. [ ] Hacer clic en tab "Asistencia"
3. [ ] Hacer clic en "Exportar CSV"
4. [ ] Verificar que se descarga archivo CSV
5. [ ] Verificar que el CSV tiene datos de asistencia correctos

## Validación de Permisos

### Prueba de SUPERADMIN

**Pasos:**
1. [ ] Crear usuario con rol SUPERADMIN
2. [ ] Iniciar sesión como SUPERADMIN
3. [ ] Navegar a `/reportes/dashboard`
4. [ ] Verificar que todos los tabs son accesibles
5. [ ] Verificar que todos los datos se cargan correctamente
6. [ ] Verificar que todas las exportaciones funcionan

### Prueba de Permisos Específicos

**FINANCIAL_REPORT:read:**
1. [ ] Crear usuario con rol FINANZAS
2. [ ] Asignar permiso `FINANCIAL_REPORT:read` al rol FINANZAS
3. [ ] Iniciar sesión como usuario con rol FINANZAS
4. [ ] Navegar a `/reportes/dashboard`
5. [ ] Verificar que tab "Financiero" es accesible
6. [ ] Verificar que tabs "Institucional", "Académico", "Asistencia" muestran error 403

**GRADE:read:**
1. [ ] Crear usuario con rol DOCENTE
2. [ ] Asignar permiso `GRADE:read` al rol DOCENTE
3. [ ] Iniciar sesión como usuario con rol DOCENTE
4. [ ] Navegar a `/reportes/dashboard`
5. [ ] Verificar que tab "Académico" es accesible
6. [ ] Verificar que otros tabs muestran error 403

**ATTENDANCE:read:**
1. [ ] Crear usuario con rol PRECEPTOR
2. [ ] Asignar permiso `ATTENDANCE:read` al rol PRECEPTOR
3. [ ] Iniciar sesión como usuario con rol PRECEPTOR
4. [ ] Navegar a `/reportes/dashboard`
5. [ ] Verificar que tab "Asistencia" es accesible
6. [ ] Verificar que otros tabs muestran error 403

## Revisión de Errores HTTP

### Error 401 Unauthorized

**Pasos de prueba:**
1. [ ] Cerrar sesión
2. [ ] Intentar acceder a `/reportes/dashboard` directamente
3. [ ] Verificar redirección a `/login`
4. [ ] Intentar llamar `/api/reports/institutional` sin auth
5. [ ] Verificar respuesta 401 con mensaje "Unauthorized"
6. [ ] Intentar llamar `/api/reports/institutional/export` sin auth
7. [ ] Verificar respuesta 401

### Error 403 Forbidden

**Pasos de prueba:**
1. [ ] Iniciar sesión con usuario sin permisos de reportes
2. [ ] Navegar a `/reportes/dashboard`
3. [ ] Verificar que cada tab muestra error 403 con mensaje claro
4. [ ] Intentar llamar `/api/reports/financial` sin permiso
5. [ ] Verificar respuesta 403 con mensaje "Forbidden: FINANCIAL_REPORT:read required"
6. [ ] Intentar llamar `/api/reports/academic/export` sin permiso
7. [ ] Verificar respuesta 403

### Error 400 Bad Request

**Pasos de prueba:**
1. [ ] Navegar a `/reportes/dashboard` con permisos
2. [ ] En tab financiero, aplicar filtro con fecha inválida (ej. "invalid-date")
3. [ ] Verificar que se muestra error 400 con mensaje "Invalid startDate format"
4. [ ] Aplicar filtro con startDate > endDate
5. [ ] Verificar que se muestra error 400 con mensaje "startDate must be before or equal to endDate"
6. [ ] Intentar llamar `/api/reports/financial?startDate=invalid` directamente
7. [ ] Verificar respuesta 400

### Error 500 Internal Server Error

**Pasos de prueba:**
1. [ ] Simular error en servicio (comentar temporalmente una línea)
2. [ ] Navegar a `/reportes/dashboard`
3. [ ] Verificar que se muestra error genérico "Internal server error"
4. [ ] Verificar que no se muestra stack trace
5. [ ] Verificar que el error se loggea en consola del servidor
6. [ ] Restaurar código original

## Checklist Pre-Producción

### Validaciones Técnicas

- [ ] Ejecutar `npm run check` - 0 errores
- [ ] Ejecutar `npm run build` - Build exitoso
- [ ] Ejecutar `npx prisma migrate status` - Schema up to date
- [ ] Ejecutar `npx prisma validate` - Schema válido
- [ ] Ejecutar todos los scripts de prueba - 104/104 tests pasan
- [ ] Verificar que no hay warnings nuevos en svelte-check
- [ ] Verificar que no hay patrones prohibidos en código nuevo

### Validaciones de Seguridad

- [ ] Verificar que no hay Prisma en UI
- [ ] Verificar que no hay SQL raw
- [ ] Verificar que no hay patrones prohibidos del proyecto
- [ ] Verificar que no hay rutas públicas inseguras
- [ ] Verificar que todos los endpoints validan sesión
- [ ] Verificar que todos los endpoints validan permisos
- [ ] Verificar que los archivos CSV tienen filename seguro
- [ ] Verificar que hay protección contra CSV injection

### Validaciones de Funcionalidad

- [ ] Verificar que los 4 tabs funcionan correctamente
- [ ] Verificar que los filtros funcionan en cada tab
- [ ] Verificar que las exportaciones CSV funcionan en cada tab
- [ ] Verificar que las visualizaciones se muestran correctamente
- [ ] Verificar que los KPIs son consistentes con la base de datos
- [ ] Verificar que la terminología de asistencia es correcta ("Con Observación", "Sin Observación")
- [ ] Verificar que no se alteran datos (solo lectura)

### Validaciones de Documentación

- [ ] Verificar que existe documentación de Fase 0
- [ ] Verificar que existe documentación de Fase 1
- [ ] Verificar que existe documentación de Fase 2
- [ ] Verificar que existe documentación de Fase 3
- [ ] Verificar que existe documentación de Fase 4
- [ ] Verificar que existe documentación de Fase 5
- [ ] Verificar que existe documentación de Fase 6 (este documento)
- [ ] Verificar que existe documento de cierre

### Validaciones de Performance

- [ ] Verificar que los reportes cargan en menos de 5 segundos con datos de prueba
- [ ] Verificar que las exportaciones CSV se generan en menos de 3 segundos
- [ ] Verificar que no hay memory leaks en la UI
- [ ] Verificar que la UI responde correctamente durante carga de datos

## Troubleshooting

### Problema: Reportes no cargan datos

**Posibles causas:**
- Usuario no tiene permisos
- Base de datos no tiene datos
- Error en servicio

**Pasos de resolución:**
1. Verificar consola del navegador para errores
2. Verificar consola del servidor para errores
3. Verificar que el usuario tiene permisos correctos
4. Verificar que la base de datos tiene datos
5. Ejecutar scripts de prueba para diagnosticar

### Problema: Exportación CSV no funciona

**Posibles causas:**
- Usuario no tiene permisos
- Error en generación de CSV
- Bloqueador de descargas

**Pasos de resolución:**
1. Verificar consola del navegador para errores
2. Verificar que el usuario tiene permisos correctos
3. Verificar que el endpoint CSV responde correctamente
4. Deshabilitar bloqueador de descargas temporalmente
5. Ejecutar script de prueba de exports

### Problema: Visualizaciones no se muestran

**Posibles causas:**
- Datos vacíos
- Error en componente de gráfico
- CSS no cargado

**Pasos de resolución:**
1. Verificar que hay datos en el reporte
2. Verificar consola del navegador para errores
3. Verificar que los componentes de gráficos existen
4. Verificar que Tailwind CSS está cargado

### Problema: Error 403 inesperado

**Posibles causas:**
- Permisos no configurados correctamente
- Rol no asignado al usuario
- Cache de permisos obsoleto

**Pasos de resolución:**
1. Verificar que el permiso existe en la base de datos
2. Verificar que el rol del usuario tiene el permiso
3. Cerrar sesión y volver a iniciar sesión
4. Verificar que el helper de permisos funciona correctamente
