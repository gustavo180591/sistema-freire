# Staff Training Guide

## Overview

Esta guía proporciona capacitación básica para el personal del Instituto ISFD "Paulo Freire" 1117 en el uso del Sistema de Gestión Institucional.

**Público objetivo:**

- Personal administrativo
- Personal docente
- Preceptores
- Personal de finanzas

## 1. Ingreso al Sistema

### Acceso

**URL:** [A completar en deployment]

**Requisitos:**

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conexión a internet
- Credenciales de usuario asignadas

### Primer Ingreso

1. Ir a la URL del sistema
2. Ingresar email y contraseña
3. Si es el primer ingreso, el sistema puede solicitar cambio de contraseña
4. Si está habilitado 2FA, configurar aplicación autenticadora
5. Leer y aceptar términos de uso (si aplica)

### Recuperación de Contraseña

Si olvidó la contraseña:

1. Hacer clic en "¿Olvidaste tu contraseña?"
2. Ingresar email registrado
3. Seguir instrucciones enviadas por email
4. Crear nueva contraseña segura

**Consejos de seguridad:**

- Usar contraseña única para el sistema
- No compartir credenciales
- Cerrar sesión al terminar
- No usar computadoras públicas

## 2. Gestión de Usuarios

### Crear Nuevo Usuario

**Rol requerido:** SUPERADMIN, DIRECTOR, SECRETARIO

1. Navegar a "Usuarios" en el menú
2. Hacer clic en "Nuevo Usuario"
3. Completar datos:
   - Email (único)
   - Contraseña
   - Nombre
   - Apellido
   - Teléfono (opcional)
4. Seleccionar rol
5. Seleccionar sedes a las que tiene acceso
6. Hacer clic en "Guardar"

### Editar Usuario

1. Navegar a "Usuarios"
2. Buscar usuario por nombre o email
3. Hacer clic en "Editar"
4. Modificar datos necesarios
5. Hacer clic en "Guardar"

### Asignar Roles

**Roles disponibles:**

- **SUPERADMIN:** Acceso total al sistema
- **DIRECTOR:** Gestión académica y administrativa
- **SECRETARIO:** Gestión administrativa
- **PRECEPTOR:** Gestión de asistencia y seguimiento
- **DOCENTE:** Gestión de calificaciones y materiales
- **FINANZAS:** Gestión financiera
- **ALUMNO:** Acceso limitado a información personal

### Asignar Permisos por Sede

1. Al crear/editar usuario, seleccionar sedes
2. El usuario solo verá datos de las sedes asignadas
3. SUPERADMIN tiene acceso a todas las sedes por defecto

## 3. Gestión de Alumnos

### Registrar Nuevo Alumno

**Rol requerido:** SUPERADMIN, DIRECTOR, SECRETARIO

1. Navegar a "Alumnos"
2. Hacer clic en "Nuevo Alumno"
3. Completar datos personales:
   - DNI (único)
   - Nombre
   - Apellido
   - Fecha de nacimiento
   - Grupo sanguíneo (opcional)
   - Teléfono
   - Contacto familiar
   - Teléfono de contacto
   - Relación con contacto
   - Dirección
   - Localidad
   - Código postal
   - Colegio secundario
   - Año de egreso secundario
4. Seleccionar carrera
5. Seleccionar sede
6. Hacer clic en "Guardar"

### Editar Datos de Alumno

1. Navegar a "Alumnos"
2. Buscar alumno por nombre o DNI
3. Hacer clic en "Editar"
4. Modificar datos necesarios
5. Hacer clic en "Guardar"

### Ver Historial del Alumno

1. Buscar alumno
2. Hacer clic en "Ver Historial"
3. Revisar:
   - Historial académico anual
   - Materias cursadas
   - Calificaciones
   - Asistencia
   - Estado financiero
   - Documentos
   - Seguimientos

### Cambiar Estado de Alumno

**Estados disponibles:**

- **ACTIVO:** Alumno regular
- **INACTIVO:** Alumno no activo temporalmente
- **EGRESADO:** Alumno egresado
- **BAJA:** Alumno dado de baja

1. Editar alumno
2. Cambiar estado
3. Agregar observaciones si es necesario
4. Guardar

## 4. Gestión Académica

### Carreras

**Rol requerido:** SUPERADMIN, DIRECTOR

**Crear carrera:**

1. Navegar a "Carreras"
2. Hacer clic en "Nueva Carrera"
3. Completar:
   - Código
   - Nombre
   - Campo de formación
   - Resolución (opcional)
   - Duración en años
4. Asignar a sedes
5. Guardar

### Materias

**Rol requerido:** SUPERADMIN, DIRECTOR

**Crear materia:**

1. Navegar a "Materias"
2. Hacer clic en "Nueva Materia"
3. Completar:
   - Código (único)
   - Nombre
   - Tipo de materia
   - Campo de formación
   - Año
   - Modalidad de acreditación
   - Umbral de aprobación
   - Umbral de promoción
   - Es anual
   - Horas semanales (opcional)
4. Asignar a carrera
5. Configurar correlatividades
6. Guardar

### Comisiones

**Rol requerido:** SUPERADMIN, DIRECTOR

**Crear comisión:**

1. Navegar a "Comisiones"
2. Hacer clic en "Nueva Comisión"
3. Completar:
   - Materia
   - Sede
   - Año lectivo
   - Docente
   - Horario (opcional)
4. Guardar

### Inscripciones

**Rol requerido:** SUPERADMIN, DIRECTOR, SECRETARIO

**Inscribir alumno en materia:**

1. Navegar a "Inscripciones"
2. Seleccionar alumno
3. Seleccionar materia/comisión
4. Guardar

## 5. Gestión Financiera

### Cargos a Alumnos

**Rol requerido:** SUPERADMIN, FINANZAS

**Crear cargo:**

1. Navegar a "Finanzas"
2. Hacer clic en "Nuevo Cargo"
3. Completar:
   - Alumno
   - Concepto de cobro
   - Periodo
   - Monto
   - Fecha de vencimiento (opcional)
4. Guardar

### Registrar Pago

**Rol requerido:** SUPERADMIN, FINANZAS

1. Navegar a "Finanzas"
2. Buscar alumno
3. Hacer clic en "Registrar Pago"
4. Completar:
   - Monto
   - Método de pago
   - Referencia (número de comprobante)
   - Notas (opcional)
5. Seleccionar cargos a aplicar
6. Guardar
7. Generar recibo

### Convenios de Pago

**Rol requerido:** SUPERADMIN, FINANZAS

**Crear convenio:**

1. Navegar a "Finanzas" → "Convenios"
2. Hacer clic en "Nuevo Convenio"
3. Completar:
   - Alumno
   - Monto total
   - Cantidad de cuotas
   - Fecha de primera cuota
   - Intervalo entre cuotas
4. Generar cuotas
5. Guardar

**Registrar pago de cuota:**

1. Buscar convenio
2. Seleccionar cuota
3. Registrar pago
4. Actualizar estado

### Recibos

**Rol requerido:** SUPERADMIN, FINANZAS

**Generar recibo:**

1. Al registrar pago, el sistema genera recibo automáticamente
2. Navegar a "Recibos"
3. Buscar recibo por número o alumno
4. Hacer clic en "Imprimir" o "Descargar PDF"

**Anular recibo:**

1. Buscar recibo
2. Hacer clic en "Anular"
3. Ingresar motivo
4. Confirmar

## 6. Asistencia

### Registrar Asistencia

**Rol requerido:** SUPERADMIN, PRECEPTOR, DOCENTE

1. Navegar a "Asistencia"
2. Seleccionar materia y comisión
3. Seleccionar fecha
4. Marcar asistencia:
   - Presente: check
   - Ausente: uncheck
5. Agregar notas para ausencias (opcional):
   - "Con observación" - ausencia justificada provisional
   - "Sin observación" - ausencia sin justificar
6. Guardar

### Ver Reportes de Asistencia

**Rol requerido:** SUPERADMIN, PRECEPTOR

1. Navegar a "Asistencia" → "Reportes"
2. Seleccionar filtros:
   - Materia
   - Comisión
   - Rango de fechas
3. Ver estadísticas:
   - Total de registros
   - Presentes
   - Ausentes
   - Ausencias con/sin observación
   - Promedio de asistencia
4. Exportar a CSV si es necesario

## 7. Gestión Documental

### Subir Documentos de Alumnos

**Rol requerido:** SUPERADMIN, DIRECTOR, SECRETARIO

1. Navegar a "Alumnos"
2. Buscar alumno
3. Hacer clic en "Documentos"
4. Hacer clic en "Subir Documento"
5. Completar:
   - Tipo de documento
   - Nombre
   - Archivo (PDF, máximo 10MB)
6. Guardar
7. Marcar como verificado si corresponde

### Subir Materiales de Clase

**Rol requerido:** SUPERADMIN, DOCENTE

1. Navegar a "Materias"
2. Seleccionar materia
3. Hacer clic en "Materiales"
4. Hacer clic en "Subir Material"
5. Completar:
   - Título
   - Descripción (opcional)
   - Archivo
6. Guardar

### Ver Documentos

1. Navegar a sección correspondiente
2. Hacer clic en documento
3. El sistema registra acceso
4. Descargar o visualizar

## 8. Reportes

### Acceder a Reportes

**Rol requerido:** Según tipo de reporte

1. Navegar a "Reportes"
2. Seleccionar tab según rol:
   - **Institucional:** SUPERADMIN
   - **Financiero:** FINANZAS
   - **Académico:** DOCENTE
   - **Asistencia:** PRECEPTOR

### Ver Métricas

Cada reporte muestra:

- KPIs principales
- Visualizaciones
- Filtros disponibles

### Exportar a CSV

1. Aplicar filtros si es necesario
2. Hacer clic en "Exportar CSV"
3. El archivo se descarga automáticamente
4. Abrir en Excel u otra herramienta

## 9. Buenas Prácticas

### Seguridad

- **Nunca compartir credenciales**
- **Cerrar sesión al terminar**
- **Usar contraseñas seguras**
- **Reportar accesos sospechosos**
- **No usar computadoras compartidas**

### Datos

- **Verificar datos antes de guardar**
- **Usar observaciones para clarificar situaciones**
- **Mantener datos actualizados**
- **Hacer backups periódicos de datos críticos**

### Procesos

- **Seguir procedimientos establecidos**
- **Documentar procesos internos**
- **Comunicar cambios a personal afectado**
- **Solicitar ayuda cuando sea necesario**

### Comunicación

- **Usar el sistema para registrar todo**
- **Notificar errores o problemas**
- **Sugerir mejoras constructivas**
- **Participar en capacitaciones**

## 10. Troubleshooting Común

### No puedo ingresar

**Soluciones:**

- Verificar email y contraseña
- Verificar conexión a internet
- Solicitar recuperación de contraseña
- Contactar administrador si persiste

### No veo datos esperados

**Soluciones:**

- Verificar que tienes el rol correcto
- Verificar que tienes acceso a la sede
- Verificar filtros aplicados
- Contactar administrador si persiste

### Error al guardar

**Soluciones:**

- Verificar que todos los campos requeridos están completos
- Verificar que los datos son válidos
- Reintentar después de unos segundos
- Contactar soporte si persiste

### Documento no sube

**Soluciones:**

- Verificar tamaño del archivo (máximo 10MB)
- Verificar formato del archivo (PDF)
- Verificar conexión a internet
- Intentar con otro navegador

## 11. Recursos Adicionales

### Documentación

- Guía de deployment: `docs/VPS_DEPLOYMENT_GUIDE.md`
- Guía de handover: `docs/SYSTEM_HANDOVER_GUIDE.md`
- Documentación de módulos específicos

### Soporte

**Email:** [A completar]

**Horario:** Lunes a Viernes, 9:00-18:00 (UTC-3)

### Capacitación Adicional

- Solicitar capacitación específica por módulo
- Solicitar capacitación para nuevos usuarios
- Solicitar actualización de capacitación periódica

## 12. Evaluación de Capacitación

### Checklist de Comprensión

Después de la capacitación, el personal debería poder:

**Usuarios administrativos:**

- [ ] Crear y gestionar usuarios
- [ ] Registrar y gestionar alumnos
- [ ] Gestionar carreras y materias
- [ ] Gestionar inscripciones
- [ ] Generar reportes institucionales

**Personal de finanzas:**

- [ ] Crear cargos
- [ ] Registrar pagos
- [ ] Generar recibos
- [ ] Gestionar convenios
- [ ] Generar reportes financieros

**Preceptores:**

- [ ] Registrar asistencia
- [ ] Ver reportes de asistencia
- [ ] Gestionar seguimientos
- [ ] Ver historial de alumnos

**Docentes:**

- [ ] Registrar calificaciones
- [ ] Subir materiales de clase
- [ ] Ver reportes académicos
- [ ] Gestionar evaluaciones

### Certificación

El personal debe firmar este documento confirmando que:

- [ ] Recibió capacitación
- [ ] Comprendió el funcionamiento básico
- [ ] Tiene acceso a documentación
- [ ] Sabe cómo solicitar soporte

**Nombre:** **\*\***\_\_\_**\*\***

**Cargo:** **\*\***\_\_\_**\*\***

**Fecha:** **\*\***\_\_\_**\*\***

**Firma:** **\*\***\_\_\_**\*\***
