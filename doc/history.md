# Sistema Integral de Gestión Académica y Administrativa
Instituto Superior de Formación Docente – Paulo Freire

---

# 1. Historia de Usuario Fundacional
Como equipo directivo del Instituto Superior de Formación Docente Paulo Freire,
queremos implementar un sistema integral de gestión académica, financiera y de asistencia
exclusivo para nuestra institución,
para centralizar los procesos administrativos, garantizar el cumplimiento del reglamento
académico interno,
controlar correlatividades, regularidad y estado financiero de los estudiantes,
y asegurar trazabilidad formal de todas las acciones institucionales.

---

# 2. Propósito del Sistema
El sistema deberá:
- Formalizar digitalmente la gestión académica.
- Integrar la gestión financiera con la académica.
- Automatizar validaciones institucionales.
- Respetar las normas internas del Instituto.
- Generar documentación oficial exigida por inspección.
- Registrar y auditar todas las acciones críticas.

El sistema será desarrollado exclusivamente para el Instituto Paulo Freire.

---

# 3. Épicas del Proyecto
1. Autenticación y gestión de roles.
2. Gestión académica institucional.
3. Motor de validación académica.
4. Gestión de inscripciones.
5. Gestión financiera integrada.
6. Control de asistencia y regularidad.
7. Generación de reportes oficiales.
8. Auditoría y trazabilidad institucional.

---

# 4. Historias de Usuario por Actor

---

## 4.1 Dirección
Como Dirección,
quiero visualizar el estado académico y financiero general del Instituto,
para tomar decisiones estratégicas con información consolidada.

### Criterios de aceptación:
- Visualizar total de alumnos activos.
- Visualizar alumnos con deuda.
- Visualizar alumnos en riesgo académico.
- Acceder a reportes oficiales.
- Consultar métricas generales institucionales.

---

## 4.2 Secretaría Académica
Como Secretaría,
quiero gestionar carreras, materias, correlatividades y comisiones,
para mantener actualizada la estructura académica institucional.

### Criterios de aceptación:
- Crear y editar carreras.
- Crear y editar materias.
- Configurar correlatividades.
- Gestionar comisiones.
- Generar actas oficiales.
- Consultar historial académico completo.

---

## 4.3 Docente
Como Docente,
quiero cargar notas, registrar asistencia digitalmente y acceder a mi información salarial,
para llevar control formal y actualizado de mis comisiones y disponer de mi documentación laboral.

### Criterios de aceptación:
- Visualizar únicamente mis comisiones asignadas.
- Registrar asistencia por fecha.
- Cargar calificaciones.
- Consultar estado académico del alumno.
- Generar listado de regularidad.
- Visualizar listado de recibos de sueldo disponibles.
- Descargar recibos de sueldo en formato PDF.
- Acceder únicamente a sus propios recibos.
- Visualizar recibos ordenados por período.
- Visualizar estado del recibo (pagado / pendiente).
- Registrar en auditoría cada descarga de recibo.

---

## 4.4 Alumno
Como Alumno,
quiero inscribirme online a cursadas y mesas de examen,
para gestionar mi trayectoria académica sin trámites presenciales.

### Criterios de aceptación:
- Visualizar materias disponibles para inscripción.
- Validación automática de correlatividades.
- Visualización de estado financiero.
- Bloqueo automático en caso de deuda.
- Visualización de historial académico y avance de carrera.

---

## 4.5 Área Financiera
Como responsable financiero,
quiero registrar pagos, gestionar documentación salarial y visualizar morosidad,
para controlar el flujo financiero institucional y la administración de haberes.

### Criterios de aceptación:
- Registrar pagos manuales.
- Aplicar becas y descuentos.
- Visualizar estado financiero por alumno.
- Generar reportes de morosidad.
- Bloquear acciones académicas cuando exista deuda.
- Generar y cargar recibos de sueldo para docentes.
- Asociar recibos a cada docente correspondiente.
- Gestionar estados de recibos (pagado / pendiente / anulado).
- Permitir exportación y almacenamiento de recibos en formato PDF.

---

# 5. Historias Críticas de Negocio

---

## 5.1 Validación de Correlatividades
Como sistema,
debo impedir la inscripción a materias cuando no se hayan aprobado las correlativas definidas
por la institución,
para cumplir el reglamento académico interno.

### Criterios de aceptación:
- Validación automática en tiempo real.
- Bloqueo inmediato si no cumple requisitos.
- Registro del intento en auditoría.

---

## 5.2 Control de Regularidad
Como sistema,
debo calcular automáticamente la regularidad del alumno en función de su asistencia,
para determinar si puede rendir examen.

### Criterios de aceptación:
- Cálculo automático de porcentaje de asistencia.
- Comparación con porcentaje mínimo configurado.
- Cambio automático de estado (Regular / Libre).
- Generación de alerta administrativa.

---

## 5.3 Bloqueo por Deuda
Como institución,
quiero que el sistema bloquee automáticamente acciones académicas cuando exista deuda,
para garantizar el cumplimiento financiero.

### Criterios de aceptación:
- Si deuda > 0:
 - No permitir inscripción a cursadas.
 - No permitir inscripción a mesas.
 - No permitir generación de certificados.
- Registrar intento bloqueado en auditoría.

---

# 6. Historia del Sistema de Reportes
Como institución,
quiero generar documentación oficial digital,
para cumplir requerimientos administrativos e inspección.

### El sistema deberá generar:
- Actas de examen final.
- Libro matriz.
- Nóminas.
- Reportes académicos.
- Reportes financieros.
- Recibos de sueldo para docentes.
- Exportaciones en PDF y Excel.

---

# 7. Historia del Sistema de Auditoría
Como institución,
quiero que todas las acciones relevantes queden registradas,
para garantizar trazabilidad administrativa.

### El sistema deberá registrar:
- Creación, modificación y eliminación de datos críticos.
- Intentos de inscripción bloqueados.
- Modificaciones de notas.
- Cambios financieros.
- Generación y descarga de recibos de sueldo.
- Cambios de estado académico.
- Cierre de actas.

---

# 8. Alcance Funcional General
El sistema deberá:
- Centralizar información académica y financiera.
- Automatizar validaciones institucionales.
- Calcular regularidad automáticamente.
- Bloquear acciones según reglamento.
- Generar documentación oficial.
- Mantener auditoría completa.
- Gestionar documentación salarial docente.

---

# 9. Resultado Esperado
El sistema deberá consolidarse como una herramienta institucional que:
- Elimine procesos manuales críticos.
- Formalice digitalmente la gestión académica.
- Integre control académico y financiero.
- Garantice cumplimiento normativo interno.
- Brinde trazabilidad y seguridad administrativa.
- Digitalice y asegure la gestión de recibos de sueldo docentes.