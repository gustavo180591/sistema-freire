# Módulo Financiero - Fase 3: Registro de Pagos

## Objetivo

Implementar el registro de pagos, asignación a cuotas, anulación de pagos y validaciones correspondientes.

## Alcance

Esta fase incluye exclusivamente:

1. **Registro de pagos** - `registerPayment()`
2. **Asignación de pagos a cuotas** - `allocatePaymentInternal()`
3. **Anulación de pagos** - `cancelPayment()`
4. **Validaciones de pagos**
5. **Transacciones atómicas**
6. **Routes/actions mínimas**
7. **Pruebas funcionales**
8. **Documentación**

**NO incluye:** recibos PDF, bloqueos automáticos, reportes financieros completos ni estados financieros avanzados.

## Flujo de Registro de Pagos

### 1. Validaciones Previas

**Validaciones de alumno:**

- Alumno debe existir
- Alumno debe estar activo (`status = 'ACTIVE'`)

**Validaciones de permisos:**

- Usuario debe tener permiso `PAYMENT.create`
- Se valida usando `hasPermission(roleCode, 'PAYMENT', 'create')`

**Validaciones de monto:**

- Monto no puede ser negativo
- Monto no puede ser cero
- Monto no puede superar la deuda seleccionada (si se especifican cuotas)
- Monto no puede superar la deuda total del alumno (si no se especifican cuotas)

**Validaciones de cuotas:**

- Si se especifican cuotas, deben existir
- Si se especifican cuotas, deben estar en estado `PENDING` o `PARTIAL`
- No se permiten pagos sobre cuotas anuladas o ya pagadas

**Validaciones de referencia:**

- Si se proporciona referencia, no puede estar duplicada
- La unicidad se valida por combinación `method + reference`
- Solo se valida contra pagos no anulados (`isCancelled = false`)

### 2. Registro del Pago

**Transacción atómica:**

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Crear pago
  const payment = await tx.payment.create({...});

  // 2. Asignar pago a cuotas (FIFO automático)
  const allocations = await allocatePaymentInternal(...);

  // 3. Crear movimiento financiero
  const movement = await tx.financialMovement.create({...});

  return { payment, allocations, movement };
});
```

**Campos del pago:**

- `studentId` - ID del alumno
- `amount` - Monto del pago (Decimal)
- `method` - Método de pago (CASH, BANK_TRANSFER, DEBIT_CARD, CREDIT_CARD, QR, SCHOLARSHIP)
- `reference` - Referencia externa opcional
- `paidAt` - Fecha de pago (default: now())
- `notes` - Observaciones opcionales
- `userId` - Usuario responsable
- `academicTermId` - Ciclo lectivo (se infiere de las cuotas)

### 3. Auditoría

**Solo se registra si la transacción fue exitosa:**

- Acción: `CREATE`
- Entidad: `Payment`
- Descripción: "Registró pago de [nombre alumno] - $[monto]"
- Metadata:
  - `paymentId` - ID del pago
  - `studentId` - ID del alumno
  - `studentName` - Nombre del alumno
  - `amount` - Monto del pago
  - `method` - Método de pago
  - `reference` - Referencia (si existe)
  - `chargeIds` - IDs de cuotas afectadas
  - `allocations` - Detalle de allocations (chargeId, amount)

## Flujo de Asignación de Pagos a Cuotas

### Estrategia FIFO (First-In-First-Out)

**Ordenamiento:**

- Las cuotas se ordenan por `dueDate` ascendente
- Si una cuota no tiene `dueDate`, se pone al final

**Algoritmo de asignación:**

```typescript
for (const charge of sortedCharges) {
	if (remainingAmount <= 0) break;

	const chargeBalance = charge.finalAmount - charge.paidAmount;
	if (chargeBalance <= 0) continue;

	const allocationAmount = min(remainingAmount, chargeBalance);

	// Crear allocation
	await tx.paymentAllocation.create({
		paymentId,
		chargeId: charge.id,
		amount: allocationAmount
	});

	// Actualizar cuota
	const newPaidAmount = charge.paidAmount + allocationAmount;
	let newStatus = charge.status;

	if (newPaidAmount === charge.finalAmount) {
		newStatus = 'PAID';
	} else if (newPaidAmount > 0) {
		newStatus = 'PARTIAL';
	}

	await tx.studentCharge.update({
		where: { id: charge.id },
		data: { paidAmount: newPaidAmount, status: newStatus }
	});

	remainingAmount -= allocationAmount;
}
```

**Estados de cuota:**

- `PENDING` - Sin pagos (`paidAmount = 0`)
- `PARTIAL` - Pago parcial (`0 < paidAmount < finalAmount`)
- `PAID` - Pagado completamente (`paidAmount = finalAmount`)
- `CANCELLED` - Anulada

**Asignación manual:**

- Si se especifican `chargeIds` en el input, solo se asigna a esas cuotas
- Si no se especifican, se asigna automáticamente a todas las cuotas pendientes (FIFO)

## Flujo de Anulación de Pagos

### 1. Validaciones Previas

**Validaciones de pago:**

- Pago debe existir
- Pago no debe estar ya anulado (`isCancelled = false`)

**Validaciones de permisos:**

- Usuario debe tener permiso `PAYMENT.delete`
- Se valida usando `hasPermission(roleCode, 'PAYMENT', 'delete')`

### 2. Anulación

**Transacción atómica:**

```typescript
await prisma.$transaction(async (tx) => {
	// 1. Revertir allocations
	for (const allocation of payment.allocations) {
		const newPaidAmount = charge.paidAmount - allocation.amount;
		let newStatus = charge.status;

		if (newPaidAmount === 0) {
			newStatus = 'PENDING';
		} else if (newPaidAmount > 0) {
			newStatus = 'PARTIAL';
		}

		await tx.studentCharge.update({
			where: { id: charge.id },
			data: { paidAmount: newPaidAmount, status: newStatus }
		});

		// Eliminar allocation
		await tx.paymentAllocation.delete({
			where: { paymentId_chargeId: { paymentId, chargeId } }
		});
	}

	// 2. Marcar pago como anulado
	await tx.payment.update({
		where: { id: paymentId },
		data: {
			isCancelled: true,
			cancelledAt: new Date(),
			cancelledBy: userId,
			cancelledReason: reason
		}
	});

	// 3. Crear movimiento financiero de cancelación
	await tx.financialMovement.create({
		data: {
			studentId: payment.studentId,
			movementType: 'CANCELLATION',
			amount: payment.amount,
			entityType: 'Payment',
			entityId: paymentId,
			description: `Anulación de pago de [nombre alumno] - $[monto]`,
			balanceBefore: 0,
			balanceAfter: 0,
			userId
		}
	});
});
```

**No se borra el pago físicamente:**

- Se marca como `isCancelled = true`
- Se registran `cancelledAt`, `cancelledBy`, `cancelledReason`
- El pago permanece en la base de datos para auditoría

### 3. Auditoría

**Solo se registra si la transacción fue exitosa:**

- Acción: `DELETE`
- Entidad: `Payment`
- Descripción: "Anuló pago de [nombre alumno] - $[monto]"
- Metadata:
  - `paymentId` - ID del pago
  - `studentId` - ID del alumno
  - `studentName` - Nombre del alumno
  - `reason` - Motivo de anulación
  - `previousValues` - Valores antes de la anulación (amount, method, reference, allocations)
  - `newValues` - Valores después de la anulación (isCancelled, cancelledAt, cancelledBy)

## Movimientos Financieros

### Tipo de Movimiento

**Pago:**

- `movementType`: `'PAYMENT'`
- `entityType`: `'Payment'`
- `entityId`: ID del pago
- `amount`: Monto del pago
- `description`: "Pago de [nombre alumno] - [método]"

**Cancelación de pago:**

- `movementType`: `'CANCELLATION'`
- `entityType`: `'Payment'`
- `entityId`: ID del pago
- `amount`: Monto del pago
- `description`: "Anulación de pago de [nombre alumno] - $[monto]"

**Campos obligatorios:**

- `studentId` - ID del alumno
- `balanceBefore` - Balance antes (por ahora 0, se implementará en fase posterior)
- `balanceAfter` - Balance después (por ahora 0, se implementará en fase posterior)
- `userId` - Usuario responsable

## Reglas de Validación

### Monto

**No permitido:**

- Monto negativo: "El monto no puede ser negativo"
- Monto cero: "El monto no puede ser cero"
- Monto mayor a la deuda seleccionada: "El monto del pago no puede superar la deuda seleccionada"
- Monto mayor a la deuda total: "El monto del pago no puede superar la deuda total del alumno"

**Nota:** No se permite saldo a favor en esta fase. Si el monto del pago supera la deuda, se rechaza.

### Cuotas

**No permitido:**

- Pagar cuotas anuladas: "Algunas cuotas no existen o no están pendientes"
- Pagar cuotas ya pagadas: "Algunas cuotas no existen o no están pendientes"
- Pagar cuotas de otro alumno: Validado por `studentId`

### Permisos

**No permitido:**

- Registrar pagos sin permiso: "No tiene permisos para registrar pagos"
- Anular pagos sin permiso: "No tiene permisos para anular pagos"
- Alumnos registrando pagos: Validado por permisos (los alumnos no tienen permiso `PAYMENT.create`)

### Referencia

**No permitido:**

- Referencia duplicada: "Ya existe un pago con esta referencia"
- La unicidad se valida por combinación `method + reference`
- Solo se valida contra pagos no anulados

## Ejemplos

### Pago Total de una Cuota

**Input:**

```typescript
{
  studentId: 'student-123',
  amount: 10000,
  method: 'CASH',
  userId: 'user-456',
  chargeIds: ['charge-789']
}
```

**Resultado:**

- Pago creado: $10,000
- Allocation: charge-789 = $10,000
- Estado cuota: PENDING → PAID
- Movimiento financiero: PAYMENT $10,000

### Pago Parcial

**Input:**

```typescript
{
  studentId: 'student-123',
  amount: 5000,
  method: 'BANK_TRANSFER',
  reference: 'REF-123',
  userId: 'user-456',
  chargeIds: ['charge-789']
}
```

**Resultado:**

- Pago creado: $5,000
- Allocation: charge-789 = $5,000
- Estado cuota: PENDING → PARTIAL
- Movimiento financiero: PAYMENT $5,000

### Pago Distribuido (FIFO)

**Input:**

```typescript
{
  studentId: 'student-123',
  amount: 12000,
  method: 'CASH',
  userId: 'user-456'
  // Sin chargeIds - asignación automática FIFO
}
```

**Cuotas pendientes:**

- charge-1: $5,000 (vence 2026-09-15)
- charge-2: $5,000 (vence 2026-10-15)
- charge-3: $5,000 (vence 2026-11-15)

**Resultado:**

- Pago creado: $12,000
- Allocations:
  - charge-1: $5,000 (completo)
  - charge-2: $5,000 (completo)
  - charge-3: $2,000 (parcial)
- Estados:
  - charge-1: PENDING → PAID
  - charge-2: PENDING → PAID
  - charge-3: PENDING → PARTIAL
- Movimiento financiero: PAYMENT $12,000

### Anulación de Pago

**Input:**

```typescript
{
  paymentId: 'payment-123',
  reason: 'Error en el registro',
  userId: 'user-456'
}
```

**Resultado:**

- Pago marcado como anulado: `isCancelled = true`
- Allocations eliminadas
- Cuotas revertidas a estado anterior
- Movimiento financiero: CANCELLATION $10,000

## Límites Conocidos

1. **Saldo a favor:** No se permite en esta fase. Si el monto del pago supera la deuda, se rechaza. En una fase posterior se podría implementar saldo a favor.

2. **Balance:** Los campos `balanceBefore` y `balanceAfter` están en 0 por ahora. Se implementarán en una fase posterior cuando se calcule el balance real del alumno.

3. **Referencia opcional:** La referencia es opcional. Si no se proporciona, no se valida unicidad.

4. **Asignación automática:** Si no se especifican cuotas, se asigna automáticamente a todas las pendientes (FIFO). No hay opción de asignación manual en esta fase.

5. **Performance en bulk:** No se implementó generación masiva de pagos en esta fase. Si se requiere en el futuro, se puede implementar similar a `createBulkCharges`.

## Métodos Implementados

### FinancialService

**registerPayment(input: PaymentInput): Promise<PaymentResult>**

- Registra un pago y lo asigna a cuotas
- Valida alumno, permisos, monto, cuotas, referencia
- Ejecuta transacción atómica
- Registra auditoría

**allocatePaymentInternal(paymentId, paymentAmount, charges, tx): Promise<PaymentAllocation[]>**

- Helper interno para asignar pago a cuotas
- Implementa estrategia FIFO
- Actualiza estados de cuotas
- Solo se usa dentro de transacciones

**cancelPayment(paymentId, reason, userId): Promise<void>**

- Anula un pago existente
- Revierte allocations
- Actualiza estados de cuotas
- Marca pago como anulado
- Ejecuta transacción atómica
- Registra auditoría

**getStudentPayments(studentId): Promise<Payment[]>**

- Obtiene todos los pagos de un alumno
- Incluye allocations y cuotas
- Filtra pagos no anulados

## Routes/Actions

### `/finanzas/pagos`

**GET - Cargar página:**

- Obtiene alumnos activos
- Obtiene conceptos de cuota activos
- Obtiene ciclos lectivos activos

**POST - registerPayment:**

- Registra un pago
- Valida y delega en `financialService.registerPayment()`
- Retorna resultado o error

**POST - cancelPayment:**

- Anula un pago
- Valida y delega en `financialService.cancelPayment()`
- Retorna resultado o error

## UI Básica

**Componentes:**

- Selector de alumno
- Input de monto
- Selector de método de pago
- Input de referencia (opcional)
- Input de fecha de pago (opcional)
- Textarea de notas (opcional)
- Lista de cuotas pendientes del alumno seleccionado
- Checkbox para seleccionar cuotas específicas (opcional)
- Botón de registrar pago

**Comportamiento:**

- Si no se seleccionan cuotas, se asigna automáticamente (FIFO)
- Si se seleccionan cuotas, se asigna solo a esas
- Muestra errores de validación
- Muestra éxito después de registrar

## Pruebas Funcionales

### Test Suite: `scripts/test-financial-payments.ts`

**Pruebas implementadas:**

1. ✅ Pago total de una cuota
2. ✅ Pago parcial
3. ✅ Pago distribuido en varias cuotas (FIFO)
4. ✅ Pago mayor a la deuda rechazado
5. ✅ Pago con monto negativo rechazado
6. ✅ Pago sobre cuota ya pagada rechazado
7. ✅ Referencia duplicada controlada
8. ✅ Anulación de pago
9. ✅ Reversión de allocations
10. ✅ Recálculo de saldos
11. ✅ Movimientos financieros creados
12. ✅ Auditoría real creada
13. ✅ Rollback si falla una operación

**Ejecución:**

```bash
npx tsx scripts/test-financial-payments.ts
```

## Próximos Pasos - Fase 4: Recibos PDF

La Fase 4 implementará:

1. **Generación de recibos PDF** - `generateReceipt()`
2. **Anulación de recibos** - `cancelReceipt()`
3. **Reimpresión de recibos** - `reprintReceipt()`
4. **Asignación de pagos a recibos**
5. **Validaciones de recibos**
6. **Plantillas de recibos**
7. **Numeración de recibos**
8. **Pruebas funcionales**
9. **Documentación**

## Notas de Implementación

- **No se requieren cambios de schema** para esta fase
- **Schema existente ya tiene:** `Payment`, `PaymentAllocation`, `StudentCharge`, `PaymentMethod`, `ChargeStatus`
- **Transacciones atómicas** garantizan consistencia
- **Auditoría solo en operaciones exitosas** (misma decisión que Fase 2)
- **Validaciones completas en backend** (no dependen del frontend)
- **Permisos granulares** usando sistema existente
- **Decimal helpers** para cálculos precisos
