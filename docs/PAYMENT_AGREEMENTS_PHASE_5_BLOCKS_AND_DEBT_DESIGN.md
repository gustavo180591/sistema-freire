# Payment Agreements - Phase 5.0: Diseño técnico de bloqueos, deuda y estado financiero

## Resumen del diagnóstico

### Estado actual del sistema

**Schema existente:**
- `FinancialBlock`: Tiene campos para excepciones (`exceptionSource`, `exceptionAgreementId`)
- `FinancialBlockExceptionSource`: Enum con `MANUAL` y `PAYMENT_AGREEMENT`
- `StudentCharge`: Tiene `status` (PENDING, PARTIAL, PAID, CANCELLED), `paidAmount`, `finalAmount`, `isOverdue`, `overdueSince`
- `PaymentAgreement`: Tiene `status` (DRAFT, ACTIVE, COMPLETED, CANCELLED, DEFAULTED), `originalDebt`, `agreedAmount`, `paidAmount`, `pendingAmount`
- `PaymentAgreementInstallment`: Tiene `status` (PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, WAIVED), `paidAmount`, `pendingAmount`, `overdueSince`
- `PaymentAgreementChargeRelation`: Tiene `originalChargeStatus`, `newStatus`, `relationType` (REFINANCED)

**Enums existentes:**
- `ChargeStatus`: PENDING, PARTIAL, PAID, CANCELLED (NO tiene REFINANCED)
- `PaymentAgreementEventType`: CREATED, ACTIVATED, MODIFIED, CANCELLED, REFINANCED, INSTALLMENT_PAID, INSTALLMENT_OVERDUE, DEFAULTED, STATUS_CHANGED, BLOCK_EXCEPTION, BLOCK_REACTIVATED (YA tiene los eventos necesarios)

**Lógica existente en FinancialService:**
- `calculateDebtSummary()`: Calcula deuda basándose en `StudentCharge` con status PENDING/PARTIAL
- `checkFinancialBlock()`: Verifica si el alumno tiene bloqueos activos
- `evaluateAndApplyFinancialBlock()`: Aplica bloqueos basándose en deuda vencida
- `getStudentFinancialData()`: Obtiene datos financieros del alumno (cuotas, pagos, recibos, bloqueos)

**Lógica existente en PaymentAgreementService:**
- `activateAgreement()`: Activa convenio (DRAFT -> ACTIVE) pero NO modifica las cuotas originales
- `getAgreementSummary()`: Calcula resumen del convenio (cuotas pendientes, vencidas)
- `registerInstallmentPayment()`: Registra pagos de cuotas

**Lógica existente en reportes financieros:**
- `getFinancialReport()`: Calcula deuda basándose en `StudentCharge` (no considera convenios)

### Problemas identificados

1. **Duplicación de deuda:** Los reportes financieros suman deuda original sin considerar convenios activos
2. **Sin impacto en bloqueos:** La activación de un convenio no genera excepciones de bloqueo automáticamente
3. **Cuotas originales intactas:** Las cuotas originales mantienen su status original (PENDING) aunque estén cubiertas por convenio
4. **Sin detección de mora:** No hay lógica para marcar cuotas de convenio como OVERDUE
5. **Sin detección de incumplimiento:** No hay lógica para marcar convenios como DEFAULTED
6. **Sin detección de completado:** No hay lógica para marcar convenios como COMPLETED
7. **Sin cálculo de deuda efectiva:** No hay método para calcular deuda real considerando convenios

---

## Respuestas a las preguntas de diseño

### 1. ¿Qué pasa con la deuda original cuando se activa un convenio?

**Respuesta:** La deuda original NO se modifica destructivamente. El convenio crea una `PaymentAgreementChargeRelation` que:
- Guarda un snapshot del estado original (`originalChargeStatus`, `originalChargeAmount`, `originalChargePaidAmount`)
- Tiene `relationType = REFINANCED`
- NO cambia el status de `StudentCharge`

**Propuesta:** NO cambiar `StudentCharge.status` en Fase 5.1. Usar `PaymentAgreementChargeRelation` para saber qué cargos están cubiertos por convenio.

### 2. ¿La deuda original sigue apareciendo como deuda exigible?

**Respuesta:** Actualmente SÍ. Las cuotas originales mantienen status `PENDING` aunque estén cubiertas por convenio.

**Propuesta:** La deuda original sigue existiendo pero se calcula "deuda efectiva" excluyendo cargos cubiertos por convenios ACTIVE y al día. Los reportes deben mostrar deuda original y deuda convenida por separado.

### 3. ¿El convenio reemplaza, suspende o solo referencia la deuda original?

**Respuesta:** Actualmente solo referencia la deuda original (snapshot).

**Propuesta:** El convenio REEMPLAZA temporalmente la deuda original en términos de deuda exigible. La deuda original se mantiene intacta pero se excluye del cálculo de deuda efectiva si está cubierta por un convenio ACTIVE y al día.

### 4. ¿Un convenio activo y al día debe evitar un bloqueo financiero?

**Respuesta:** Actualmente NO. No hay lógica automática para esto.

**Propuesta:** SÍ. Un convenio activo y al día debería generar una excepción de bloqueo (`exceptionSource = PAYMENT_AGREEMENT`) que evite el bloqueo financiero por la deuda original refinanciada.

### 5. ¿Un convenio activo pero atrasado debe volver a bloquear?

**Respuesta:** Actualmente NO. No hay lógica para esto.

**Propuesta:** SÍ. Si el convenio entra en mora (cuotas OVERDUE), la excepción de bloqueo debería revocarse o vencer, permitiendo que el bloqueo se aplique nuevamente.

### 6. ¿Cuándo una cuota de convenio pasa a `OVERDUE`?

**Respuesta:** Actualmente NUNCA. No hay lógica para marcar cuotas como OVERDUE.

**Propuesta:** Una cuota pasa a `OVERDUE` cuando:
- `dueDate` < fecha actual
- `status` es `PENDING` o `PARTIAL`
- `paidAmount` < `amount`
- Y no hay días de gracia configurados (o se excedieron)

### 7. ¿Cuándo un convenio pasa a `DEFAULTED`?

**Respuesta:** Actualmente NUNCA. No hay lógica para marcar convenios como DEFAULTED.

**Propuesta:** Un convenio pasa a `DEFAULTED` cuando:
- Tiene 2 o más cuotas consecutivas en `OVERDUE`
- O tiene más del 50% de las cuotas en `OVERDUE`
- Y está en status `ACTIVE`

### 8. ¿Cuándo un convenio pasa a `COMPLETED`?

**Respuesta:** Actualmente NUNCA. No hay lógica para marcar convenios como COMPLETED.

**Propuesta:** Un convenio pasa a `COMPLETED` cuando:
- Todas las cuotas están en `PAID`
- `paidAmount` >= `agreedAmount`
- Y está en status `ACTIVE`

### 9. ¿Cómo se calcula el saldo financiero del alumno con convenio?

**Respuesta:** Actualmente solo se calcula deuda de `StudentCharge`.

**Propuesta:** El saldo financiero efectivo debería ser:
- Deuda original NO cubierta por convenios ACTIVE (cuotas sin convenio)
- + Deuda de convenios ACTIVE (cuotas pendientes)
- - Deuda de convenios COMPLETED (no se cuenta)
- + Deuda de convenios DEFAULTED (se puede volver exigible según reglas)

### 10. ¿Cómo se evita duplicar deuda en reportes?

**Respuesta:** Actualmente NO se evita. Los reportes suman deuda original sin considerar convenios.

**Propuesta:** Los reportes deberían:
- Usar `PaymentAgreementChargeRelation` para identificar cargos cubiertos por convenios
- Excluir o separar cargos cubiertos por convenios ACTIVE y al día
- Incluir deuda de convenios activos
- Mostrar deuda original y deuda convenida por separado

### 11. ¿Cómo se muestran deuda original y deuda convenida?

**Respuesta:** Actualmente no se muestra deuda convenida en reportes.

**Propuesta:** Los reportes deberían mostrar:
- Deuda original total
- Deuda original cubierta por convenios (no exigible temporalmente)
- Deuda original exigible (no cubierta por convenios)
- Deuda de convenios activos
- Deuda total efectiva (original exigible + convenios activos)

### 12. ¿Qué pasa si el alumno paga completamente el convenio?

**Respuesta:** Actualmente el convenio no pasa a `COMPLETED` automáticamente.

**Propuesta:** Al completar el pago del convenio:
- Convenio pasa a `COMPLETED`
- `completedAt` se setea
- Evento `DEFAULTED` (reutilizando enum existente) se registra
- Excepción de bloqueo se revoca
- La deuda original podría volver a ser exigible según reglas (opcional, fase posterior)

### 13. ¿Qué pasa si el alumno incumple una cuota?

**Respuesta:** Actualmente no hay consecuencias automáticas.

**Propuesta:** Si el alumno incumple una cuota:
- Cuota pasa a `OVERDUE`
- `overdueSince` se setea
- Si hay múltiples cuotas vencidas, convenio podría pasar a `DEFAULTED`
- Excepción de bloqueo se revoca
- Sistema de bloqueos podría aplicar bloqueo nuevamente

### 14. ¿Qué permisos pueden crear excepciones de bloqueo?

**Respuesta:** Actualmente no hay lógica específica para esto.

**Propuesta:** Permisos que deberían poder crear excepciones:
- `AGREEMENT_MANAGE` (gestionar convenios)
- `BLOCK_EXCEPTION_CREATE` (crear excepciones de bloqueo)
- Roles: SUPERADMIN, FINANCIERO, DIRECTOR

### 15. ¿Qué debe auditarse?

**Respuesta:** Actualmente se auditan cambios de convenio pero no excepciones de bloqueo.

**Propuesta:** Debe auditarse:
- Creación de excepción de bloqueo por convenio
- Revocación de excepción de bloqueo
- Cambio de status de cuota a `OVERDUE`
- Cambio de status de convenio a `DEFAULTED`
- Cambio de status de convenio a `COMPLETED`

### 16. ¿Qué eventos deben registrarse?

**Respuesta:** Actualmente se registran eventos de convenio pero no de deuda/bloqueos.

**Propuesta:** Eventos de convenio (usando enum existente):
- `INSTALLMENT_OVERDUE`: Cuota vencida (YA existe en enum)
- `DEFAULTED`: Convenio incumplido (YA existe en enum)
- `BLOCK_EXCEPTION`: Excepción de bloqueo (YA existe en enum)

### 17. ¿Qué queda fuera de esta fase?

**Respuesta:** Quedan fuera:
- Cambios a `StudentCharge.status` (REFINANCED)
- Cron jobs automáticos para marcar cuotas vencidas
- Cron jobs automáticos para marcar convenios incumplidos
- Cron jobs automáticos para marcar convenios completados
- Reportes nuevos específicos de convenios
- Dashboard de convenios
- Tareas automáticas de sincronización

---

## Preguntas específicas de diseño corregido

### 1. ¿Cómo se define "convenio al día"?

**Respuesta:** Un convenio está al día cuando:
- Status es `ACTIVE`
- No tiene cuotas en `OVERDUE`
- No tiene cuotas vencidas (según días de gracia configurados)
- No está en `DEFAULTED`

### 2. ¿Cuántos días de gracia hay antes de `OVERDUE`?

**Respuesta:** Por defecto 0 días, pero configurable vía `FinancialConfig` con key `agreementGraceDays`. Si no está configurado, se usa 0.

### 3. ¿Cuándo un convenio pasa de `ACTIVE` a `DEFAULTED`?

**Respuesta:** Un convenio pasa a `DEFAULTED` cuando:
- Tiene 2 o más cuotas consecutivas en `OVERDUE`
- O tiene más del 50% de las cuotas en `OVERDUE`
- Y está en status `ACTIVE`

### 4. ¿Una sola cuota vencida ya revoca excepción?

**Respuesta:** NO. Una sola cuota vencida NO revoca la excepción automáticamente. La excepción se revoca cuando:
- El convenio pasa a `DEFAULTED` (criterios de incumplimiento)
- O manualmente por un usuario con permisos

### 5. ¿Qué pasa si una cuota está `PARTIAL` y vencida?

**Respuesta:** Una cuota `PARTIAL` y vencida pasa a `OVERDUE` igual que una cuota `PENDING`. El status `PARTIAL` indica que hay un pago parcial, pero sigue vencida.

### 6. ¿La deuda original se vuelve exigible si el convenio cae?

**Respuesta:** En Fase 5.1-5.4, NO. La deuda original se mantiene intacta y solo se excluye del cálculo de deuda efectiva. En fases posteriores, se podría implementar lógica para volver a hacer exigible la deuda original si el convenio cae (DEFAULTED).

### 7. ¿Cómo se evita duplicación en reportes sin cambiar `StudentCharge.status`?

**Respuesta:** Usando `PaymentAgreementChargeRelation` para identificar cargos cubiertos por convenios. Los reportes deben:
- Consultar `PaymentAgreementChargeRelation` para saber qué cargos están cubiertos
- Excluir o separar cargos cubiertos por convenios ACTIVE y al día
- Incluir deuda de convenios activos

### 8. ¿Cómo se calcula deuda efectiva cuando hay cargos parcialmente cubiertos por convenio?

**Respuesta:** Los cargos parcialmente cubiertos por convenio se tratan como:
- La parte cubierta por el convenio: deuda del convenio
- La parte NO cubierta: deuda original exigible
- Esto requiere que `PaymentAgreementChargeRelation.amountIncluded` represente el monto cubierto

### 9. ¿Qué permisos pueden forzar/revocar excepciones?

**Respuesta:** Permisos:
- `AGREEMENT_MANAGE`: Gestionar convenios (incluye excepciones)
- `BLOCK_EXCEPTION_CREATE`: Crear excepciones de bloqueo
- `BLOCK_EXCEPTION_REVOKE`: Revocar excepciones de bloqueo
- Roles: SUPERADMIN, FINANCIERO, DIRECTOR

### 10. ¿Qué acciones quedan manuales y cuáles automáticas?

**Respuesta:**
**Manuales en Fase 5.1-5.4:**
- Evaluación de estado financiero del convenio (trigger manual)
- Aplicación/revocación de excepciones de bloqueo (trigger manual)
- Cálculo de deuda efectiva (read-only, siempre disponible)

**Automáticas en Fase 5.5 (opcional):**
- Cron job para marcar cuotas vencidas
- Cron job para evaluar convenios
- Cron job para aplicar/revocar excepciones

---

## Reglas de negocio propuestas

### R1: Deuda original no destructiva
La deuda original nunca se borra ni se modifica destructivamente. NO se cambia `StudentCharge.status` en Fase 5.1. La refinanciación se representa mediante `PaymentAgreementChargeRelation`.

### R2: Convenio como capa de refinanciación
El convenio actúa como una capa de refinanciación que reemplaza temporalmente la deuda original en términos de deuda exigible. La deuda original se mantiene intacta pero se excluye del cálculo de deuda efectiva.

### R3: Excepción de bloqueo automática
Al activar un convenio, se genera automáticamente una excepción de bloqueo (`exceptionSource = PAYMENT_AGREEMENT`) que evita el bloqueo financiero por la deuda original refinanciada.

### R4: Revocación de excepción por mora
Si el convenio entra en mora (cuotas OVERDUE), la excepción de bloqueo se revoca automáticamente, permitiendo que el bloqueo se aplique nuevamente.

### R5: Trazabilidad completa
Todos los cambios de status (cuotas, convenios, bloqueos) deben quedar trazados con eventos y auditoría.

### R6: No duplicación de deuda
Los reportes financieros no deben sumar dos veces la deuda original y la deuda convenida. Los cargos cubiertos por convenios se excluyen de la deuda efectiva usando `PaymentAgreementChargeRelation`.

### R7: Bloqueos basados en deuda efectiva
Los bloqueos deben basarse en deuda exigible real (original no refinanciada + convenios activos), no en deuda ya cubierta por convenio activo al día.

### R8: Estados de cuota de convenio
- `PENDING`: Cuota pendiente de pago
- `PARTIAL`: Cuota pagada parcialmente
- `PAID`: Cuota pagada completamente
- `OVERDUE`: Cuota vencida (dueDate < hoy y no pagada)
- `CANCELLED`: Cuota cancelada
- `WAIVED`: Cuota condonada

### R9: Estados de convenio
- `DRAFT`: Borrador (no activo)
- `ACTIVE`: Activo (en curso)
- `COMPLETED`: Completado (todas las cuotas pagadas)
- `CANCELLED`: Cancelado
- `DEFAULTED`: Incumplido (mora significativa)

### R10: Criterios de incumplimiento
Un convenio se marca como `DEFAULTED` cuando:
- Tiene 2 o más cuotas consecutivas en `OVERDUE`
- O tiene más del 50% de las cuotas en `OVERDUE`

---

## Métodos propuestos

### PaymentAgreementService

#### `evaluateAgreementFinancialStatus(agreementId: string)`
Evalúa el estado financiero de un convenio:
- Marca cuotas vencidas como `OVERDUE`
- Marca convenio como `DEFAULTED` si corresponde
- Marca convenio como `COMPLETED` si corresponde
- Registra eventos correspondientes

#### `markOverdueInstallments(agreementId: string)`
Marca cuotas vencidas:
- Busca cuotas con `dueDate < hoy` (considerando días de gracia) y status `PENDING`/`PARTIAL`
- Cambia status a `OVERDUE`
- Setea `overdueSince`
- Registra evento `INSTALLMENT_OVERDUE` (YA existe en enum)

#### `evaluateAgreementDefault(agreementId: string)`
Evalúa si el convenio debe marcarse como incumplido:
- Cuenta cuotas en `OVERDUE`
- Verifica si cumple criterios de incumplimiento
- Si corresponde, cambia status a `DEFAULTED`
- Registra evento `DEFAULTED` (YA existe en enum)

#### `evaluateAgreementCompletion(agreementId: string)`
Evalúa si el convenio debe marcarse como completado:
- Verifica si todas las cuotas están en `PAID`
- Verifica si `paidAmount` >= `agreedAmount`
- Si corresponde, cambia status a `COMPLETED`
- Registra evento `STATUS_CHANGED` con metadata de completado

#### `applyAgreementBlockException(agreementId: string, userId: string)`
Aplica excepción de bloqueo por convenio:
- Busca bloqueos activos del alumno
- Crea o actualiza excepción con `exceptionSource = PAYMENT_AGREEMENT`
- Setea `exceptionAgreementId`
- Registra evento `BLOCK_EXCEPTION` (YA existe en enum)
- Registra auditoría

#### `revokeAgreementBlockException(agreementId: string, userId: string, reason: string)`
Revoca excepción de bloqueo por convenio:
- Busca excepción activa del convenio
- Revoca excepción (setea `exceptionGranted = false`)
- Registra evento `BLOCK_EXCEPTION` con metadata de revocación
- Registra auditoría

### FinancialService

#### `getStudentEffectiveDebt(studentId: string)`
Calcula deuda efectiva del alumno:
- Deuda original NO cubierta por convenios ACTIVE (usando `PaymentAgreementChargeRelation`)
- + Deuda de convenios ACTIVE (cuotas pendientes)
- - Deuda de convenios COMPLETED (no se cuenta)
- + Deuda de convenios DEFAULTED (se puede volver exigible según reglas)
- Retorna resumen detallado

#### `getStudentAgreementDebtSummary(studentId: string)`
Obtiene resumen de deuda de convenios:
- Convenios activos y su deuda
- Convenios completados
- Cuotas vencidas de convenios
- Excepciones de bloqueo activas

#### `calculateDebtSummaryWithAgreements(studentId: string)`
Versión mejorada de `calculateDebtSummary`:
- Considera cargos cubiertos por convenios (usando `PaymentAgreementChargeRelation`)
- Considera deuda de convenios
- Retorna deuda efectiva

---

## Cambios de schema requeridos

### NO se requiere migración para Fase 5.1-5.4

El schema actual ya tiene:
- `FinancialBlock.exceptionSource` y `exceptionAgreementId`
- `FinancialBlockExceptionSource.PAYMENT_AGREEMENT`
- `PaymentAgreementEventType` con eventos necesarios (INSTALLMENT_OVERDUE, DEFAULTED, BLOCK_EXCEPTION)
- Estados de convenio y cuotas
- `PaymentAgreementChargeRelation` para rastrear deuda original

### Cambios opcionales para fases posteriores

Si se decide cambiar `StudentCharge.status` a `REFINANCED` en fases posteriores:
- Agregar `REFINANCED` a `ChargeStatus` enum
- Migración de schema
- Actualizar lógica de reportes

---

## Riesgos detectados

### R1 (Bajo): Sin migración en Fase 5.1-5.4
Al no requerir migración, el riesgo es bajo. Se usa schema existente.

### R2 (Medio): Cálculo de deuda efectiva
El cálculo de deuda efectiva requiere unir `StudentCharge` con `PaymentAgreementChargeRelation`, lo que puede ser complejo. Riesgo: medio, requiere pruebas exhaustivas.

### R3 (Medio): Excepciones de bloqueo
La lógica de excepciones de bloqueo es compleja y podría interactuar con otras partes del sistema. Riesgo: medio, requiere pruebas exhaustivas.

### R4 (Alto): Estados automáticos
La actualización automática de estados (OVERDUE, DEFAULTED, COMPLETED) requiere cron jobs o triggers en Fase 5.5. Riesgo: alto, requiere diseño cuidadoso de automatización.

### R5 (Medio): Reportes financieros
Actualizar reportes financieros para considerar convenios podría afectar métricas existentes. Riesgo: medio, requiere validación de reportes.

### R6 (Bajo): No cambiar StudentCharge.status
Al no cambiar `StudentCharge.status`, se evita impacto en reportes existentes. Riesgo: bajo.

---

## Recomendación de implementación por fases

### Fase 5.1: Evaluación de estado financiero del convenio
Sin bloqueos todavía.

Implementar:
- `markOverdueInstallments()`
- `evaluateAgreementDefault()`
- `evaluateAgreementCompletion()`
- `evaluateAgreementFinancialStatus()`
- Eventos y auditoría (usando enum existente)
- Pruebas manuales de estados

**NO requiere migración.**

### Fase 5.2: Deuda efectiva
Implementar métodos read-only:
- `getStudentEffectiveDebt()`
- `getStudentAgreementDebtSummary()`
- `calculateDebtSummaryWithAgreements()`
- Pruebas de cálculo de deuda

**NO requiere migración.**

### Fase 5.3: Excepciones de bloqueo por convenio
Implementar:
- `applyAgreementBlockException()`
- `revokeAgreementBlockException()`
- Integrar con activación de convenio
- Auditar cambios
- Registrar eventos (usando enum existente)
- Pruebas de bloqueos

**NO requiere migración.**

### Fase 5.4: Reportes financieros integrados
Actualizar reportes para evitar duplicar deuda:
- Actualizar `getFinancialReport()` para considerar convenios
- Usar `PaymentAgreementChargeRelation` para excluir deuda cubierta
- Mostrar deuda original y deuda convenida
- Pruebas de reportes

**NO requiere migración.**

### Fase 5.5: Automatización (opcional)
Cron o tarea programada para evaluar vencimientos y bloqueos:
- Cron job para marcar cuotas vencidas
- Cron job para evaluar convenios
- Cron job para aplicar/revocar excepciones
- Pruebas de automatización

**NO requiere migración.**

### Fase 5.6: Opcional - Cambio de StudentCharge.status (solo si se aprueba)
Si se decide cambiar `StudentCharge.status` a `REFINANCED`:
- Agregar `REFINANCED` a `ChargeStatus` enum
- Migración de schema
- Actualizar cuotas originales al activar convenio
- Actualizar lógica de reportes
- Pruebas exhaustivas

**REQUIERE migración.**

---

## Validaciones

### Al finalizar Fase 5.0 (diseño)
- [x] Investigación de schema completada
- [x] Investigación de lógica bloqueos completada
- [x] Investigación de lógica deuda completada
- [x] Investigación de reportes financieros completada
- [x] Verificación de enums existentes completada
- [x] Documento de diseño creado
- [x] Preguntas de diseño respondidas
- [x] Preguntas específicas respondidas
- [x] Reglas de negocio propuestas
- [x] Métodos propuestos
- [x] Cambios de schema identificados (NO requeridos para 5.1-5.4)
- [x] Riesgos detectados
- [x] Recomendación de implementación por fases

### Al finalizar Fase 5.1 (estados)
- [ ] Estados de cuotas funcionando
- [ ] Estados de convenio funcionando
- [ ] Eventos registrados (usando enum existente)
- [ ] Pruebas funcionales
- [ ] NO migración ejecutada

### Al finalizar Fase 5.2 (deuda)
- [ ] Cálculo de deuda efectiva funcionando
- [ ] Resumen de deuda de convenios funcionando
- [ ] Pruebas de cálculo de deuda
- [ ] NO migración ejecutada

### Al finalizar Fase 5.3 (bloqueos)
- [ ] Excepciones de bloqueo funcionando
- [ ] Integración con activación de convenio
- [ ] Pruebas de bloqueos
- [ ] NO migración ejecutada

### Al finalizar Fase 5.4 (reportes)
- [ ] Reportes financieros actualizados
- [ ] No duplicación de deuda
- [ ] Pruebas de reportes
- [ ] NO migración ejecutada

---

## Conclusión

El sistema actual tiene la infraestructura necesaria para soportar bloqueos y deuda de convenios SIN migración:
- El schema ya tiene campos para excepciones de bloqueo (`exceptionSource`, `exceptionAgreementId`)
- El enum `FinancialBlockExceptionSource` ya incluye `PAYMENT_AGREEMENT`
- El enum `PaymentAgreementEventType` ya tiene los eventos necesarios (INSTALLMENT_OVERDUE, DEFAULTED, BLOCK_EXCEPTION)
- Los modelos de convenio tienen los campos necesarios para rastrear deuda y pagos
- `PaymentAgreementChargeRelation` permite identificar cargos cubiertos por convenios

Falta la lógica para:
- Actualizar estados de cuotas y convenios automáticamente
- Generar excepciones de bloqueo por convenio
- Calcular deuda efectiva considerando convenios (usando `PaymentAgreementChargeRelation`)
- Actualizar reportes financieros para no duplicar deuda

La implementación propuesta se divide en 6 fases para controlar el riesgo y permitir validaciones incrementales. Las fases 5.1-5.4 NO requieren migración. La fase 5.6 (opcional) podría requerir migración si se decide cambiar `StudentCharge.status`.
