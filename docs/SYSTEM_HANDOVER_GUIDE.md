# System Handover Guide

## Overview

Este documento describe la entrega llave en mano del Sistema de Gestión Institucional "Sistema Freire" para el Instituto ISFD "Paulo Freire" 1117.

**Fecha de entrega:** [A completar]

**Versión del sistema:** 1.0.0

**Sedes:**
- Sede Leandro N. Alem
- Sede Capiovi

## Qué Incluye el Sistema

### Módulos Implementados

**1. Gestión de Usuarios**
- Creación y gestión de usuarios
- Roles: SUPERADMIN, DIRECTOR, SECRETARIO, PRECEPTOR, DOCENTE, FINANZAS, ALUMNO
- Permisos granulares por entidad
- Autenticación con contraseña
- 2FA (TOTP) opcional
- Bloqueo de cuenta por intentos fallidos

**2. Gestión de Alumnos**
- Registro de alumnos
- Información personal y académica
- Historial anual
- Seguimiento de alumnos
- Documentación de alumnos
- Estado: ACTIVO, INACTIVO, EGRESADO, BAJA

**3. Gestión Académica**
- Carreras y planes de estudio
- Materias y correlatividades
- Comisiones
- Inscripciones
- Evaluaciones
- Calificaciones
- Regularidad académica
- Estado de cursada

**4. Gestión Financiera**
- Cargos a alumnos
- Pagos
- Recibos
- Convenios de pago
- Cuotas de convenios
- Becas
- Descuentos
- Recargos por mora
- Bloqueos financieros
- Reportes financieros

**5. Asistencia**
- Registro de asistencia
- Entradas de asistencia
- Ausencias con/sin observación
- Reportes de asistencia
- Promedios por materia y comisión

**6. Gestión Documental**
- Subida de documentos
- Documentos privados (storage/private)
- Documentos públicos (static/uploads)
- Materiales de clase
- Verificación de documentos
- Logs de acceso

**7. Reportes**
- Reportes institucionales (SUPERADMIN)
- Reportes financieros (FINANZAS)
- Reportes académicos (DOCENTE)
- Reportes de asistencia (PRECEPTOR)
- Exportación CSV
- Visualizaciones simples

**8. Gestión de Sedes**
- Soporte multi-sede
- Sede Leandro N. Alem
- Sede Capiovi
- Permisos por sede
- Filtros por sede en consultas

### Características Técnicas

**Framework:**
- SvelteKit (Svelte 5)
- TypeScript
- TailwindCSS

**Base de datos:**
- PostgreSQL
- Prisma ORM
- 33 migraciones aplicadas
- Schema validado

**Seguridad:**
- Autenticación basada en sesiones
- Permisos explícitos por rol
- Permisos por sede
- Validaciones server-side
- Sin Prisma en UI
- Sin SQL raw
- Sin exposición de rutas privadas

**Infraestructura:**
- Build optimizado para producción
- Adaptador Node.js
- Compatible con VPS
- Guía de deployment incluida

## Datos Necesarios para Operar

### Datos Iniciales Requeridos

**1. Usuarios Administrativos**
- Al menos 1 usuario SUPERADMIN
- Usuarios por rol según necesidad:
  - DIRECTOR
  - SECRETARIO
  - PRECEPTOR
  - FINANZAS

**2. Sedes**
- Sede Leandro N. Alem (creada en seed)
- Sede Capiovi (creada en seed)

**3. Carreras**
- Definir carreras ofrecidas
- Asignar carreras a sedes

**4. Materias**
- Definir materias por carrera
- Configurar correlatividades
- Asignar docentes

**5. Comisiones**
- Crear comisiones por materia
- Asignar a sedes
- Asignar a periodos académicos

**6. Alumnos**
- Importar o registrar alumnos
- Asignar a carreras
- Asignar a sedes

**7. Configuración Financiera**
- Definir conceptos de cobro
- Configurar periodos académicos
- Configurar políticas de recargos

### Datos de Configuración

**Variables de entorno:**
- `DATABASE_URL` - Conexión a base de datos
- `SESSION_SECRET` - Secret de sesiones
- `TOTP_SECRET` - Secret para 2FA
- `NODE_ENV` - production

**Configuración opcional:**
- SMTP para envío de emails
- Configuración de backups
- Configuración de monitoreo

## Accesos

### Acceso al Sistema

**URL:** [A completar en deployment]

**Credenciales iniciales:**
- Usuario SUPERADMIN: [A completar]
- Contraseña: [A completar]
- Se recomienda cambiar inmediatamente

### Acceso al VPS

**IP/Dominio:** [A completar]

**Usuario:** sistema (o usuario configurado)

**Método de acceso:** SSH

### Acceso a Base de Datos

**Host:** localhost (en VPS)

**Puerto:** 5432

**Base de datos:** sistema_freire

**Usuario:** sistema_freire_user

**Contraseña:** [A completar]

### Acceso a Repositorio

**URL:** https://github.com/gustavo180591/sistema-freire

**Rama:** main

## Responsabilidades

### Responsabilidades del Desarrollador

**Entregado:**
- Código fuente completo
- Documentación técnica
- Guía de deployment
- Guía de capacitación
- Guía de handover
- Checklist de deployment
- Script de auditoría final

**Soporte inicial:**
- 30 días de soporte post-deployment
- Resolución de bugs críticos
- Asistencia en configuración inicial
- Asistencia en migración de datos (si aplica)

**No incluido:**
- Desarrollo de nuevas features
- Rediseño de UI
- Optimización de performance (más allá de lo documentado)
- Migración de datos históricos (requiere análisis previo)
- Hosting/VPS (el cliente debe proveer)

### Responsabilidades del Cliente

**Operación:**
- Administración del sistema
- Gestión de usuarios
- Gestión de backups
- Mantenimiento de base de datos
- Renovación de dominio y SSL
- Pago de hosting/VPS

**Capacitación:**
- Capacitar al personal administrativo
- Capacitar al personal docente
- Documentar procesos internos
- Establecer políticas de uso

**Seguridad:**
- Mantener actualizaciones de seguridad
- Rotar credenciales periódicamente
- Monitorear accesos
- Responder a incidentes de seguridad

## Mantenimiento

### Mantenimiento Rutinario

**Diario:**
- Verificar que backups se ejecutaron
- Verificar logs de errores
- Verificar espacio en disco

**Semanal:**
- Revisar logs de aplicación
- Verificar performance
- Revisar accesos sospechosos

**Mensual:**
- Actualizar dependencias (con cuidado)
- Revisar certificados SSL
- Limpiar logs antiguos
- Verificar tamaño de base de datos

### Actualizaciones del Sistema

**Actualizaciones menores:**
- Seguir guía de actualización en VPS_DEPLOYMENT_GUIDE.md
- Hacer backup antes de actualizar
- Probar en staging si es posible

**Actualizaciones mayores:**
- Contactar al desarrollador
- Planificar ventana de mantenimiento
- Comunicar a usuarios

### Backups

**Backups automáticos:**
- Base de datos: diario (configurado en cron)
- Storage: semanal (configurado en rsync)
- Retención: 7 días

**Backups manuales:**
- Antes de actualizaciones
- Antes de cambios importantes
- Exportar datos críticos periódicamente

**Restore:**
- Documentado en VPS_DEPLOYMENT_GUIDE.md
- Probar restore periódicamente

## Soporte Inicial

### Canales de Soporte

**Email:** [A completar]

**Horario:** Lunes a Viernes, 9:00-18:00 (UTC-3)

**Tiempo de respuesta:**
- Crítico: 4 horas
- Alto: 24 horas
- Medio: 48 horas
- Bajo: 72 horas

### Alcance del Soporte

**Incluido:**
- Bugs que impiden funcionamiento
- Errores de configuración
- Problemas de deployment
- Dudas sobre documentación

**No incluido:**
- Nuevas funcionalidades
- Cambios en diseño
- Optimización de performance
- Migración de datos compleja
- Problemas de infraestructura del cliente

### Proceso de Reporte de Issues

1. Describir el problema detalladamente
2. Incluir pasos para reproducir
3. Incluir screenshots si aplica
4. Incluir logs relevantes
5. Enviar por email o issue tracker

## Recomendaciones

### Seguridad

**Inmediato:**
- Cambiar contraseñas por defecto
- Configurar 2FA para usuarios críticos
- Revisar permisos de usuarios
- Configurar firewall

**Ongoing:**
- Mantener software actualizado
- Monitorear accesos
- Rotar credenciales periódicamente
- Educar usuarios sobre phishing

### Performance

**Monitoreo:**
- Configurar alertas de CPU/memoria
- Monitorear tiempo de respuesta
- Revisar tamaño de base de datos
- Limpiar logs periódicamente

**Optimización:**
- Considerar cache para reportes pesados
- Considerar índices adicionales si crece data
- Considerar particionamiento de datos por sede

### Escalabilidad

**Crecimiento de usuarios:**
- El sistema soporta múltiples sedes
- Considerar balanceo de carga si crece significativamente
- Considerar base de datos separada por sede si crece mucho

**Crecimiento de datos:**
- Implementar archivado de datos antiguos
- Implementar limpieza de logs
- Considerar particionamiento de tablas grandes

## Próximos Pasos Sugeridos

### Corto Plazo (1-3 meses)

1. Completar capacitación del personal
2. Establecer políticas de uso
3. Configurar monitoreo
4. Implementar procedimientos de backup manuales
5. Migrar datos iniciales (alumnos, carreras, etc.)

### Mediano Plazo (3-6 meses)

1. Evaluar necesidad de nuevas features
2. Optimizar performance si es necesario
3. Implementar mejoras sugeridas en documentación de módulos
4. Considerar integración con otros sistemas

### Largo Plazo (6-12 meses)

1. Planificar actualización de Prisma (v6 a v7)
2. Evaluar migración a arquitectura más escalable si crece
3. Considerar desarrollo de módulos adicionales
4. Renovar contrato de soporte si es necesario

## Documentación Adicional

**Documentación técnica:**
- `docs/FINAL_DEPLOYMENT_CHECKLIST.md` - Checklist de deployment
- `docs/VPS_DEPLOYMENT_GUIDE.md` - Guía de deployment en VPS
- `docs/STAFF_TRAINING_GUIDE.md` - Guía de capacitación
- `docs/UI_FINAL_ADJUSTMENTS_AUDIT.md` - Auditoría de ajustes gráficos

**Documentación de módulos:**
- `docs/REPORTS_MODULE_*.md` - Documentación del módulo de reportes
- `docs/DOCUMENT_MANAGEMENT_*.md` - Documentación de gestión documental
- `docs/PAYMENT_AGREEMENTS_*.md` - Documentación de convenios de pago

**Scripts de prueba:**
- `scripts/test-reports-*.ts` - Tests del módulo de reportes
- `scripts/test-final-delivery-readiness.ts` - Test de entrega final

## Firma de Aceptación

**Por parte del cliente:**

Nombre: _______________

Cargo: _______________

Fecha: _______________

Firma: _______________

**Por parte del desarrollador:**

Nombre: _______________

Fecha: _______________

Firma: _______________

## Anexos

**Anexo A: Credenciales** (entregado por separado de forma segura)

**Anexo B: Diagrama de arquitectura** (si aplica)

**Anexo C: Procedimientos de emergencia** (si aplica)
