# Guía de Estados Académicos del Alumno

## Definición de Estados

El sistema utiliza el enum `StudentStatus` en `prisma/schema.prisma` con los siguientes valores:

### ACTIVE (Activo)
- **Descripción:** Alumno con matrícula vigente y en condiciones normales de cursado
- **Cuándo usar:** Alumnos inscriptos, cursando materias, con acceso completo al sistema
- **Permisos:** Acceso completo a plataforma, inscripción a materias, carga de trabajos, exámenes
- **Restricciones:** Ninguna
- **Transiciones posibles:** → INACTIVE, → SUSPENDED, → GRADUATED

### INACTIVE (Inactivo)
- **Descripción:** Alumno con matrícula suspendida temporalmente o en proceso de baja
- **Cuándo usar:** Alumnos que no cursan el año actual, en pausa académica, o en trámite de baja
- **Permisos:** Acceso limitado (solo consulta de historial), sin inscripción a materias
- **Restricciones:** No puede inscribirse a materias, no puede cargar trabajos, no puede rendir exámenes
- **Transiciones posibles:** → ACTIVE (reactivación), → GRADUATED (si cumple requisitos)

### SUSPENDED (Suspendido)
- **Descripción:** Alumno con sanción disciplinaria o académica vigente
- **Cuándo usar:** Alumnos con sanciones temporales, falta de pago, incumplimiento de reglamento
- **Permisos:** Acceso muy limitado (solo notificaciones), sin actividades académicas
- **Restricciones:** No puede cursar, no puede rendir exámenes, no puede acceder a materiales
- **Transiciones posibles:** → ACTIVE (al levantar sanción), → INACTIVE

### GRADUATED (Egresado)
- **Descripción:** Alumno que ha completado todos los requisitos de la carrera
- **Cuándo usar:** Alumnos que aprobaron todas las materias y cumplen requisitos de egreso
- **Permisos:** Acceso solo a certificados, historial y constancias
- **Restricciones:** No puede inscribirse a materias, no puede cursar
- **Transiciones posibles:** Ninguna (estado final)

## Reglas de Negocio

### Cambios de Estado
1. **Solo roles autorizados** pueden cambiar estados: SUPERADMIN, DIRECTOR, SECRETARIA
2. **Todo cambio de estado debe ser auditado** con motivo y responsable
3. **No se puede cambiar a GRADUATED** automáticamente - requiere validación de requisitos
4. **Cambio a SUSPENDED** requiere justificación obligatoria
5. **Cambio a INACTIVE** debe notificar al alumno (email o notificación)

### Validaciones por Estado
- **ACTIVE:** Sin restricciones
- **INACTIVE:** Bloquear inscripción a materias, exámenes, carga de trabajos
- **SUSPENDED:** Bloquear todas las actividades académicas, mostrar advertencia en UI
- **GRADUATED:** Mostrar badge de egresado, permitir solo consulta y certificados

### Indicadores Visuales en UI
- **ACTIVE:** Badge verde "Activo"
- **INACTIVE:** Badge amarillo "Inactivo"
- **SUSPENDED:** Badge rojo "Suspendido" con icono de advertencia
- **GRADUATED:** Badge azul "Egresado" con icono de diploma

## Flujo de Cambio de Estado

```
[ACTIVO] ←→ [INACTIVO]
    ↓           ↑
[SUSPENDIDO] ←┘
    ↓
[GRADUADO] (estado final)
```

## Motivos de Cambio de Estado

### Motivos para INACTIVE
- Solicitud voluntaria del alumno
- No renovación de matrícula
- Problemas de salud (licencia médica)
- Situación familiar excepcional
- Trámite de transferencia a otra institución

### Motivos para SUSPENDED
- Sanción disciplinaria
- Deuda financiera morosa
- Incumplimiento de reglamento
- Falta de documentación obligatoria
- Fraude académico

### Motivos para GRADUATED
- Aprobación de todas las materias del plan de estudio
- Cumplimiento de requisitos de egreso (prácticas, tesis, etc.)
- Verificación administrativa completa

## Implementación Técnica

### Backend
- **Validación de permisos:** `checkPermission(user, 'STUDENT', 'update')`
- **Auditoría:** `auditLog` con action='UPDATE', entityType='STUDENT_STATUS'
- **Motivo obligatorio:** Para cambios a SUSPENDED y INACTIVE
- **Notificación:** Email al alumno cuando cambia su estado

### Frontend
- **Selector de estado** en modal de edición de alumno
- **Campo de motivo** obligatorio para ciertos cambios
- **Confirmación** con advertencia de consecuencias
- **Badge visible** en listado, detalle, historial y seguimiento
- **Bloqueo de acciones** según estado (inscripciones, exámenes, etc.)

## Seguridad y Auditoría

- **Todo cambio de estado se registra en AuditLog** con:
  - Usuario que realizó el cambio
  - Estado anterior y nuevo
  - Motivo del cambio
  - Fecha y hora
  - IP del usuario (si está disponible)

- **No se permite cambio de estado sin autenticación**
- **Roles sin permiso no ven el selector de estado**
- **Cambios a GRADUATED requieren doble confirmación**
