# Final Deployment Checklist

## Checklist Pre-Deploy

### Variables de Entorno

**Variables requeridas en `.env`:**

- `DATABASE_URL` - URL de conexión PostgreSQL
- `SESSION_SECRET` - Secret para sesiones (generar uno seguro)
- `TOTP_SECRET` - Secret para 2FA (opcional, puede ser generado)
- `NODE_ENV` - `production`

**Variables opcionales:**

- `SMTP_HOST` - Para envío de emails
- `SMTP_PORT` - Puerto SMTP
- `SMTP_USER` - Usuario SMTP
- `SMTP_PASS` - Contraseña SMTP
- `SMTP_FROM` - Email remitente

### Base de Datos

**Prerequisites:**

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos creada
- [ ] Usuario de base de datos con permisos
- [ ] `DATABASE_URL` configurado correctamente

**Migraciones:**

- [ ] Ejecutar `npx prisma migrate deploy`
- [ ] Verificar `npx prisma migrate status` muestra "Database schema is up to date"
- [ ] NO usar `npx prisma db push`
- [ ] NO usar `npx prisma migrate reset`
- [ ] NO usar `npx prisma migrate resolve`

**Seed inicial:**

- [ ] Ejecutar seed de locations (Leandro N. Alem, Capiovi)
- [ ] Ejecutar seed de usuarios administradores
- [ ] Verificar que SUPERADMIN tiene acceso a todas las sedes

### Build

**Prerequisites:**

- [ ] Node.js versión correcta instalada
- [ ] npm/yarn instalado
- [ ] Dependencias instaladas (`npm install`)

**Build:**

- [ ] Ejecutar `npm run build`
- [ ] Verificar que build termina sin errores
- [ ] Verificar que `.svelte-kit/output` se generó correctamente

### Permisos de Sistema

**Directorios:**

- [ ] Verificar permisos de `storage/private` (solo servidor)
- [ ] Verificar permisos de `static/uploads` (acceso público)
- [ ] Verificar permisos de logs
- [ ] Verificar permisos de uploads temporales

**Usuario de ejecución:**

- [ ] Crear usuario dedicado para la aplicación
- [ ] NO ejecutar como root
- [ ] Configurar permisos mínimos necesarios

### Storage

**Directorios requeridos:**

- [ ] `storage/private` - Documentos privados
- [ ] `static/uploads` - Documentos públicos
- [ ] `logs` - Logs de aplicación

**Backups:**

- [ ] Configurar backups automáticos de base de datos
- [ ] Configurar backups de storage
- [ ] Documentar política de retención
- [ ] Probar restore de backup

### Usuario Administrador

**Cuenta inicial:**

- [ ] Crear usuario SUPERADMIN
- [ ] Configurar 2FA (opcional pero recomendado)
- [ ] Verificar acceso a todas las sedes
- [ ] Cambiar contraseña por defecto
- [ ] Documentar credenciales de forma segura

### Pruebas Post-Deploy

**Funcionales:**

- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Gestión de usuarios funciona
- [ ] Gestión de alumnos funciona
- [ ] Gestión académica funciona
- [ ] Gestión financiera funciona
- [ ] Asistencia funciona
- [ ] Gestión documental funciona
- [ ] Reportes funcionan
- [ ] Exportaciones funcionan

**Sedes:**

- [ ] Verificar acceso a sede Leandro N. Alem
- [ ] Verificar acceso a sede Capiovi
- [ ] Verificar permisos por sede funcionan
- [ ] Verificar datos filtrados por sede

**Seguridad:**

- [ ] HTTPS configurado
- [ ] Certificado SSL válido
- [ ] Headers de seguridad configurados
- [ ] Rate limiting configurado
- [ ] Logs de acceso funcionan

**Performance:**

- [ ] Tiempo de respuesta aceptable
- [ ] No hay memory leaks
- [ ] Build de producción optimizado
- [ ] Assets servidos correctamente

## Checklist de Seguridad

### Autenticación

- [ ] Sesiones expiran correctamente
- [ ] 2FA funciona (si está habilitado)
- [ ] Lockout de cuenta funciona
- [ ] Password hashing seguro

### Permisos

- [ ] Roles funcionan correctamente
- [ ] Permisos granulares funcionan
- [ ] Permisos por sede funcionan
- [ ] SUPERADMIN tiene acceso total

### Rutas Protegidas

- [ ] Rutas públicas no exponen datos sensibles
- [ ] Rutas privadas redirigen a login
- [ ] API endpoints validan sesión
- [ ] API endpoints validan permisos

### Exposición de Datos

- [ ] `storage/private` NO es accesible públicamente
- [ ] `static/uploads` solo expone archivos permitidos
- [ ] No hay rutas que expongan filesystem
- [ ] No hay endpoints que devuelvan rutas internas

### Validaciones

- [ ] Validaciones server-side en todos los endpoints
- [ ] Sanitización de inputs
- [ ] Protección contra SQL injection
- [ ] Protección contra XSS

## Checklist de Monitoreo

### Logs

- [ ] Logs de aplicación configurados
- [ ] Logs de acceso configurados
- [ ] Logs de errores configurados
- [ ] Rotación de logs configurada

### Alertas

- [ ] Alertas de errores críticos
- [ ] Alertas de alta CPU
- [ ] Alertas de alta memoria
- [ ] Alertas de disco lleno

### Métricas

- [ ] Métricas de rendimiento
- [ ] Métricas de usuarios activos
- [ ] Métricas de errores
- [ ] Métricas de uptime

## Checklist de Documentación

**Documentación técnica:**

- [ ] Guía de deployment completada
- [ ] Guía de handover completada
- [ ] Guía de capacitación completada
- [ ] Auditoría de ajustes gráficos completada

**Documentación operativa:**

- [ ] Procedimientos de backup
- [ ] Procedimientos de restore
- [ ] Procedimientos de emergencia
- [ ] Contactos de soporte

## Checklist de Entrega

**Código:**

- [ ] Código en repositorio
- [ ] Tag de versión creado
- [ ] Changelog actualizado
- [ ] README actualizado

**Credenciales:**

- [ ] Credenciales de base de datos entregadas
- [ ] Credenciales de aplicación entregadas
- [ ] Credenciales de terceros (SMTP, etc.) entregadas
- [ ] Credenciales almacenadas de forma segura

**Accesos:**

- [ ] Acceso a VPS entregado
- [ ] Acceso a base de datos entregado
- [ ] Acceso a repositorio entregado
- [ ] Acceso a monitoreo entregado

## Post-Deploy Inmediato

**Pruebas manuales:**

- [ ] Login como SUPERADMIN
- [ ] Crear usuario de prueba
- [ ] Asignar permisos de prueba
- [ ] Verificar acceso por sede
- [ ] Probar exportación de reportes
- [ ] Probar subida de documentos
- [ ] Probar proceso de pago

**Verificación:**

- [ ] Verificar que no hay errores en logs
- [ ] Verificar que backups funcionan
- [ ] Verificar que monitoreo funciona
- [ ] Verificar que alertas funcionan

## Checklist de Rollback

**Si algo falla:**

- [ ] Tener backup de base de datos reciente
- [ ] Tener backup de código anterior
- [ ] Documentar procedimiento de rollback
- [ ] Probar rollback en staging

## Firma de Aceptación

**Fecha:** **\*\***\_\_\_**\*\***

**Responsable:** **\*\***\_\_\_**\*\***

**Observaciones:** **\*\***\_\_\_**\*\***
