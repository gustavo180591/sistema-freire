# Schema Prisma Propuesto - Fase 1: Convenios de Pago

## Enums Nuevos

```prisma
enum PaymentAgreementStatus {
  DRAFT          // Borrador - en creación
  ACTIVE         // Activo - vigente
  COMPLETED      // Cumplido - todas las cuotas pagadas
  OVERDUE        // Vencido - hay cuotas vencidas pero no en incumplimiento
  DEFAULTED      // Incumplido - violación grave del convenio
  CANCELLED      // Cancelado - anulado por decisión administrativa
  REFINANCED     // Refinanciado - reemplazado por nuevo convenio
}

enum PaymentAgreementInstallmentStatus {
  PENDING        // Pendiente - no vencida
  PARTIAL        // Parcial - pago parcial
  PAID           // Pagada - completamente pagada
  OVERDUE        // Vencida - fecha pasada y no pagada
  CANCELLED      // Cancelada - anulada por decisión administrativa
  WAIVED         // Condonada - perdonada
}

enum PaymentAgreementChargeRelationType {
  REFINANCED     // Refinanciada - cuota original reemplazada por convenio
  BLOCKED        // Bloqueada - cuota original suspendida temporalmente
  ASSOCIATED     // Asociada - cuota original referenciada pero activa
}

enum PaymentAgreementEventType {
  CREATED        // Creado
  ACTIVATED      // Activado
  MODIFIED       // Modificado
  CANCELLED      // Cancelado
  REFINANCED     // Refinanciado
  INSTALLMENT_PAID // Cuota pagada
  INSTALLMENT_OVERDUE // Cuota vencida
  DEFAULTED      // Incumplimiento
  STATUS_CHANGED // Cambio de estado
  BLOCK_EXCEPTION // Excepción de bloqueo
  BLOCK_REACTIVATED // Reactivación de bloqueo
}

enum FinancialBlockExceptionSource {
  MANUAL         // Excepción otorgada manualmente por administrador
  PAYMENT_AGREEMENT // Excepción automática por convenio activo
}
```

---

## Modelos Nuevos

### 1. PaymentAgreement

**Propósito:** Entidad principal que representa el convenio de pago.

**Características:**

- Numeración secuencial por año (similar a Receipt)
- Montos en Decimal (sin Float)
- Estados bien definidos
- Trazabilidad completa con usuario responsable
- Relación con deuda original vía PaymentAgreementChargeRelation
- Relación con cuotas del convenio vía PaymentAgreementInstallment
- Historial de eventos vía PaymentAgreementEvent

```prisma
model PaymentAgreement {
  id                String                        @id @default(cuid())
  agreementNumber   Int
  agreementYear     Int
  studentId         String
  studentName       String
  studentDni        String?

  // Montos - todos Decimal para precisión financiera
  originalDebt      Decimal                       @db.Decimal(12, 2)
  agreedAmount      Decimal                       @db.Decimal(12, 2)
  paidAmount        Decimal                       @default(0) @db.Decimal(12, 2)
  pendingAmount     Decimal                       @db.Decimal(12, 2)

  // Fechas
  createdAt         DateTime                      @default(now())
  activatedAt       DateTime?
  completedAt       DateTime?
  cancelledAt       DateTime?

  // Estado y motivo
  status            PaymentAgreementStatus        @default(DRAFT)
  reason            String                        @db.Text
  observations      String?                       @db.Text

  // Usuario responsable
  createdBy         String
  createdByName     String
  activatedBy       String?
  activatedByName   String?
  cancelledBy       String?
  cancelledByName   String?
  cancelledReason   String?                       @db.Text

  // Relaciones
  relatedCharges    PaymentAgreementChargeRelation[]
  installments      PaymentAgreementInstallment[]
  events            PaymentAgreementEvent[]
  receipts          Receipt[]

  // Metadatos para configuración adicional
  metadata          Json?

  // Constraints
  @@unique([agreementNumber, agreementYear])
  @@index([studentId])
  @@index([status])
  @@index([createdAt])
  @@index([studentId, status])
  @@map("payment_agreements")
}
```

**Explicación:**

- `agreementNumber` + `agreementYear`: Numeración secuencial por año, no reutilizable
- `originalDebt`: Monto total de la deuda original seleccionada
- `agreedAmount`: Monto acordado (puede incluir condonaciones)
- `paidAmount`: Suma de cuotas pagadas
- `pendingAmount`: Saldo pendiente (agreedAmount - paidAmount)
- `status`: Estado del convenio según enum
- `reason`: Motivo del convenio (requerido)
- `relatedCharges`: Relación con cuotas originales (trazabilidad)
- `installments`: Cuotas del convenio
- `events`: Historial de eventos (auditoría)
- `receipts`: Recibos emitidos para pagos de este convenio

---

### 2. PaymentAgreementInstallment

**Propósito:** Cuotas personalizadas del convenio.

**Características:**

- Entidad real (no solo metadatos)
- Montos en Decimal
- Estados individuales por cuota
- Relación con PaymentAllocation para pagos
- Índices para queries eficientes

```prisma
model PaymentAgreementInstallment {
  id                String                            @id @default(cuid())
  agreementId       String
  installmentNumber Int
  dueDate           DateTime
  amount            Decimal                           @db.Decimal(12, 2)
  paidAmount        Decimal                           @default(0) @db.Decimal(12, 2)
  pendingAmount     Decimal                           @db.Decimal(12, 2)
  status            PaymentAgreementInstallmentStatus  @default(PENDING)

  // Fechas
  paidAt            DateTime?
  overdueSince      DateTime?

  // Relación con pagos
  allocations       PaymentAllocation[]

  // Metadatos
  notes             String?                           @db.Text
  metadata          Json?

  // Relación con convenio
  agreement         PaymentAgreement                   @relation(fields: [agreementId], references: [id], onDelete: Restrict)

  // Constraints
  @@unique([agreementId, installmentNumber])
  @@index([agreementId])
  @@index([dueDate])
  @@index([status])
  @@index([agreementId, status])
  @@map("payment_agreement_installments")
}
```

**Explicación:**

- `installmentNumber`: Número de cuota dentro del convenio (1, 2, 3...)
- `dueDate`: Fecha de vencimiento de la cuota
- `amount`: Monto de la cuota
- `paidAmount`: Monto pagado de esta cuota
- `pendingAmount`: Saldo pendiente de esta cuota
- `status`: Estado de la cuota según enum
- `allocations`: Pagos asignados a esta cuota
- `onDelete: Restrict`: No permite eliminar convenio si tiene cuotas con pagos (preserva historial)

**Nota:** `onDelete: Restrict` es más seguro porque la base de datos no sabe si el convenio está en DRAFT o ACTIVE. El servicio debe validar que el convenio no tenga pagos, recibos, allocations ni eventos críticos antes de permitir eliminación.

---

### 3. PaymentAgreementChargeRelation

**Propósito:** Vincular el convenio con las cuotas originales (trazabilidad).

**Características:**

- No duplica deuda, solo referencia
- Guarda estado original y nuevo
- Tipo de relación define impacto en deuda
- onDelete: Restrict para no perder historial

```prisma
model PaymentAgreementChargeRelation {
  id                String                            @id @default(cuid())
  agreementId       String
  chargeId          String

  // Snapshot de la cuota original (no modifica destructivamente)
  originalChargeAmount      Decimal                   @db.Decimal(12, 2)
  originalChargePaidAmount  Decimal                   @db.Decimal(12, 2)
  originalChargeStatus      String                    // Guardado como string para snapshot
  amountIncluded            Decimal                   @db.Decimal(12, 2)

  // Estado de la cuota original después del convenio
  newStatus         ChargeStatus?

  // Tipo de relación
  relationType      PaymentAgreementChargeRelationType @default(REFINANCED)

  // Relaciones
  agreement         PaymentAgreement                   @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  charge            StudentCharge                      @relation(fields: [chargeId], references: [id], onDelete: Restrict)

  // Constraints
  @@unique([agreementId, chargeId])
  @@index([agreementId])
  @@index([chargeId])
  @@map("payment_agreement_charge_relations")
}
```

**Explicación:**

- `originalChargeAmount`: Monto original de la cuota (snapshot)
- `originalChargePaidAmount`: Monto pagado originalmente (snapshot)
- `originalChargeStatus`: Estado original de la cuota (snapshot como string)
- `amountIncluded`: Monto incluido en el convenio (puede ser menor si hay condonación)
- `newStatus`: Estado de la cuota después del convenio
- `relationType`: Tipo de relación (REFINANCED, BLOCKED, ASSOCIATED)
- `onDelete: Restrict` en `charge`: No permite eliminar cuota si está en un convenio (preserva historial)
- `onDelete: Cascade` en `agreement`: Si se elimina convenio, se eliminan relaciones (seguro)

**Impacto en deuda según relationType:**

- `REFINANCED`: La cuota original se marca como PAID (refinanciada), no cuenta como deuda
- `BLOCKED`: La cuota original se mantiene pero no genera bloqueos
- `ASSOCIATED`: La cuota original permanece activa, el convenio es solo informativo

**Validación de servicio:**

- No permite asociar dos convenios activos a la misma deuda por el mismo monto sin validación
- Verifica que `amountIncluded` no exceda `originalChargeAmount - originalChargePaidAmount`

---

### 4. PaymentAgreementEvent

**Propósito:** Historial de eventos del convenio (auditoría).

**Características:**

- Registro de todos los eventos importantes
- Guarda estados antes/después
- Metadatos flexibles
- Usuario responsable
- onDelete: Cascade (el historial vive con el convenio)

```prisma
model PaymentAgreementEvent {
  id                String                        @id @default(cuid())
  agreementId       String
  eventType         PaymentAgreementEventType
  description       String                        @db.Text
  previousStatus    PaymentAgreementStatus?
  newStatus         PaymentAgreementStatus?
  oldValue          Json?                         // Valor anterior para auditoría
  newValue          Json?                         // Valor nuevo para auditoría
  metadata          Json?                         // Metadatos adicionales
  reason            String?                       @db.Text // Motivo del cambio

  // Usuario y contexto
  userId            String
  userName          String
  createdAt         DateTime                      @default(now())

  // Relación con convenio
  agreement         PaymentAgreement             @relation(fields: [agreementId], references: [id], onDelete: Cascade)

  // Constraints
  @@index([agreementId])
  @@index([eventType])
  @@index([createdAt])
  @@index([agreementId, createdAt])
  @@map("payment_agreement_events")
}
```

**Explicación:**

- `eventType`: Tipo de evento según enum
- `description`: Descripción del evento
- `previousStatus`/`newStatus`: Para cambios de estado
- `oldValue`/`newValue`: Valores antes/después para auditoría real
- `metadata`: Información adicional flexible
- `reason`: Motivo del cambio (requerido para ciertos eventos)
- `userId`/`userName`: Usuario responsable
- `onDelete: Cascade`: Si se elimina el convenio, se elimina el historial (seguro)

---

### 5. PaymentAgreementNumber

**Propósito:** Numeración secuencial por año (similar a ReceiptNumber).

**Características:**

- Un registro por año
- lastNumber se incrementa transaccionalmente
- Garantiza no reutilización de números

```prisma
model PaymentAgreementNumber {
  id         String   @id @default(cuid())
  year       Int      @unique
  lastNumber Int      @default(0)
  updatedAt  DateTime @updatedAt

  @@map("payment_agreement_numbers")
}
```

**Explicación:**

- `year`: Año del convenio
- `lastNumber`: Último número usado
- `unique(year)`: Garantiza un registro por año

**Numeración transaccional:**

- El siguiente número se obtiene dentro de una transacción:
  ```typescript
  await prisma.$transaction(async (tx) => {
  	const numberRecord = await tx.paymentAgreementNumber.upsert({
  		where: { year },
  		create: { year, lastNumber: 0 },
  		update: { lastNumber: { increment: 1 } }
  	});
  	const nextNumber = numberRecord.lastNumber;
  	// Usar nextNumber para crear el convenio
  });
  ```
- **No reutilización:** Si se cancela un convenio, el número no se reutiliza
- **No "último + 1" fuera de transacción:** Siempre se usa upsert dentro de transacción
- **Futuro con sedes:** Si se agrega sede/punto de emisión, la constraint debe pasar a `[year, branchId]` o equivalente

---

## Modificaciones a Modelos Existentes

### 1. PaymentAllocation

**Modificación:** Agregar campo opcional para vincular a cuota de convenio.

**Propósito:** Permitir que un pago se asigne a una cuota de convenio.

**Validación:** Un pago no puede tener chargeId y installmentId simultáneamente.

```prisma
model PaymentAllocation {
  paymentId     String
  chargeId      String
  installmentId String?                       // NUEVO: opcional, referencia a cuota de convenio
  amount        Decimal                       @db.Decimal(12, 2)

  charge        StudentCharge                 @relation(fields: [chargeId], references: [id], onDelete: Restrict)
  payment       Payment                       @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  installment   PaymentAgreementInstallment?  @relation("PaymentAllocationInstallment", fields: [installmentId], references: [id], onDelete: Restrict) // NUEVO

  @@id([paymentId, chargeId])
  @@index([installmentId])                  // NUEVO: índice para queries eficientes
  @@map("payment_allocations")
}
```

**Explicación:**

- `installmentId`: Campo opcional para referencia a cuota de convenio
- `onDelete: Restrict`: No permite eliminar cuota si tiene pagos asignados (preserva historial)
- `@@index([installmentId])`: Índice para queries eficientes (no único para permitir pagos parciales múltiples)
- **Validación en servicio:** Una PaymentAllocation puede apuntar a chargeId O installmentId, no ambos. La doble imputación se evita validando montos/saldos en PaymentAgreementService, no con constraint de base de datos.

---

### 2. Receipt

**Modificación:** Agregar campos para identificar convenio y cuota.

**Propósito:** El recibo puede indicar que corresponde a pago de convenio.

```prisma
model Receipt {
  id               String        @id @default(cuid())
  receiptNumber    Int
  receiptYear      Int
  studentId        String
  studentName      String
  studentDni       String?
  studentAddress   String?
  totalAmount      Decimal       @db.Decimal(12, 2)
  paymentMethod    PaymentMethod
  paymentReference String?
  issuedAt         DateTime      @default(now())
  issuedBy         String
  issuedByName     String
  observations     String?
  status           ReceiptStatus @default(ISSUED)
  cancelledAt      DateTime?
  cancelledBy      String?
  cancelledReason  String?
  printCount       Int           @default(0)
  originalCopy     Boolean       @default(true)

  // NUEVOS: campos para convenio
  agreementId      String?       // NUEVO: opcional, referencia al convenio
  agreementNumber  Int?          // NUEVO: número de convenio para mostrar en recibo
  installmentNumber Int?         // NUEVO: número de cuota para mostrar en recibo

  items            ReceiptItem[]
  payments         Payment[]
  agreement        PaymentAgreement? @relation(fields: [agreementId], references: [id], onDelete: SetNull) // NUEVO

  @@unique([receiptNumber, receiptYear])
  @@index([studentId])
  @@index([receiptNumber, receiptYear])
  @@index([status])
  @@index([agreementId])         // NUEVO
  @@map("receipts")
}
```

**Explicación:**

- `agreementId`: Referencia opcional al convenio
- `agreementNumber`: Número de convenio para mostrar en el recibo (no es FK, es copia para historial)
- `installmentNumber`: Número de cuota para mostrar en el recibo
- `onDelete: SetNull`: Si se elimina el convenio, el recibo mantiene la referencia nula (preserva historial)
- `@@index([agreementId])`: Para queries eficientes de recibos por convenio

**Nota sobre ReceiptItem:**
El detalle del recibo normalmente vive en los ítems. Se evalúo agregar `agreementInstallmentId` a `ReceiptItem`, pero se concluye que con `Receipt.agreementId` es suficiente porque:

- El recibo ya tiene la relación con el convenio
- Los ítems del recibo pueden referenciar las cuotas originales (`chargeId`)
- Si es necesario mostrar cuota de convenio en el ítem, se puede derivar de `Receipt.agreementId` y el contexto
- Esto simplifica el schema sin perder funcionalidad

---

### 3. FinancialBlock

**Modificación:** Agregar campos para distinguir origen de excepción.

**Propósito:** Distinguir excepciones manuales de excepciones por convenio.

```prisma
model FinancialBlock {
  id               String                        @id @default(cuid())
  studentId        String
  blockType        FinancialBlockType
  blockReason      String
  blockedAt        DateTime                      @default(now())
  blockedBy        String
  blockedByName    String
  debtAmount       Decimal                       @db.Decimal(12, 2)
  overdueDays      Int?
  exceptionGranted Boolean                        @default(false)
  exceptionBy      String?
  exceptionAt      DateTime?
  exceptionReason  String?
  unblockedAt      DateTime?
  unblockedBy      String?

  // NUEVOS: campos para origen de excepción
  exceptionSource  FinancialBlockExceptionSource? // NUEVO: enum para distinguir origen
  exceptionAgreementId String?                    // NUEVO: referencia al convenio que genera la excepción
  exceptionAgreement PaymentAgreement?           @relation(fields: [exceptionAgreementId], references: [id], onDelete: SetNull) // NUEVO

  isActive         Boolean                        @default(true)
  createdAt        DateTime                      @default(now())
  updatedAt        DateTime                      @updatedAt

  @@index([studentId, isActive])
  @@index([blockType])
  @@index([isActive])
  @@index([exceptionSource])                    // NUEVO
  @@index([exceptionAgreementId])               // NUEVO
  @@map("financial_blocks")
}
```

**Explicación:**

- `exceptionSource`: Origen de la excepción según enum (MANUAL o PAYMENT_AGREEMENT)
- `exceptionAgreementId`: Referencia al convenio que genera la excepción
- `exceptionAgreement`: Relación con el convenio
- `onDelete: SetNull`: Si se elimina el convenio, la excepción se mantiene pero sin referencia (preserva historial)
- `@@index([exceptionSource])`: Para queries eficientes por tipo de excepción
- `@@index([exceptionAgreementId])`: Para queries eficientes por convenio

**Impacto en bloqueos:**

- Si `exceptionSource = MANUAL`: Excepción otorgada manualmente por administrador
- Si `exceptionSource = PAYMENT_AGREEMENT`: Excepción automática por convenio activo
- Al cancelar/incumplir convenio: se revocan excepciones con `exceptionSource = PAYMENT_AGREEMENT`

---

### 4. FinancialMovementType

**Modificación:** Agregar nuevos tipos de movimiento para convenios.

**Propósito:** Registrar eventos de convenio en el historial financiero unificado.

```prisma
enum FinancialMovementType {
  CHARGE
  PAYMENT
  ALLOCATION
  RECEIPT
  CANCELLATION
  ADJUSTMENT
  LATE_FEE
  DISCOUNT
  SCHOLARSHIP
  PAYMENT_AGREEMENT               // NUEVO: creación/modificación de convenio
  AGREEMENT_INSTALLMENT           // NUEVO: cuota de convenio
}
```

**Explicación:**

- `PAYMENT_AGREEMENT`: Para eventos de creación, activación, modificación de convenio
- `AGREEMENT_INSTALLMENT`: Para pagos de cuotas de convenio

---

### Relación entre Convenio, Pago y Cuota

**Regla de asignación:**

- Una `PaymentAllocation` puede apuntar a `chargeId` (cuota original) O a `installmentId` (cuota de convenio)
- No debe apuntar a ambos simultáneamente

**Validación en PaymentAgreementService:**

```typescript
// Al asignar pago a cuota de convenio
if (allocation.chargeId && allocation.installmentId) {
	throw new Error(
		'Un pago no puede asignarse simultáneamente a cuota original y cuota de convenio'
	);
}

// Validar que el monto no exceda el saldo pendiente
const installment = await prisma.paymentAgreementInstallment.findUnique({
	where: { id: allocation.installmentId }
});
if (Decimal.gt(allocation.amount, installment.pendingAmount)) {
	throw new Error('El pago excede el saldo pendiente de la cuota');
}
```

**Evitar doble imputación:**

- La doble imputación se evita validando montos/saldos en el servicio
- No se usa constraint de base de datos porque una cuota puede recibir pagos parciales múltiples
- El servicio debe asegurarse de que la suma de allocations no exceda el monto de la cuota

---

## Permisos Granulares Necesarios

### Entidad: PAYMENT_AGREEMENT

```prisma
// En prisma/seed-permissions.ts

// SUPERADMIN
{
  roleCode: 'SUPERADMIN',
  entity: 'PAYMENT_AGREEMENT',
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true
}

// DIRECTOR
{
  roleCode: 'DIRECTOR',
  entity: 'PAYMENT_AGREEMENT',
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true
}

// FINANZAS
{
  roleCode: 'FINANZAS',
  entity: 'PAYMENT_AGREEMENT',
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: false  // No puede eliminar, solo cancelar
}

// SECRETARIA
{
  roleCode: 'SECRETARIA',
  entity: 'PAYMENT_AGREEMENT',
  canCreate: false,
  canRead: true,
  canUpdate: false,
  canDelete: false
}

// ALUMNO
{
  roleCode: 'ALUMNO',
  entity: 'PAYMENT_AGREEMENT',
  canCreate: false,
  canRead: true,  // Solo sus propios convenios (validado en server)
  canUpdate: false,
  canDelete: false
}
```

---

## Validaciones de Schema

### 1. No duplicación de deuda ✅

- `PaymentAgreementChargeRelation` referencia cuotas originales, no las duplica
- `relationType` define impacto en deuda (REFINANCED, BLOCKED, ASSOCIATED)
- Si `REFINANCED`: cuota original se marca como PAID, no cuenta como deuda
- Si `BLOCKED`: cuota original no genera bloqueos pero sigue existiendo
- Si `ASSOCIATED`: cuota original permanece activa

### 2. Trazabilidad con deuda original ✅

- `PaymentAgreementChargeRelation` guarda:
  - `originalAmount`: Monto original
  - `includedAmount`: Monto incluido en convenio
  - `originalStatus`: Estado antes del convenio
  - `newStatus`: Estado después del convenio
  - `relationType`: Tipo de relación
- `onDelete: Restrict` en `charge`: No permite eliminar cuota si está en convenio

### 3. Cuotas del convenio son entidades reales ✅

- `PaymentAgreementInstallment` es un modelo completo
- Tiene estado propio (PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, WAIVED)
- Tiene montos individuales
- Se relaciona con `PaymentAllocation` para pagos
- No es solo metadatos, es una entidad financiera real

### 4. Pago de convenio vinculado con Payment ✅

- `PaymentAllocation` tiene campo opcional `installmentId`
- `@@index([installmentId])` para queries eficientes (no único para permitir pagos parciales múltiples)
- Validación en servicio: paymentId tiene chargeId O installmentId, no ambos
- La doble imputación se evita validando montos/saldos en PaymentAgreementService
- `onDelete: Restrict` en `installment`: Preserva historial

### 5. Recibo identifica convenio y cuota ✅

- `Receipt` tiene campos:
  - `agreementId`: Referencia al convenio
  - `agreementNumber`: Copia del número para historial
  - `installmentNumber`: Número de cuota
- `onDelete: SetNull` en `agreement`: Preserva historial del recibo

### 6. Bloqueos distinguen origen ✅

- `FinancialBlock` tiene:
  - `exceptionSource`: Enum `FinancialBlockExceptionSource` (MANUAL o PAYMENT_AGREEMENT)
  - `exceptionAgreementId`: Referencia al convenio
  - `exceptionAgreement`: Relación con el convenio
- Índices para queries eficientes
- Lógica separada para cada tipo de excepción

### 7. Numeración segura y no reutilizable ✅

- `PaymentAgreementNumber` con `unique(year)`
- `lastNumber` se incrementa transaccionalmente
- `PaymentAgreement` tiene `@@unique([agreementNumber, agreementYear])`
- Garantiza no reutilización de números

### 8. Sin Float ni number para dinero ✅

- Todos los montos usan `Decimal @db.Decimal(12, 2)`
- No hay `Float` ni `number` para dinero
- Precisión financiera garantizada

### 9. Sin onDelete: Cascade peligroso ✅

- `PaymentAgreementChargeRelation.charge`: `onDelete: Restrict` (preserva historial)
- `PaymentAllocation.installment`: `onDelete: Restrict` (preserva historial)
- `PaymentAgreementInstallment.agreement`: `onDelete: Restrict` (preserva historial - servicio valida antes de eliminar)
- `PaymentAgreementEvent.agreement`: `onDelete: Cascade` (seguro, historial vive con convenio)
- `Receipt.agreement`: `onDelete: SetNull` (preserva historial)
- `FinancialBlock.exceptionAgreement`: `onDelete: SetNull` (preserva historial)

**Nota:** `PaymentAgreementInstallment.agreement` usa `Restrict` porque la base de datos no sabe si el convenio está en DRAFT o ACTIVE. El servicio debe validar que el convenio no tenga pagos, recibos, allocations ni eventos críticos antes de permitir eliminación.

### 10. Preparado para auditoría real ✅

- `PaymentAgreementEvent` registra todos los eventos
- `AuditLog` puede auditar operaciones con entidad `PAYMENT_AGREEMENT`
- `FinancialMovement` registra movimientos de convenio
- Todos los cambios tienen usuario responsable
- Metadatos flexibles para información adicional

---

## Resumen de Modelos

| Modelo                         | Propósito                       | Relaciones                                  | onDelete                               |
| ------------------------------ | ------------------------------- | ------------------------------------------- | -------------------------------------- |
| PaymentAgreement               | Convenio principal              | ChargeRelation, Installment, Event, Receipt | -                                      |
| PaymentAgreementInstallment    | Cuotas del convenio             | PaymentAllocation                           | Restrict (servicio valida)             |
| PaymentAgreementChargeRelation | Trazabilidad con deuda original | PaymentAgreement, StudentCharge             | Cascade (agreement), Restrict (charge) |
| PaymentAgreementEvent          | Historial de eventos            | PaymentAgreement                            | Cascade (seguro)                       |
| PaymentAgreementNumber         | Numeración secuencial           | -                                           | -                                      |

## Resumen de Modificaciones

| Modelo                | Modificación                                                                      | Propósito                           |
| --------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| PaymentAllocation     | Agregar installmentId (opcional, indexado, no único)                              | Vincular pagos a cuotas de convenio |
| Receipt               | Agregar agreementId, agreementNumber, installmentNumber                           | Identificar convenio en recibo      |
| FinancialBlock        | Agregar exceptionSource (enum), exceptionAgreementId, relación exceptionAgreement | Distinguir origen de excepción      |
| FinancialMovementType | Agregar PAYMENT_AGREEMENT, AGREEMENT_INSTALLMENT                                  | Registrar movimientos de convenio   |

---

## Próximo Paso

Este schema está listo para revisión. Después de aprobación:

1. Crear migración con estos cambios
2. Actualizar seed de permisos
3. Implementar PaymentAgreementService (Fase 1)
4. Crear pruebas funcionales
5. Documentar implementación
