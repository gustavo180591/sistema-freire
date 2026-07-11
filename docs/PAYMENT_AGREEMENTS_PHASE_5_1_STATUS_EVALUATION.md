# Payment Agreements - Phase 5.1: Evaluación de estados de convenio y cuotas vencidas

## Resumen

Esta fase implementa la lógica de evaluación de estados financieros de convenios de pago, incluyendo:

- Marcado de cuotas vencidas como `OVERDUE`
- Detección de convenios completados (`COMPLETED`)
- Detección de convenios incumplidos (`DEFAULTED`)
- Registro de eventos y auditoría
- Ejecución en transacción para garantizar consistencia

## Alcance

**Implementado:**

- `markOverdueInstallments()`: Marca cuotas vencidas
- `evaluateAgreementCompletion()`: Evalúa si el convenio está completado
- `evaluateAgreementDefault()`: Evalúa si el convenio está incumplido
- `evaluateAgreementFinancialStatus()`: Método coordinador principal
- Script de pruebas funcionales
- Documentación

**NO implementado:**

- Excepciones de bloqueo financiero
- Revocación de bloqueos
- Cálculo de deuda efectiva
- Reportes integrados
- Cron jobs automáticos
- Cambios automáticos globales
- Cambios de schema
- Migraciones

## Reglas de negocio

### Regla de vencimiento (OVERDUE)

Una cuota `PENDING` o `PARTIAL` pasa a `OVERDUE` si:

- `dueDate` < fecha actual
- `status` es `PENDING` o `PARTIAL`
- `paidAmount` < `amount`

**No se consideran días de gracia en esta fase.** Los días de gracia pueden implementarse en fases posteriores vía configuración.

### Regla de completado (COMPLETED)

Un convenio `ACTIVE` pasa a `COMPLETED` si:

- Todas sus cuotas están en `PAID`
- `paidAmount` >= `agreedAmount`
- Está en status `ACTIVE`

### Regla de incumplimiento (DEFAULTED)

Un convenio `ACTIVE` pasa a `DEFAULTED` si cumple **cualquiera** de estos criterios:

- Tiene 2 o más cuotas consecutivas en `OVERDUE`
- O tiene más del 50% de las cuotas en `OVERDUE`

### Reglas de protección

- Una cuota `PAID`, `CANCELLED` o `WAIVED` nunca pasa a `OVERDUE`
- No se modifica `StudentCharge`
- No se crea ni modifica `FinancialBlock`
- No se recalcular reportes globales
- Todo cambio de estado tiene evento y auditoría
- La evaluación se ejecuta en transacción

## Métodos implementados

### `markOverdueInstallments(agreementId: string, tx: Prisma.TransactionClient)`

**Tipo:** Private  
**Propósito:** Marca cuotas vencidas como `OVERDUE`

**Lógica:**

1. Busca cuotas con `dueDate < hoy` y status `PENDING`/`PARTIAL`
2. Cambia status a `OVERDUE`
3. Setea `overdueSince` a fecha actual
4. Retorna cantidad marcada y IDs de cuotas

**Transacción:** Se ejecuta dentro de una transacción

### `evaluateAgreementCompletion(agreementId: string, tx: Prisma.TransactionClient)`

**Tipo:** Private  
**Propósito:** Evalúa si el convenio debe marcarse como completado

**Lógica:**

1. Busca todas las cuotas del convenio
2. Verifica si todas están en `PAID`
3. Retorna `shouldComplete: boolean`

**Transacción:** Se ejecuta dentro de una transacción

### `evaluateAgreementDefault(agreementId: string, tx: Prisma.TransactionClient)`

**Tipo:** Private  
**Propósito:** Evalúa si el convenio debe marcarse como incumplido

**Lógica:**

1. Busca todas las cuotas del convenio ordenadas por número
2. Cuenta cuotas en `OVERDUE`
3. Verifica si hay 2 o más consecutivas en `OVERDUE`
4. Verifica si más del 50% están en `OVERDUE`
5. Retorna `shouldDefault: boolean` y `reason: string`

**Transacción:** Se ejecuta dentro de una transacción

### `evaluateAgreementFinancialStatus(agreementId: string, userId: string, userName: string)`

**Tipo:** Public  
**Propósito:** Método coordinador principal que evalúa y actualiza el estado del convenio

**Lógica:**

1. Valida que el convenio existe y está en `ACTIVE`
2. Ejecuta evaluación en transacción:
   - Marca cuotas vencidas
   - Evalúa completado
   - Evalúa incumplido
   - Determina nuevo estado
   - Actualiza convenio si cambió el estado
   - Registra eventos
   - Registra auditoría
3. Retorna resultado con:
   - `agreement`: Convenio actualizado
   - `overdueMarked`: Cantidad de cuotas marcadas como vencidas
   - `statusChanged`: Si cambió el estado
   - `previousStatus`: Estado anterior
   - `newStatus`: Nuevo estado

**Transacción:** Ejecuta toda la lógica en una transacción atómica

## Eventos registrados

### `INSTALLMENT_OVERDUE`

Se registra cuando una cuota se marca como vencida:

- `eventType`: `INSTALLMENT_OVERDUE`
- `description`: "Installment marked as overdue"
- `oldValue`: `{ installmentId }`
- `newValue`: `{ status: 'OVERDUE', overdueSince: ISO_DATE }`

### `STATUS_CHANGED`

Se registra cuando el convenio pasa a `COMPLETED`:

- `eventType`: `STATUS_CHANGED`
- `description`: "Agreement status changed from ACTIVE to COMPLETED"
- `previousStatus`: `ACTIVE`
- `newStatus`: `COMPLETED`
- `oldValue`: `{ status: 'ACTIVE' }`
- `newValue`: `{ status: 'COMPLETED' }`

### `DEFAULTED`

Se registra cuando el convenio pasa a `DEFAULTED`:

- `eventType`: `DEFAULTED`
- `description`: "Agreement status changed from ACTIVE to DEFAULTED: {reason}"
- `previousStatus`: `ACTIVE`
- `newStatus`: `DEFAULTED`
- `oldValue`: `{ status: 'ACTIVE' }`
- `newValue`: `{ status: 'DEFAULTED', reason }`

## Auditoría

Se registran audit logs para:

- Cambios de estado del convenio
- Marcado de cuotas como vencidas

**Formato de audit log:**

- `action`: `UPDATE`
- `entityType`: `PaymentAgreement` o `PaymentAgreementInstallment`
- `entityId`: ID del convenio
- `description`: Descripción del cambio
- `metadata`: JSON con detalles del cambio

## Limitaciones

### Fase 5.1

- No se consideran días de gracia (pueden implementarse en fases posteriores)
- La evaluación es manual (no hay cron jobs automáticos)
- No se generan excepciones de bloqueo financiero
- No se calcula deuda efectiva
- No se actualizan reportes globales
- No se modifica `StudentCharge`
- No se crea ni modifica `FinancialBlock`

### Diseño

- Los métodos privados (`markOverdueInstallments`, `evaluateAgreementCompletion`, `evaluateAgreementDefault`) no están expuestos públicamente
- Solo `evaluateAgreementFinancialStatus` es público
- La evaluación requiere que el convenio esté en `ACTIVE`
- No se pueden evaluar convenios en otros estados

## Pruebas

El script `scripts/test-payment-agreement-status-evaluation.ts` prueba:

1. **Marcado de cuotas vencidas:**
   - Cuota con fecha pasada se marca como `OVERDUE`
   - Cuota con fecha futura se mantiene `PENDING`
   - Se registran eventos
   - Se registran audit logs

2. **Detección de completado:**
   - Convenio con todas las cuotas pagadas pasa a `COMPLETED`
   - `completedAt` se setea
   - Se registran eventos

3. **Detección de incumplimiento:**
   - Convenio con 2 cuotas consecutivas vencidas pasa a `DEFAULTED`
   - Se registran eventos con razón

4. **No modificación de StudentCharge:**
   - `StudentCharge.status` no cambia
   - `StudentCharge.paidAmount` no cambia

5. **No modificación de FinancialBlock:**
   - No se crean nuevos bloques
   - No se modifican bloques existentes

6. **Rollback en caso de error:**
   - Transacción se revierte si hay error
   - Estado del convenio no cambia parcialmente

## Qué queda para Fase 5.2

**Fase 5.2: Deuda efectiva**

- Implementar `getStudentEffectiveDebt()`
- Implementar `getStudentAgreementDebtSummary()`
- Implementar `calculateDebtSummaryWithAgreements()`
- Usar `PaymentAgreementChargeRelation` para identificar deuda cubierta
- NO requiere migración

## Qué queda para Fase 5.3

**Fase 5.3: Excepciones de bloqueo por convenio**

- Implementar `applyAgreementBlockException()`
- Implementar `revokeAgreementBlockException()`
- Integrar con activación de convenio
- Auditar cambios
- Registrar eventos
- NO requiere migración

## Qué queda para Fase 5.4

**Fase 5.4: Reportes financieros integrados**

- Actualizar `getFinancialReport()` para considerar convenios
- Usar `PaymentAgreementChargeRelation` para excluir deuda cubierta
- Mostrar deuda original y deuda convenida
- NO requiere migración

## Qué queda para Fase 5.5

**Fase 5.5: Automatización (opcional)**

- Cron job para marcar cuotas vencidas
- Cron job para evaluar convenios
- Cron job para aplicar/revocar excepciones
- NO requiere migración

## Qué queda para Fase 5.6

**Fase 5.6: Opcional - Cambio de StudentCharge.status (solo si se aprueba)**

- Agregar `REFINANCED` a `ChargeStatus` enum
- Migración de schema
- Actualizar cuotas originales al activar convenio
- Actualizar lógica de reportes
- REQUIERE migración

## Validaciones

Al finalizar Fase 5.1, se ejecutaron:

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate status`
- `npm run check`
- `npm run build`
- `npx tsx scripts/test-payment-agreement-status-evaluation.ts`
- Verificación de forbidden patterns

**Resultado:** Todas las validaciones pasaron exitosamente.

## Conclusión

La Fase 5.1 implementó exitosamente la lógica de evaluación de estados financieros de convenios de pago:

- Se marcan cuotas vencidas como `OVERDUE`
- Se detectan convenios completados (`COMPLETED`)
- Se detectan convenios incumplidos (`DEFAULTED`)
- Se registran eventos y auditoría
- Se ejecuta en transacción para garantizar consistencia
- No se modifica `StudentCharge`
- No se crea ni modifica `FinancialBlock`
- No se requieren migraciones

La implementación sigue el diseño aprobado en la Fase 5.0 y está lista para la Fase 5.2: Deuda efectiva.
