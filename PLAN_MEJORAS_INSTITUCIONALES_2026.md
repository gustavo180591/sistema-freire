# Plan de Mejoras Institucionales 2026

## Sistema Freire

**Estado:** Documento de planificación funcional y técnica  
**Fecha de inicio:** 28/08/2026  
**Objetivo:** Convertir los requerimientos institucionales relevados en reglas de negocio, funcionalidades, permisos, criterios de aceptación y etapas concretas de implementación.

---

# 1. Propósito del documento

Este documento será la referencia principal para organizar las mejoras institucionales del Sistema Freire.

Surge a partir de los requerimientos relevados institucionalmente:

1. Bloqueo académico del alumno luego de 7 exámenes desaprobados.
2. Mejorar y completar el manejo de los preceptores.
3. Registro y consulta de notas por alumno y por carrera.
4. Incorporar y reforzar tests del sistema.
5. Definir claramente qué puede hacer cada rol.
6. Organizar el acceso de cada rol desde el sidebar.
7. Revisar y eventualmente reformular el módulo de Finanzas.
8. Crear una libreta académica del alumno.
9. Incorporar para ALUMNO un acceso claro a “Inscribirse a mesa de examen”.

El propósito no es implementar todos los puntos simultáneamente, sino convertirlos en un plan ordenado y verificable.

---

# 2. Principios generales

Todas las mejoras deberán respetar los siguientes principios.

## 2.1 Seguridad real en backend

Ocultar una opción del sidebar no constituye una autorización suficiente.

Toda funcionalidad protegida deberá validar permisos también en:

- `+page.server.ts`
- acciones de formularios
- endpoints
- servicios de dominio
- operaciones sensibles sobre Prisma

Un usuario no autorizado no deberá poder ejecutar una acción mediante una petición HTTP creada manualmente.

---

## 2.2 Una única fuente de verdad

No deberán crearse estructuras paralelas para información que ya existe.

Ejemplos:

- Las notas deberán provenir del módulo académico existente.
- La libreta deberá construirse desde calificaciones, estados académicos y materias.
- Las mesas deberán utilizar el sistema de evaluaciones/inscripciones existente.
- Finanzas deberá reutilizar cargos, pagos, recibos, becas y convenios existentes.

---

## 2.3 Auditoría

Las operaciones institucionalmente sensibles deberán registrar como mínimo:

- usuario que realizó la acción;
- alumno afectado;
- fecha y hora;
- tipo de acción;
- motivo cuando corresponda;
- estado anterior;
- estado posterior.

Especialmente:

- bloqueos académicos;
- desbloqueos;
- cambios de notas;
- cambios de estados académicos;
- inscripciones a mesas;
- cancelaciones;
- modificaciones administrativas importantes.

---

## 2.4 Preservación histórica

No se deberá perder información histórica al modificar estados.

Ejemplo incorrecto:

```text
academicBlocked = false
```

sin saber que anteriormente estuvo bloqueado.

Ejemplo esperado:

```text
Bloqueado: 10/09/2026
Motivo: límite de exámenes desaprobados
Desbloqueado: 15/09/2026
Autorizado por: Director
Motivo de desbloqueo: resolución institucional
```

---

## 2.5 Implementación incremental

Cada funcionalidad deberá cerrarse antes de comenzar la siguiente:

1. definición funcional;
2. reglas de negocio;
3. diseño técnico;
4. implementación;
5. tests;
6. prueba funcional;
7. documentación;
8. commit.

---

# 3. Estado actual relevante del sistema

## 3.1 Roles existentes

El sistema contempla actualmente los siguientes roles:

- SUPERADMIN
- DIRECTOR
- SECRETARIA
- DOCENTE
- ALUMNO
- FINANZAS
- APODERADO
- PRECEPTOR
- LIQUIDADOR
- SIN_TIPO

La matriz definitiva de permisos deberá revisarse y documentarse.

---

## 3.2 Sidebar actual

Existe un sidebar que filtra opciones según roles.

Para el rol ALUMNO actualmente existe la sección:

```text
Mis Estudios
├── Perfil
├── Historial
├── Asistencia
├── Calificaciones
├── Inscripciones
└── Finanzas
```

Uno de los cambios institucionales solicitados consiste en hacer más explícito el acceso:

```text
Inscribirse a mesa de examen
```

---

## 3.3 Inscripción a mesas

Actualmente existe infraestructura para:

- obtener mesas disponibles para un alumno;
- inscribir al alumno;
- cancelar una inscripción;
- verificar que quien realiza la acción posea rol ALUMNO;
- registrar acciones relacionadas.

Por lo tanto, el objetivo no será rehacer el módulo completo, sino:

- mejorar el acceso;
- separar conceptualmente materias de mesas si corresponde;
- completar reglas de elegibilidad;
- incorporar bloqueo académico;
- reforzar tests;
- mejorar la experiencia del alumno.

---

# 4. Prioridades generales

| Prioridad   | Módulo         | Mejora                                   |
| ----------- | -------------- | ---------------------------------------- |
| P0          | Definiciones   | Cerrar reglas institucionales pendientes |
| P1          | Roles          | Matriz definitiva de permisos            |
| P1          | Sidebar        | Sidebar según rol y funcionalidad        |
| P1          | Mesas          | Acceso “Inscribirse a mesa de examen”    |
| P1          | Exámenes       | Regla de bloqueo por 7 desaprobados      |
| P2          | Preceptores    | Gestión integral del rol PRECEPTOR       |
| P2          | Calificaciones | Notas por alumno y carrera               |
| P2          | Libreta        | Libreta académica del alumno             |
| P3          | Finanzas       | Auditoría y eventual reformulación       |
| Transversal | Tests          | Cobertura de reglas críticas y permisos  |

---

# 5. Decisiones institucionales pendientes

Antes de implementar algunas funcionalidades deberán resolverse las siguientes preguntas.

## 5.1 Regla de los 7 exámenes desaprobados

Requerimiento institucional inicial:

> El alumno se bloquea cuando alcanza 7 exámenes desaprobados.

Todavía debe definirse exactamente el alcance.

### Decisión 1 — Forma de contar

Elegir una:

- [ ] 7 desaprobados totales durante toda la carrera.
- [ ] 7 desaprobados de una misma materia.
- [ ] 7 desaprobados dentro de un ciclo lectivo.
- [ ] Otra regla institucional.

**Estado:** PENDIENTE.

---

### Decisión 2 — Qué se considera desaprobado

Definir si cuentan:

| Situación                         | ¿Cuenta?     |
| --------------------------------- | ------------ |
| Examen final desaprobado          | PENDIENTE    |
| Mesa de examen desaprobada        | PENDIENTE    |
| Recuperatorio desaprobado         | PENDIENTE    |
| Parcial desaprobado               | PENDIENTE    |
| Alumno ausente                    | PENDIENTE    |
| Inscripción cancelada             | NO propuesto |
| Mesa cancelada institucionalmente | NO propuesto |
| Examen anulado                    | NO propuesto |

La implementación no deberá asumir estas reglas hasta que sean aprobadas.

---

### Decisión 3 — Efecto del bloqueo

Propuesta inicial:

El bloqueo académico debería impedir únicamente:

- nuevas inscripciones a mesas de examen.

No debería impedir:

- iniciar sesión;
- ver calificaciones;
- consultar historial;
- ver asistencia;
- consultar documentación;
- consultar finanzas;
- consultar recibos.

**Estado:** A CONFIRMAR.

---

### Decisión 4 — Desbloqueo

Definir qué roles podrán desbloquear.

Propuesta:

- SUPERADMIN
- DIRECTOR

Opcionalmente:

- SECRETARIA, con permiso específico.

Todo desbloqueo debería requerir:

- motivo obligatorio;
- usuario que autoriza;
- fecha;
- registro de auditoría.

**Estado:** PENDIENTE.

---

# 6. Fase 1 — Matriz de roles y permisos

## 6.1 Objetivo

Definir formalmente qué puede:

- ver;
- crear;
- modificar;
- eliminar;
- aprobar;
- cancelar;

cada rol del sistema.

---

## 6.2 Matriz inicial de análisis

Esta tabla es una propuesta inicial y deberá revisarse institucionalmente.

| Funcionalidad   | SUPERADMIN |         DIRECTOR |       SECRETARIA |     PRECEPTOR |               DOCENTE |            FINANZAS |      ALUMNO |
| --------------- | ---------: | ---------------: | ---------------: | ------------: | --------------------: | ------------------: | ----------: |
| Usuarios        |      Total |          Gestión | Gestión limitada |            No |                    No |                  No |          No |
| Alumnos         |      Total |          Gestión |          Gestión |      Consulta |     Consulta limitada | Consulta financiera |      Propio |
| Carreras        |      Total |          Gestión | Consulta/Gestión |      Consulta |              Consulta |                  No |      Propia |
| Materias        |      Total |          Gestión |          Gestión |      Consulta |               Propias |                  No |     Propias |
| Asistencia      |      Total |         Consulta |          Gestión |       Gestión | Gestión de sus cursos |                  No |      Propia |
| Calificaciones  |      Total |         Consulta |         Consulta |      Consulta |               Gestión |                  No |     Propias |
| Mesas de examen |      Total |          Gestión |          Gestión |      Consulta | Gestión según alcance |                  No | Inscripción |
| Finanzas        |      Total | Consulta/Gestión |          Gestión |            No |                    No |             Gestión |     Propias |
| Becas           |      Total |          Gestión |          Gestión |            No |                    No |             Gestión |      Propia |
| Documentos      |      Total |          Gestión |          Gestión | Según permiso |         Según permiso |       Según permiso |     Propios |
| Reportes        |      Total |          Gestión |          Gestión |     Limitados |             Limitados |         Financieros |          No |
| Auditoría       |      Total |         Consulta |      No/Limitada |            No |                    No |                  No |          No |

---

## 6.3 Criterios de aceptación

- [ ] Cada ruta importante tiene permiso de backend.
- [ ] Cada acción POST valida autorización.
- [ ] El sidebar refleja las mismas reglas.
- [ ] Un usuario no puede acceder manualmente escribiendo una URL prohibida.
- [ ] Los permisos críticos tienen tests.
- [ ] La matriz final queda documentada.

---

# 7. Fase 2 — Sidebar por rol

## 7.1 Objetivo

Transformar el sidebar en una representación clara de las tareas disponibles para cada rol.

No deberá mostrar opciones irrelevantes.

---

## 7.2 Sidebar propuesto para ALUMNO

```text
Mis Estudios

├── Inicio / Perfil
├── Mis materias
├── Asistencia
├── Calificaciones
├── Inscribirse a mesa de examen
├── Historial académico
├── Libreta
└── Finanzas
```

La opción:

```text
Inscribirse a mesa de examen
```

deberá ser visible únicamente para ALUMNO.

---

## 7.3 Criterios de aceptación

- [ ] ALUMNO visualiza “Inscribirse a mesa de examen”.
- [ ] El enlace apunta a la funcionalidad correcta.
- [ ] Los demás roles no visualizan esa opción como acción propia.
- [ ] El backend sigue protegiendo el acceso.
- [ ] El diseño funciona en desktop y mobile.

---

# 8. Fase 3 — Inscripción a mesas de examen

## 8.1 Objetivo

Permitir que el alumno gestione sus mesas desde una pantalla simple y segura.

---

## 8.2 Información de cada mesa

Mostrar:

- materia;
- código;
- carrera;
- sede;
- fecha;
- hora, si corresponde;
- período;
- fecha de apertura de inscripción;
- fecha de cierre;
- estado;
- situación del alumno;
- acción disponible.

Ejemplo:

```text
Matemática II
Carrera: Profesorado X
Sede: Capioví
Mesa: 15/12/2026 - 08:00

Inscripción abierta hasta: 10/12/2026

[ INSCRIBIRME ]
```

---

## 8.3 Validaciones

Antes de inscribir deberá verificarse:

- [ ] usuario autenticado;
- [ ] rol ALUMNO;
- [ ] alumno asociado al usuario;
- [ ] alumno activo;
- [ ] mesa existente;
- [ ] mesa abierta para inscripción;
- [ ] fecha actual dentro del período permitido;
- [ ] carrera compatible;
- [ ] sede compatible;
- [ ] materia compatible;
- [ ] correlativas cumplidas;
- [ ] regularidad requerida;
- [ ] inscripción no duplicada;
- [ ] alumno no bloqueado académicamente;
- [ ] otras reglas institucionales que se definan.

---

## 8.4 Inscripciones existentes

El alumno deberá poder diferenciar:

```text
DISPONIBLES
INSCRIPTO
CANCELADA
CERRADA
NO HABILITADA
```

---

## 8.5 Cancelación

Deberá definirse:

- hasta cuándo puede cancelar;
- qué ocurre después del cierre;
- si necesita motivo;
- si la cancelación genera auditoría.

---

# 9. Fase 4 — Bloqueo académico por exámenes desaprobados

## 9.1 Objetivo

Aplicar automáticamente la regla institucional de límite de desaprobaciones una vez que la definición de negocio quede cerrada.

---

## 9.2 Diseño recomendado

Evitar un único booleano sin historial.

Propuesta conceptual:

```text
StudentAcademicBlock

id
studentId
type
reason
failedExamCount
isActive

blockedAt
blockedByUserId

unblockedAt
unblockedByUserId
unblockReason

createdAt
updatedAt
```

---

## 9.3 Tipo de bloqueo inicial

```text
EXAM_FAILURE_LIMIT
```

Esto permitirá incorporar en el futuro otros bloqueos académicos sin mezclarlos.

---

## 9.4 Activación automática

Flujo propuesto:

```text
Se registra resultado de examen
        ↓
¿Resultado cuenta como desaprobado?
        ↓
       Sí
        ↓
Calcular cantidad válida de desaprobaciones
        ↓
¿Alcanzó límite institucional?
        ↓
       Sí
        ↓
Crear/activar bloqueo académico
        ↓
Impedir nuevas inscripciones a mesas
```

---

## 9.5 Desbloqueo manual

La acción deberá requerir:

- permiso específico;
- motivo obligatorio;
- registro del responsable;
- auditoría.

Nunca deberá eliminarse el registro histórico del bloqueo.

---

## 9.6 Interfaz para el alumno

Si se encuentra bloqueado:

```text
Inscripción a mesas bloqueada

Actualmente no podés inscribirte a nuevas mesas de examen
por una situación académica.

Contactá a Secretaría o Dirección.
```

No es necesario mostrar información administrativa interna que no corresponda al alumno.

---

# 10. Fase 5 — Manejo de preceptores

## 10.1 Objetivo

Definir claramente las responsabilidades del PRECEPTOR dentro del sistema.

---

## 10.2 Funciones propuestas

### Alumnos

- consultar ficha;
- consultar carrera;
- consultar sede;
- consultar año actual;
- consultar datos de contacto;
- consultar contacto familiar.

### Asistencia

- registrar asistencia;
- consultar asistencia;
- gestionar justificaciones según permiso;
- registrar llegadas/retiros;
- consultar estadísticas.

### Seguimiento

- crear observaciones;
- consultar observaciones;
- registrar incidencias;
- realizar seguimiento institucional.

### Académico

- consultar materias;
- consultar situación académica;
- consultar notas;
- no modificar calificaciones docentes salvo regla institucional expresa.

### Reportes

- asistencia;
- inasistencias;
- llegadas tardías;
- incidencias;
- seguimiento de alumnos.

---

## 10.3 Acciones que inicialmente NO deberían corresponder al preceptor

- modificar notas;
- crear carreras;
- modificar planes de estudio;
- modificar finanzas;
- generar movimientos financieros;
- administrar usuarios de alto privilegio;
- modificar configuración crítica.

---

# 11. Fase 6 — Registro de notas por alumno y carrera

## 11.1 Objetivo

Permitir una consulta institucional centralizada del recorrido académico.

---

## 11.2 Vista por alumno

Ejemplo:

```text
Alumno: Juan Pérez
DNI: 00.000.000

Carrera:
Profesorado X

Sede:
Capioví

1° AÑO
────────────────────────────────────────
Materia            Nota       Estado
Matemática I       8          Aprobada
Lengua I           7          Regular
Historia I         4          Desaprobada
```

---

## 11.3 Vista por carrera

Filtros:

- carrera;
- sede;
- ciclo lectivo;
- año;
- materia;
- alumno;
- estado académico.

---

## 11.4 Criterios de aceptación

- [ ] Las notas provienen del módulo académico real.
- [ ] No se duplican calificaciones.
- [ ] Se diferencia cursado de examen final.
- [ ] Se puede conocer el estado de cada materia.
- [ ] Se respetan permisos por rol.
- [ ] Los cambios de nota importantes quedan auditados.

---

# 12. Fase 7 — Libreta del alumno

## 12.1 Objetivo

Crear una vista consolidada del historial académico del alumno.

---

## 12.2 Información general

Cabecera:

- nombre y apellido;
- DNI;
- carrera;
- sede;
- localidad;
- ciclo/año de ingreso;
- estado del alumno.

---

## 12.3 Información académica

Por cada materia:

- año;
- código;
- nombre;
- condición;
- regularidad;
- nota de cursado;
- nota final;
- fecha de aprobación;
- estado.

---

## 12.4 Resumen

Mostrar:

- cantidad total de materias;
- aprobadas;
- pendientes;
- regularizadas;
- promocionadas;
- promedio;
- progreso porcentual de carrera.

---

## 12.5 Acciones futuras

```text
[ Ver libreta ]
[ Imprimir ]
[ Exportar PDF ]
```

La versión PDF deberá generarse desde los mismos datos y no desde una tabla paralela.

---

# 13. Fase 8 — Revisión integral de Finanzas

## 13.1 Objetivo

Antes de reformular Finanzas, realizar una auditoría funcional completa.

No comenzar reescribiendo el módulo.

---

## 13.2 Aspectos a revisar

### Alumno

- deuda total;
- cuotas;
- pagos;
- beca;
- convenios;
- recibos;
- bloqueos financieros.

### Finanzas / Secretaría

- cargos;
- cobros;
- recibos;
- becas;
- convenios;
- deuda;
- movimientos;
- reportes;
- configuración.

---

## 13.3 Preguntas de auditoría

Para cada pantalla:

```text
¿Se utiliza?
¿La información es clara?
¿Está duplicada?
¿Es necesaria?
¿Está automatizada?
¿Puede simplificarse?
¿Tiene reglas de negocio dispersas?
¿Tiene validación de backend?
¿Tiene auditoría?
¿Tiene tests?
```

---

## 13.4 Resultado esperado

Crear posteriormente un documento específico:

```text
docs/FINANZAS_AUDITORIA_Y_REFORMULACION_2026.md
```

antes de realizar cambios estructurales importantes.

---

# 14. Tests

## 14.1 Principio

Los tests no serán una fase exclusivamente final.

Cada funcionalidad deberá incorporar sus pruebas antes de considerarse terminada.

---

## 14.2 Tests del bloqueo académico

Casos mínimos una vez definida la regla:

```text
0 desaprobados
→ no bloqueado

6 desaprobados
→ no bloqueado

7 desaprobados
→ bloqueado

más de 7
→ continúa bloqueado
```

Además:

```text
aprobado
→ no incrementa contador

mesa cancelada
→ no incrementa

inscripción cancelada
→ no incrementa

examen no computable
→ no incrementa
```

Los detalles dependerán de la definición institucional final.

---

## 14.3 Tests de inscripción

- alumno habilitado puede inscribirse;
- alumno no elegible no puede;
- inscripción duplicada rechazada;
- inscripción fuera de fecha rechazada;
- carrera incorrecta rechazada;
- sede incorrecta rechazada;
- correlativas incumplidas rechazadas;
- bloqueo académico rechaza inscripción;
- POST manual tampoco evade la validación.

---

## 14.4 Tests de roles

Para cada funcionalidad crítica:

```text
rol autorizado
→ acceso permitido

rol no autorizado
→ 403 / redirección segura

link oculto
→ pero backend también protegido
```

---

# 15. Arquitectura de permisos

El objetivo final es evitar reglas dispersas como:

```ts
if (
	role === 'SUPERADMIN' ||
	role === 'DIRECTOR' ||
	role === 'SECRETARIA'
) {
	...
}
```

en decenas de archivos diferentes.

Se deberá analizar progresivamente una estrategia centralizada basada en:

```text
ROL
+
ENTIDAD
+
OPERACIÓN
```

Ejemplo:

```text
STUDENT      read
STUDENT      update
GRADE        read
GRADE        update
EXAM         create
EXAM         register
FINANCE      read
FINANCE      update
```

El sidebar deberá derivar sus accesos de reglas coherentes con estas autorizaciones.

---

# 16. Auditoría obligatoria

Deberán revisarse especialmente:

- cambios de notas;
- cambios de estado del alumno;
- bloqueos académicos;
- desbloqueos académicos;
- inscripciones a examen;
- cancelaciones;
- cambios de permisos;
- cambios de roles;
- movimientos financieros;
- anulaciones de recibos/pagos.

---

# 17. Orden de implementación

## Etapa 0 — Cerrar definiciones

- [ ] definir exactamente regla de 7 desaprobados;
- [ ] definir quién desbloquea;
- [ ] definir qué cuenta como intento;
- [ ] aprobar matriz inicial de roles.

---

## Etapa 1 — Roles y Sidebar

- [ ] auditar permisos existentes;
- [ ] definir matriz definitiva;
- [ ] ordenar sidebar por rol;
- [ ] proteger backend;
- [ ] tests de autorización.

---

## Etapa 2 — Mesas del alumno

- [ ] agregar acceso claro “Inscribirse a mesa de examen”;
- [ ] revisar interfaz actual;
- [ ] separar inscripción a materia de inscripción a examen si fuera necesario;
- [ ] revisar elegibilidad;
- [ ] revisar cancelaciones;
- [ ] agregar tests.

---

## Etapa 3 — Bloqueo académico

- [ ] diseño de datos;
- [ ] migración;
- [ ] servicio de bloqueo;
- [ ] integración con resultado de examen;
- [ ] integración con inscripción a mesa;
- [ ] desbloqueo autorizado;
- [ ] auditoría;
- [ ] tests.

---

## Etapa 4 — Preceptores

- [ ] relevamiento del flujo real;
- [ ] permisos;
- [ ] alumnos;
- [ ] asistencia;
- [ ] seguimiento;
- [ ] incidencias;
- [ ] reportes;
- [ ] tests.

---

## Etapa 5 — Notas institucionales

- [ ] vista por alumno;
- [ ] vista por carrera;
- [ ] filtros;
- [ ] permisos;
- [ ] auditoría;
- [ ] tests.

---

## Etapa 6 — Libreta

- [ ] diseño;
- [ ] servicio de consolidación;
- [ ] vista web;
- [ ] impresión;
- [ ] PDF;
- [ ] tests.

---

## Etapa 7 — Finanzas

- [ ] auditoría completa;
- [ ] detectar duplicaciones;
- [ ] revisar UX;
- [ ] revisar reglas;
- [ ] definir plan específico;
- [ ] implementar únicamente después de aprobar ese plan.

---

# 18. Definición de terminado

Una mejora se considerará terminada únicamente cuando:

- [ ] regla institucional aprobada;
- [ ] backend implementado;
- [ ] frontend implementado;
- [ ] permisos implementados;
- [ ] auditoría implementada cuando corresponda;
- [ ] tests aprobados;
- [ ] `npm run format` aprobado;
- [ ] `npm run check` aprobado;
- [ ] `npm run build` aprobado;
- [ ] prueba funcional realizada;
- [ ] documentación actualizada;
- [ ] commit realizado.

---

# 19. Comandos de validación generales

Antes de cerrar cada etapa:

```bash
npm run format
npm run check
npm run build
```

Para cambios con cobertura de tests:

```bash
npm test
```

Y antes de commitear:

```bash
git diff --check
git status
git diff
```

---

# 20. Seguimiento

Utilizar los siguientes estados:

| Estado                | Significado                     |
| --------------------- | ------------------------------- |
| PENDIENTE             | Todavía no iniciado             |
| DEFINICIÓN            | Regla de negocio en análisis    |
| LISTO PARA DESARROLLO | Reglas cerradas                 |
| EN DESARROLLO         | Implementación activa           |
| EN PRUEBA             | Código terminado, validando     |
| COMPLETADO            | Implementado y validado         |
| BLOQUEADO             | Requiere decisión o dependencia |

---

# 21. Estado inicial

| Mejora                                | Estado                     |
| ------------------------------------- | -------------------------- |
| Matriz definitiva de roles            | DEFINICIÓN                 |
| Sidebar por rol                       | DEFINICIÓN                 |
| Acceso “Inscribirse a mesa de examen” | LISTO PARA ANÁLISIS        |
| Inscripción a mesas                   | EXISTE / REQUIERE REVISIÓN |
| Regla de 7 desaprobados               | DEFINICIÓN                 |
| Bloqueo académico                     | PENDIENTE                  |
| Manejo integral de preceptores        | PENDIENTE                  |
| Notas por alumno y carrera            | PENDIENTE                  |
| Libreta del alumno                    | PENDIENTE                  |
| Reformulación de Finanzas             | PENDIENTE DE AUDITORÍA     |
| Tests transversales                   | EN PROGRESO                |

---

# 22. Próximo paso recomendado

El primer trabajo funcional a realizar después de aprobar este documento será:

```text
FASE 1
MATRIZ DE ROLES Y SIDEBAR
```

Dentro de esa fase, el primer cambio visible podrá ser:

```text
ALUMNO
→ Sidebar
→ “Inscribirse a mesa de examen”
```

aprovechando la infraestructura de inscripción a mesas que ya existe.

Paralelamente se deberá cerrar la definición institucional exacta de la regla:

```text
“7 exámenes desaprobados”
```

antes de crear cualquier migración o lógica automática de bloqueo.

---

# 23. Registro de decisiones

Toda decisión nueva deberá agregarse aquí.

| Fecha      | Decisión                                                      | Responsable / origen       | Impacto            |
| ---------- | ------------------------------------------------------------- | -------------------------- | ------------------ |
| 28/08/2026 | Crear Plan de Mejoras Institucionales 2026                    | Relevamiento institucional | General            |
| 28/08/2026 | Incorporar acceso explícito a inscripción a mesas para ALUMNO | Relevamiento institucional | Sidebar / Exámenes |
| 28/08/2026 | Analizar bloqueo al alcanzar 7 exámenes desaprobados          | Relevamiento institucional | Académico          |
| 28/08/2026 | Diseñar libreta académica del alumno                          | Relevamiento institucional | Académico          |
| 28/08/2026 | Revisar integralmente funciones de PRECEPTOR                  | Relevamiento institucional | Roles / Preceptor  |
| 28/08/2026 | Auditar Finanzas antes de reformular                          | Planificación técnica      | Finanzas           |

---

# 24. Nota final

Este documento define el rumbo funcional.

No implica que todas las decisiones aquí propuestas estén aprobadas automáticamente.

Los puntos identificados como:

```text
PENDIENTE
DEFINICIÓN
A CONFIRMAR
```

deberán resolverse antes de implementar reglas que puedan afectar:

- trayectoria académica;
- calificaciones;
- bloqueo de alumnos;
- permisos;
- finanzas;
- datos históricos.
