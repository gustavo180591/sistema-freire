# Schema Financiero Corregido - Fase 1

**Fecha:** 14 de junio de 2026  
**Estado:** Corregido según feedback del usuario  
**Migración:** `20260614_add_financial_receipts_blocks_and_movements` (a corregir)

## Resumen de Correcciones

1. **FinancialBlock:** Cambiar unique compuesto por índice único parcial en SQL
2. **StudentCharge:** Hacer `academicTermId` obligatorio para unique válido
3. **Payment:** Documentar comportamiento con reference nullable (no cambia)
4. **Receipt:** Documentar asunción de talonario único (no cambia por ahora)
5. **ReceiptItem → Receipt:** Cambiar Cascade a Restrict
6. **Payments → Receipt:** Cambiar SetNull a Restrict
7. **Decimal(12,2):** Verificado consistente (no cambia)
8. **ReceiptNumber:** Documentar estrategia transaccional (no cambia schema)

## Modelos Financieros Corregidos

### StudentCharge

```prisma
model StudentCharge {
  id                 String              @id @default(cuid())
  studentId          String
  conceptId          String
  periodLabel        String
  amount             Decimal             @db.Decimal(12, 2)
  paidAmount         Decimal             @default(0) @db.Decimal(12, 2)
  dueDate            DateTime?
  status             ChargeStatus        @default(PENDING)
  notes              String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  userId             String?
  academicTermId     String              // CORRECCIÓN: Ahora obligatorio
  // Nuevos campos para cálculos financieros
  lateFeeApplied     Decimal             @default(0) @db.Decimal(12, 2)
  discountApplied    Decimal             @default(0) @db.Decimal(12, 2)
  scholarshipApplied Decimal             @default(0) @db.Decimal(12, 2)
  finalAmount        Decimal             @db.Decimal(12, 2)
  isOverdue          Boolean             @default(false)
  overdueSince       DateTime?
  allocations        PaymentAllocation[]
  lateFees           LateFee[]
  academicTerm       AcademicTerm        @relation(fields: [academicTermId], references: [id])
  concept            ChargeConcept       @relation(fields: [conceptId], references: [id])
  student            Student             @relation(fields: [studentId], references: [id])
  user               User?               @relation(fields: [userId], references: [id])

  // CORRECCIÓN: Unique válido ahora que academicTermId es obligatorio
  @@unique([studentId, conceptId, periodLabel, academicTermId])
  @@index([studentId, status])
  @@index([periodLabel])
  @@index([academicTermId])
  @@index([dueDate])
  @@index([isOverdue])
  @@map("student_charges")
}
```

**Justificación:**
- `academicTermId` ahora es obligatorio para garantizar que el unique `[studentId, conceptId, periodLabel, academicTermId]` funcione correctamente
- Esto previene cuotas duplicadas por alumno+concepto+período+ciclo académico
- Si en el futuro se necesitan cuotas sin ciclo académico, se puede agregar un valor "default" o reconsiderar el diseño

### Payment

```prisma
model Payment {
  id              String              @id @default(cuid())
  studentId       String
  amount          Decimal             @db.Decimal(12, 2)
  method          PaymentMethod
  reference       String?             // Nullable permitido
  paidAt          DateTime            @default(now())
  notes           String?
  createdAt       DateTime            @default(now())
  userId          String?
  academicTermId  String?
  // Nuevos campos para anulación y recibo
  receiptId       String?
  cancelledAt     DateTime?
  cancelledBy     String?
  cancelledReason String?
  isCancelled     Boolean             @default(false)
  allocations     PaymentAllocation[]
  receipt         Receipt?            @relation(fields: [receiptId], references: [id], onDelete: Restrict) // CORRECCIÓN
  academicTerm    AcademicTerm?       @relation(fields: [academicTermId], references: [id])
  student         Student             @relation(fields: [studentId], references: [id])
  user            User?               @relation(fields: [userId], references: [id])

  // Unique permite múltiples pagos sin referencia (reference = NULL)
  @@unique([method, reference], name: "payment_method_reference_unique")
  @@index([studentId, paidAt])
  @@index([academicTermId])
  @@index([receiptId])
  @@index([isCancelled])
  @@map("payments")
}
```

**Justificación:**
- `reference` nullable es correcto: permite múltiples pagos sin referencia (ej. efectivo)
- En SQL, NULL != NULL, por lo que `(method, NULL)` no viola el unique
- **CORRECCIÓN:** Cambiado `onDelete: SetNull` a `onDelete: Restrict` para evitar perder referencia histórica

### Receipt

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
  items            ReceiptItem[]
  payments         Payment[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  // Asume talonario único institucional
  // Si en el futuro hay múltiples talonarios (por sede, punto de venta), agregar dimensión
  @@unique([receiptNumber, receiptYear])
  @@index([studentId])
  @@index([receiptNumber, receiptYear])
  @@index([status])
  @@map("receipts")
}
```

**Justificación:**
- Unique `[receiptNumber, receiptYear]` asume un solo talonario institucional
- **Restricción documentada:** Si el instituto implementa múltiples talonarios (por sede, punto de venta), se debe agregar esa dimensión al unique
- Los recibos usan soft delete (`status = CANCELLED`), no borrado físico

### ReceiptItem

```prisma
model ReceiptItem {
  id             String  @id @default(cuid())
  receiptId      String
  chargeId       String?
  concept        String
  periodLabel    String?
  baseAmount     Decimal @db.Decimal(12, 2)
  lateFeeAmount  Decimal @default(0) @db.Decimal(12, 2)
  discountAmount Decimal @default(0) @db.Decimal(12, 2)
  finalAmount    Decimal @db.Decimal(12, 2)
  receipt        Receipt @relation(fields: [receiptId], references: [id], onDelete: Restrict) // CORRECCIÓN

  @@index([receiptId])
  @@map("receipt_items")
}
```

**Justificación:**
- **CORRECCIÓN:** Cambiado `onDelete: Cascade` a `onDelete: Restrict`
- En finanzas, los recibos no deben borrarse físicamente, solo anularse (soft delete)
- Esto preserva el historial financiero completo

### FinancialMovement

```prisma
model FinancialMovement {
  id            String                @id @default(cuid())
  studentId     String
  movementType  FinancialMovementType
  entityType    String
  entityId      String
  description   String
  amount        Decimal               @db.Decimal(12, 2)
  balanceBefore Decimal               @db.Decimal(12, 2)
  balanceAfter  Decimal               @db.Decimal(12, 2)
  metadata      Json?
  userId        String?
  createdAt     DateTime              @default(now())

  @@index([studentId, createdAt])
  @@index([movementType])
  @@index([entityType, entityId])
  @@map("financial_movements")
}
```

**Justificación:**
- Sin cambios - modelo append-only correcto
- No hay onDelete porque no tiene relaciones de integridad referencial

### Discount

```prisma
model Discount {
  id           String       @id @default(cuid())
  code         String       @unique
  name         String
  description  String?
  discountType DiscountType
  value        Decimal      @db.Decimal(12, 2)
  applicableTo String[]
  minAmount    Decimal?     @db.Decimal(12, 2)
  maxAmount    Decimal?     @db.Decimal(12, 2)
  validFrom    DateTime
  validUntil   DateTime?
  active       Boolean      @default(true)
  priority     Int          @default(0)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([active])
  @@index([validFrom, validUntil])
  @@map("discounts")
}
```

**Justificación:**
- Sin cambios - modelo correcto

### LateFee

```prisma
model LateFee {
  id               String        @id @default(cuid())
  chargeId         String
  chargeAmount     Decimal       @db.Decimal(12, 2)
  daysOverdue      Int
  feeType          LateFeeType
  feeValue         Decimal       @db.Decimal(12, 2)
  calculatedAmount Decimal       @db.Decimal(12, 2)
  appliedAt        DateTime      @default(now())
  appliedBy        String?
  isAutomatic      Boolean       @default(true)
  charge           StudentCharge @relation(fields: [chargeId], references: [id], onDelete: Cascade)

  @@index([chargeId])
  @@index([appliedAt])
  @@map("late_fees")
}
```

**Justificación:**
- Sin cambios - `onDelete: Cascade` es correcto para recargos asociados a cuotas
- Si se borra una cuota, sus recargos también deben borrarse

### FinancialBlock

```prisma
model FinancialBlock {
  id               String             @id @default(cuid())
  studentId        String
  blockType        FinancialBlockType
  blockReason      String
  blockedAt        DateTime           @default(now())
  blockedBy        String
  blockedByName    String
  debtAmount       Decimal            @db.Decimal(12, 2)
  overdueDays      Int?
  exceptionGranted Boolean            @default(false)
  exceptionBy      String?
  exceptionAt      DateTime?
  exceptionReason  String?
  unblockedAt      DateTime?
  unblockedBy      String?
  isActive         Boolean            @default(true)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  // CORRECCIÓN: Unique compuesto removido - se crea índice único parcial en SQL
  @@index([studentId, isActive])
  @@index([blockType])
  @@index([isActive])
  @@map("financial_blocks")
}
```

**Justificación:**
- **CORRECCIÓN:** Removido `@@unique([studentId, blockType, isActive])` del schema Prisma
- En su lugar, se crea índice único parcial en SQL: `CREATE UNIQUE INDEX financial_block_unique_active ON financial_blocks (studentId, blockType) WHERE isActive = true;`
- Esto permite múltiples bloqueos inactivos del mismo tipo (historial) pero solo uno activo
- Prisma no soporta índices parciales, por lo que se crea manualmente en la migración SQL

### FinancialConfig

```prisma
model FinancialConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  category    String
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  @@index([category])
  @@map("financial_config")
}
```

**Justificación:**
- Sin cambios - modelo correcto

### ReceiptNumber

```prisma
model ReceiptNumber {
  id         String   @id @default(cuid())
  year       Int      @unique
  lastNumber Int      @default(0)
  updatedAt  DateTime @updatedAt

  @@map("receipt_numbers")
}
```

**Justificación:**
- Sin cambios - modelo correcto
- Estrategia de numeración transaccional se implementa en el servicio con SQL raw

## Estrategia de Numeración de Recibos - Implementación

La numeración de recibos debe ser transaccional y segura contra concurrencia. Implementación en `FinancialService.getNextReceiptNumber()`:

```typescript
async getNextReceiptNumber(year: number, tx?: Prisma.TransactionClient): Promise<number> {
  const prismaClient = tx || prisma;
  
  // Usar SQL raw con SELECT FOR UPDATE para bloqueo de fila
  const result = await prismaClient.$queryRaw<Array<{ lastnumber: number }>>`
    SELECT lastNumber 
    FROM receipt_numbers 
    WHERE year = ${year}
    FOR UPDATE
  `;
  
  let nextNumber: number;
  
  if (result.length === 0) {
    // Crear registro para el año si no existe
    await prismaClient.receiptNumber.create({
      data: { year, lastNumber: 1 }
    });
    nextNumber = 1;
  } else {
    // Incrementar número
    nextNumber = (result[0].lastnumber as number) + 1;
    await prismaClient.receiptNumber.update({
      where: { year },
      data: { lastNumber: nextNumber }
    });
  }
  
  return nextNumber;
}
```

**Justificación:**
- `SELECT ... FOR UPDATE` bloquea la fila hasta el commit de la transacción
- Esto garantiza que no haya números duplicados incluso bajo alta concurrencia
- La operación debe ejecutarse dentro de una transacción Prisma (`$transaction`)
- Si se llama sin transacción, se usa el cliente Prisma default (no recomendado para alta concurrencia)

## Reglas ON DELETE - Resumen

| Relación | ON DELETE | Justificación |
|----------|-----------|---------------|
| PaymentAllocation → StudentCharge | Restrict | Evitar borrar cuotas con pagos asignados |
| PaymentAllocation → Payment | Restrict | Evitar borrar pagos con asignaciones |
| ReceiptItem → Receipt | **Restrict** (corregido) | Preservar historial - recibos no se borran físicamente |
| LateFee → StudentCharge | Cascade | Recargos dependen de la cuota |
| Payments → Receipt | **Restrict** (corregido) | Preservar referencia histórica - recibos no se borran físicamente |

## Índices Únicos Parciales - SQL Manual

### FinancialBlock - Índice único parcial

```sql
-- Crear índice único parcial para permitir solo un bloqueo activo por tipo
CREATE UNIQUE INDEX financial_block_unique_active 
ON financial_blocks (studentId, blockType) 
WHERE isActive = true;
```

**Justificación:**
- Permite múltiples bloqueos inactivos del mismo tipo (historial)
- Garantiza solo un bloqueo activo por tipo
- Prisma no soporta índices parciales, por lo que se crea en SQL manual

## Riesgos de Concurrencia

### ReceiptNumber
- **Riesgo:** Números duplicados bajo alta concurrencia
- **Mitigación:** `SELECT ... FOR UPDATE` en transacción Prisma
- **Verificación:** Pruebas de carga en Fase 4

### FinancialBlock
- **Riesgo:** Múltiples bloqueos activos del mismo tipo
- **Mitigación:** Índice único parcial en SQL
- **Verificación:** Pruebas funcionales en Fase 5

### Payment
- **Riesgo:** Referencias duplicadas por método
- **Mitigación:** Unique constraint `[method, reference]`
- **Verificación:** Pruebas funcionales en Fase 3

## Campos Obligatorios vs Opcionales

### StudentCharge
- `academicTermId`: **Obligatorio** (corregido) - Necesario para unique válido

### Payment
- `reference`: **Opcional** - Permite pagos sin referencia (efectivo)
- `receiptId`: **Opcional** - Pagos pueden no tener recibo aún

### Receipt
- `studentDni`, `studentAddress`: **Opcionales** - Datos adicionales del alumno
- `paymentReference`: **Opcional** - Referencia externa del pago

### ReceiptItem
- `chargeId`: **Opcional** - Ítems pueden no estar asociados a cuota (ej. ajustes manuales)
- `periodLabel`: **Opcional** - No todos los ítems tienen período

## Justificación de Cada Constraint Financiero

### StudentCharge - Unique [studentId, conceptId, periodLabel, academicTermId]
- **Propósito:** Prevenir cuotas duplicadas por alumno+concepto+período+ciclo
- **Justificación:** Un alumno no debe tener dos cuotas del mismo concepto en el mismo período del mismo ciclo académico
- **Riesgo:** Si `academicTermId` es nullable, el unique no funciona (NULL != NULL)
- **Mitigación:** Hacer `academicTermId` obligatorio

### Payment - Unique [method, reference]
- **Propósito:** Prevenir referencias duplicadas por método de pago
- **Justificación:** Un pago con transferencia bancaria no debe tener el mismo número de comprobante que otro
- **Comportamiento con NULL:** Múltiples pagos sin referencia (reference = NULL) no violan el unique (correcto para efectivo)

### Receipt - Unique [receiptNumber, receiptYear]
- **Propósito:** Numeración única de recibos por año
- **Justificación:** Un talonario institucional único
- **Restricción:** Si hay múltiples talonarios (por sede, punto de venta), agregar dimensión
- **Riesgo:** Si se implementa multi-talonario sin actualizar el unique, habrá conflictos
- **Mitigación:** Documentar restricción y planificar extensión si es necesario

### Discount - Unique [code]
- **Propósito:** Código único de descuento
- **Justificación:** Evitar códigos duplicados que causen confusión

### FinancialConfig - Unique [key]
- **Propósito:** Clave única de configuración
- **Justificación:** Evitar configuraciones duplicadas

### ReceiptNumber - Unique [year]
- **Propósito:** Un registro de numeración por año
- **Justificación:** Numeración de recibos se reinicia cada año

### FinancialBlock - Índice único parcial [studentId, blockType] WHERE isActive = true
- **Propósito:** Solo un bloqueo activo por tipo por alumno
- **Justificación:** Un alumno no puede tener dos bloqueos activos del mismo tipo (ej. dos bloqueos de inscripción)
- **Beneficio:** Permite historial de bloqueos inactivos
- **Implementación:** Índice único parcial en SQL manual

## Verificación Decimal(12,2)

### Todos los montos financieros usan Decimal(12,2):
- StudentCharge: amount, paidAmount, lateFeeApplied, discountApplied, scholarshipApplied, finalAmount
- Payment: amount
- PaymentAllocation: amount
- Scholarship: percentage, maxMonthlyAmount, appliedAmount
- Receipt: totalAmount
- ReceiptItem: baseAmount, lateFeeAmount, discountAmount, finalAmount
- FinancialMovement: amount, balanceBefore, balanceAfter
- Discount: value, minAmount, maxAmount
- LateFee: chargeAmount, feeValue, calculatedAmount
- FinancialBlock: debtAmount

### financial-service.ts - Sin conversión a number
- Todos los métodos usan tipos `Decimal` de Prisma
- Helpers de cálculo decimal operan con `Decimal`
- No hay conversión a `number` para persistencia
- Solo conversión a `number` para display/formatting (correcto)

## Próximos Pasos

1. Aplicar correcciones a `prisma/schema.prisma`
2. Corregir migración SQL con índice único parcial
3. Probar migración en base temporal vacía
4. Verificar `migrate status` limpio
5. Verificar `npm run check` con 0 errores
6. Verificar `npm run build` exitoso
