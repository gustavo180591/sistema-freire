# Módulo de Digitalización de Haberes Docentes

## Estado Actual

**Implementado a nivel código** - Pendiente de validación manual funcional y pruebas automatizadas.

## Funcionalidades Implementadas

### Backend

- Modelo Prisma extendido con campos de auditoría (`uploadedBy`, `fileKey`, `fileSize`, `mimeType`, `originalFileName`, `deletedAt`, `deletedBy`)
- Servicio de almacenamiento privado en `storage/private/payslips/`
- Validador de PDF (extensión, MIME, tamaño, magic bytes)
- Validador de datos de payslip (período, importe, estado)
- Servicio de payslips con manejo de duplicados
- Endpoints de carga, edición, reemplazo, eliminación lógica y descarga
- Auditoría en todas las acciones (CREATE, UPDATE, DELETE, EXPORT)

### Frontend

- UI de carga de recibos (`/recibos/nuevo`)
- UI de edición de recibos (`/recibos/[id]/editar`)
- Vista de listado con filtros administrativos (docente, año, mes, estado)
- Vista docente con ordenamiento por período (reciente a antiguo)
- Botón de carga en vista de listado para roles autorizados

### Seguridad

- Control de acceso basado en roles (DIRECTOR/FINANZAS para operaciones de escritura)
- Validación de ownership para docentes (solo ven sus propios recibos)
- Bloqueo de acceso a recibos eliminados lógicamente
- Bloqueo de acceso directo a archivos (solo vía endpoint autorizado)
- Almacenamiento privado fuera de `static/`

## Funcionalidades Pendientes

- **Validación funcional manual** (requiere intervención del usuario)
- Pruebas unitarias de servicios
- Pruebas de integración de endpoints
- Pruebas E2E del flujo completo

## Comandos para Preparar la Base de Datos

```bash
# Instalar dependencias (si hace falta)
npm install

# Sincronizar Prisma y generar cliente
npx prisma generate

# Ejecutar seed principal (roles y usuario admin)
npm run db:seed

# Ejecutar seed específico de recibos (usuarios de prueba)
npm run db:seed:recibos
```

## Comandos para Ejecutar Seeds

```bash
# Seed general del sistema
npm run db:seed

# Seed específico del módulo de recibos
npm run db:seed:recibos
```

## Usuarios de Prueba y Credenciales

| Rol        | Email                       | Contraseña       | Estado                                         |
| ---------- | --------------------------- | ---------------- | ---------------------------------------------- |
| SUPERADMIN | superadmin.test@example.com | TestPassword123! | Activo                                         |
| DIRECTOR   | director.test@example.com   | TestPassword123! | Activo                                         |
| SECRETARIA | secretaria.test@example.com | TestPassword123! | Activo                                         |
| FINANZAS   | finanzas.test@example.com   | TestPassword123! | Activo                                         |
| LIQUIDADOR | liquidador.test@example.com | TestPassword123! | Activo                                         |
| PRECEPTOR  | preceptor.test@example.com  | TestPassword123! | Activo                                         |
| ALUMNO     | alumno.test@example.com     | TestPassword123! | Activo                                         |
| APODERADO  | apoderado.test@example.com  | TestPassword123! | Activo                                         |
| DOCENTE    | docente.test@example.com    | TestPassword123! | Activo (Teacher ID: cmq1rrbf5000cviuq5t2k44a7) |

**Nota:** El usuario DOCENTE está asociado a un Teacher con DNI `12345678`.

## Rutas Principales del Módulo

| Ruta                     | Función                 | Roles Permitidos                                      |
| ------------------------ | ----------------------- | ----------------------------------------------------- |
| `/recibos`               | Listado de recibos      | Todos (filtrado por rol)                              |
| `/recibos/nuevo`         | Carga de nuevos recibos | DIRECTOR, FINANZAS, LIQUIDADOR                        |
| `/recibos/[id]/editar`   | Edición de recibos      | DIRECTOR, FINANZAS, LIQUIDADOR                        |
| `/recibos/[id]/download` | Descarga de PDF         | DIRECTOR, FINANZAS, LIQUIDADOR, DOCENTE (solo propio) |
| `/auditoria`             | Registro de auditoría   | Todos con permisos                                    |

## Checklist de Validación Manual

### 1. Carga como DIRECTOR

- [ ] Ingresar como DIRECTOR
- [ ] Acceder a `/recibos/nuevo`
- [ ] Cargar un recibo PDF para un docente
- [ ] Verificar que se permita la carga

### 2. Carga como FINANZAS

- [ ] Ingresar como FINANZAS
- [ ] Acceder a `/recibos/nuevo`
- [ ] Cargar un recibo
- [ ] Acceder a `/recibos/[id]/editar` y verificar edición

### 3. Carga como LIQUIDADOR

- [ ] Ingresar como LIQUIDADOR
- [ ] Acceder a `/recibos/nuevo`
- [ ] Cargar un recibo
- [ ] Acceder a `/recibos/[id]/editar` y verificar edición
- [ ] Verificar que LIQUIDADOR no pueda eliminar recibos

### 4. Vista como DOCENTE

- [ ] Ingresar como DOCENTE
- [ ] Acceder a `/recibos`
- [ ] Verificar que solo vea sus propios recibos
- [ ] Verificar ordenamiento por período (reciente a antiguo)

### 5. Descarga como DOCENTE

- [ ] Como DOCENTE, descargar su propio recibo
- [ ] Verificar que funcione

### 6. Acceso no autorizado por ID

- [ ] Como DOCENTE, intentar acceder a `/recibos/[otro_id]/download`
- [ ] Verificar que devuelva 404 o acceso denegado

### 7. Acceso directo a archivos

- [ ] Intentar acceder directamente a `storage/private/payslips/` desde el navegador
- [ ] Verificar que no sea accesible

### 8. Rechazo de archivos no PDF

- [ ] Intentar cargar un archivo que no sea PDF
- [ ] Verificar que se rechace

### 9. Rechazo de PDFs grandes

- [ ] Intentar cargar un PDF > 10MB
- [ ] Verificar que se rechace

### 10. Manejo de duplicados

- [ ] Intentar cargar un recibo para el mismo docente, mes y año
- [ ] Verificar que el sistema detecte el duplicado

### 11. Edición de recibos

- [ ] Como DIRECTOR/FINANZAS/LIQUIDADOR, editar un recibo existente
- [ ] Verificar que los cambios se guarden

### 12. Reemplazo de archivo

- [ ] En la página de edición, reemplazar el archivo PDF
- [ ] Verificar que funcione y quede auditado

### 13. Eliminación lógica

- [ ] Eliminar un recibo (como DIRECTOR)
- [ ] Intentar acceder a él o descargarlo
- [ ] Verificar que no sea accesible

### 14. Filtros administrativos

- [ ] Como DIRECTOR/FINANZAS/LIQUIDADOR, usar filtros por docente, año, mes, estado
- [ ] Verificar que funcionen correctamente

### 15. Auditoría

- [ ] Realizar acciones de carga, edición, reemplazo, eliminación, descarga
- [ ] Verificar en `/auditoría` que todas queden registradas

## Consideraciones de Seguridad

- **Almacenamiento privado:** Los archivos PDF se guardan en `storage/private/payslips/`, fuera del directorio `static/`, por lo que no son accesibles directamente desde el navegador.
- **Control de acceso:** Todos los endpoints están protegidos por verificación de sesión y roles.
- **Ownership:** Los docentes solo pueden acceder a sus propios recibos.
- **Eliminación lógica:** Los recibos eliminados no son accesibles ni consultables.
- **Validación de archivos:** Se valida extensión, MIME, tamaño y magic bytes de los PDFs.
- **Auditoría:** Todas las acciones importantes quedan registradas en la tabla de auditoría.

## Archivos Creados/Modificados

### Archivos Nuevos

- `src/lib/server/services/storage/file-storage.service.ts` - Servicio de almacenamiento privado
- `src/lib/server/validators/payslip.validator.ts` - Validador de datos de payslip
- `src/routes/(app)/recibos/nuevo/+page.server.ts` - Endpoint de carga
- `src/routes/(app)/recibos/nuevo/+page.svelte` - UI de carga
- `src/routes/(app)/recibos/[id]/editar/+page.server.ts` - Endpoint de edición
- `src/routes/(app)/recibos/[id]/editar/+page.svelte` - UI de edición
- `prisma/seed-recibos.ts` - Seed específico para recibos
- `docs/modulo-recibos-docentes.md` - Esta documentación

### Archivos Modificados

- `prisma/schema.prisma` - Modelo Payslip extendido
- `src/lib/server/services/payroll/payslip.service.ts` - Funciones extendidas
- `src/routes/(app)/recibos/+page.server.ts` - Filtros agregados
- `src/routes/(app)/recibos/+page.svelte` - Filtros y botón de edición
- `src/routes/(app)/recibos/[id]/download/+server.ts` - Uso de almacenamiento privado
- `package.json` - Script `db:seed:recibos` agregado

### Migración Prisma

- `prisma/migrations/20260606023826_add_payslip_upload_tracking/migration.sql`

## Aclaraciones Importantes

1. **Almacenamiento de archivos:** Los archivos PDF se guardan en `storage/private/payslips/` y no en `static/`. Esto garantiza que no sean accesibles públicamente vía URL directa.

2. **Estado del módulo:** El módulo está implementado a nivel código con validación técnica exitosa (`npm run check` y `npm run build`), pero **no debe marcarse como "cerrado para producción"** hasta que se realice la validación manual funcional en navegador.

3. **Pruebas automatizadas:** El módulo queda pendiente de pruebas unitarias, de integración y E2E como mejora futura.

4. **Reset de base de datos:** El `npx prisma db push --force-reset` se ejecutó únicamente en entorno local/desarrollo y no afectó datos de producción.

## Comandos para Levantar la Aplicación

```bash
# Levantar servidor de desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:5173` (o el puerto configurado).
