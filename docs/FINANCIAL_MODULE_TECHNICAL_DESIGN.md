# Plan Técnico de Implementación - Módulo de Sistema Financiero

**Estado:** Diseño Propuesto - Pendiente de Aprobación
**Fecha:** 14/06/2026
**Versión:** 1.0

---

## 1. Arquitectura Financiera

### 1.1 Entidades del Módulo y Responsabilidades

| Entidad               | Representa                                             | Responsabilidad                                                   | Modelo Prisma                              |
| --------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------ |
| **ChargeConcept**     | Concepto financiero (matrícula, cuota mensual, examen) | Define qué se cobra, código, descripción, estado activo           | `ChargeConcept` (existente, conservar)     |
| **StudentCharge**     | Cuota/Cargo individual de un alumno                    | Registro de un concepto a cobrar a un alumno en un período        | `StudentCharge` (existente, modificar)     |
| **Payment**           | Pago realizado por un alumno                           | Registro de un pago con método, monto, referencia                 | `Payment` (existente, modificar)           |
| **PaymentAllocation** | Asignación de pago a cuota                             | Relación muchos-a-muchos entre pago y cuota                       | `PaymentAllocation` (existente, conservar) |
| **Receipt**           | Recibo institucional de pago                           | Comprobante legal formal con número correlativo                   | `Receipt` (nuevo)                          |
| **ReceiptItem**       | Ítem de recibo                                         | Línea de detalle del recibo (concepto, monto, recargo, descuento) | `ReceiptItem` (nuevo)                      |
| **FinancialMovement** | Movimiento financiero unificado                        | Historial de todas las operaciones financieras                    | `FinancialMovement` (nuevo)                |
| **Scholarship**       | Beca asignada a un alumno                              | Descuento porcentual por período                                  | `Scholarship` (existente, modificar)       |
| **Discount**          | Descuento configurado                                  | Regla de descuento (porcentaje o fijo) con condiciones            | `Discount` (nuevo)                         |
| **LateFee**           | Recargo por mora                                       | Interés calculado por vencimiento de cuota                        | `LateFee` (nuevo)                          |
| **FinancialBlock**    | Bloqueo financiero                                     | Registro de bloqueo/desbloqueo por deuda                          | `FinancialBlock` (nuevo)                   |
| **FinancialConfig**   | Configuración financiera institucional                 | Parámetros globales (recargos, días de gracia, etc.)              | `FinancialConfig` (nuevo)                  |
| **ReceiptNumber**     | Secuencia de números de recibo                         | Control de números correlativos por año                           | `ReceiptNumber` (nuevo)                    |

### 1.2 Relaciones entre Entidades

```
ChargeConcept (1) ----< (N) StudentCharge
StudentCharge (1) ----< (N) PaymentAllocation
Payment (1) ----< (N) PaymentAllocation
Payment (1) ----< (1) Receipt
Receipt (1) ----< (N) ReceiptItem
StudentCharge (1) ----< (N) LateFee
StudentCharge (1) ----< (N) Scholarship
StudentCharge (1) ----< (N) Discount
Student (1) ----< (N) FinancialBlock
FinancialConfig (singleton) ---- (configura todo)
ReceiptNumber (singleton por año) ---- (genera números)
StudentCharge (1) ----< (N) FinancialMovement
Payment (1) ----< (N) FinancialMovement
Receipt (1) ----< (N) FinancialMovement
```

### 1.3 Modelos que se Conservan

- `ChargeConcept` - Sin cambios mayores
- `PaymentAllocation` - Sin cambios
- `Scholarship` - Se agregan campos de aplicación

### 1.4 Modelos que se Modifican

- `StudentCharge` - Agregar campos para recargos, descuentos aplicados
- `Payment` - Agregar campos de anulación
- `Scholarship` - Agregar campos de aplicación automática

### 1.5 Evitar Duplicación de Responsabilidades

- **StudentCharge** NO almacena el estado de pago final (eso está en `paidAmount` y `status`)
- **Payment** NO almacena directamente a qué cuota se aplicó (eso está en `PaymentAllocation`)
- **Receipt** NO almacena el monto total calculado (se calcula desde `ReceiptItem`)
- **FinancialMovement** NO modifica datos existentes (es registro histórico inmutable)
- **FinancialBlock** NO bloquea directamente (es registro que otros servicios consultan)

---

## 2. Modelado Prisma Propuesto

### 2.1 Nuevos Modelos

#### 2.1.1 Receipt (Recibo Institucional)

```prisma
model Receipt {
  id                String        @id @default(cuid())
  receiptNumber     Int           // Número correlativo
  receiptYear       Int           // Año del recibo (para secuencias anuales)
  studentId         String
  studentName       String        // Nombre al momento de emisión (snapshot)
  studentDni        String?       // DNI al momento de emisión (snapshot)
  studentAddress    String?       // Dirección al momento de emisión (snapshot)
  totalAmount       Decimal       @db.Decimal(12, 2)
  paymentMethod     PaymentMethod
  paymentReference  String?       // Referencia del pago (transferencia, tarjeta, etc.)
  issuedAt          DateTime      @default(now())
  issuedBy          String        // userId del emisor
  issuedByName      String        // Nombre del emisor (snapshot)
  observations      String?       // Observaciones
  status            ReceiptStatus @default(ISSUED)
  cancelledAt       DateTime?     // Fecha de anulación
  cancelledBy       String?       // userId del anulador
  cancelledReason   String?       // Motivo de anulación
  printCount        Int           @default(0) // Contador de impresiones
  originalCopy      Boolean       @default(true) // true=original, false=copia
  items             ReceiptItem[]
  payments          Payment[]     // Pagos asociados a este recibo
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@unique([receiptNumber, receiptYear])
  @@index([studentId])
  @@index([receiptNumber, receiptYear])
  @@index([status])
  @@map("receipts")
}
```

#### 2.1.2 ReceiptItem (Ítem de Recibo)

```prisma
model ReceiptItem {
  id              String    @id @default(cuid())
  receiptId       String
  chargeId        String?   // Cuota asociada (opcional, puede ser pago genérico)
  concept         String    // Concepto (snapshot del nombre)
  periodLabel     String?   // Período (snapshot)
  baseAmount      Decimal   @db.Decimal(12, 2) // Monto base
  lateFeeAmount   Decimal   @default(0) @db.Decimal(12, 2) // Recargo
  discountAmount  Decimal   @default(0) @db.Decimal(12, 2) // Descuento
  finalAmount     Decimal   @db.Decimal(12, 2) // Monto final
  receipt         Receipt   @relation(fields: [receiptId], references: [id], onDelete: Cascade)

  @@index([receiptId])
  @@map("receipt_items")
}
```

#### 2.1.3 FinancialMovement (Movimiento Financiero Unificado)

```prisma
model FinancialMovement {
  id              String                @id @default(cuid())
  studentId       String
  movementType    FinancialMovementType // CHARGE, PAYMENT, ALLOCATION, RECEIPT, CANCELLATION, ADJUSTMENT
  entityType      String                // StudentCharge, Payment, Receipt, etc.
  entityId        String                // ID de la entidad relacionada
  description     String
  amount          Decimal               @db.Decimal(12, 2) // Positivo=ingreso, negativo=egreso
  balanceBefore   Decimal               @db.Decimal(12, 2) // Saldo antes del movimiento
  balanceAfter    Decimal               @db.Decimal(12, 2) // Saldo después del movimiento
  metadata        Json?                 // Datos adicionales (oldValue, newValue, etc.)
  userId          String?               // Usuario que realizó la acción
  createdAt       DateTime              @default(now())

  @@index([studentId, createdAt])
  @@index([movementType])
  @@index([entityType, entityId])
  @@map("financial_movements")
}
```

#### 2.1.4 Discount (Descuento Configurado)

```prisma
model Discount {
  id              String        @id @default(cuid())
  code            String        @unique // Código del descuento
  name            String
  description     String?
  discountType    DiscountType  // PERCENTAGE, FIXED
  value           Decimal       @db.Decimal(12, 2) // Porcentaje o monto fijo
  applicableTo    String[]      // ["MATRICULA", "CUOTA_MENSUAL", "EXAMEN"]
  minAmount       Decimal?      @db.Decimal(12, 2) // Monto mínimo para aplicar
  maxAmount       Decimal?      @db.Decimal(12, 2) // Monto máximo a descontar
  validFrom       DateTime
  validUntil      DateTime?
  active          Boolean       @default(true)
  priority        Int           @default(0) // Orden de aplicación (mayor=primero)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([active])
  @@index([validFrom, validUntil])
  @@map("discounts")
}
```

#### 2.1.5 LateFee (Recargo por Mora)

```prisma
model LateFee {
  id              String        @id @default(cuid())
  chargeId        String        // Cuota a la que se aplica
  chargeAmount    Decimal       @db.Decimal(12, 2) // Monto original de la cuota
  daysOverdue     Int           // Días de mora
  feeType         LateFeeType   // PERCENTAGE, FIXED
  feeValue        Decimal       @db.Decimal(12, 2) // Porcentaje o monto fijo
  calculatedAmount Decimal     @db.Decimal(12, 2) // Monto calculado
  appliedAt       DateTime      @default(now())
  appliedBy       String?       // userId (si fue manual)
  isAutomatic     Boolean       @default(true) // true=automático, false=manual
  charge          StudentCharge @relation(fields: [chargeId], references: [id], onDelete: Cascade)

  @@index([chargeId])
  @@index([appliedAt])
  @@map("late_fees")
}
```

#### 2.1.6 FinancialBlock (Bloqueo Financiero)

```prisma
model FinancialBlock {
  id              String            @id @default(cuid())
  studentId       String
  blockType       FinancialBlockType // ENROLLMENT, EXAM, COURSE, CERTIFICATE, REPORT
  blockReason     String            // Motivo del bloqueo
  blockedAt       DateTime          @default(now())
  blockedBy       String            // userId del bloqueador
  blockedByName   String            // Nombre del bloqueador (snapshot)
  debtAmount      Decimal           @db.Decimal(12, 2) // Monto de deuda al momento del bloqueo
  overdueDays     Int?              // Días de mora
  exceptionGranted Boolean          @default(false) // true=excepción otorgada
  exceptionBy     String?           // userId del autorizador
  exceptionAt     DateTime?         // Fecha de autorización
  exceptionReason String?           // Motivo de la excepción
  unblockedAt     DateTime?         // Fecha de desbloqueo
  unblockedBy     String?           // userId del desbloqueador
  isActive        Boolean           @default(true) // true=activo, false=inactivo
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([studentId, isActive])
  @@index([blockType])
  @@index([isActive])
  @@map("financial_blocks")
}
```

#### 2.1.7 FinancialConfig (Configuración Financiera)

```prisma
model FinancialConfig {
  id                    String   @id @default(cuid())
  key                   String   @unique // Clave de configuración
  value                 Json     // Valor (puede ser número, string, objeto)
  description           String?
  category              String   // "LATE_FEE", "DISCOUNT", "BLOCK", "RECEIPT"
  updatedAt             DateTime @updatedAt
  updatedBy             String?  // userId

  @@index([category])
  @@map("financial_config")
}
```

#### 2.1.8 ReceiptNumber (Secuencia de Números de Recibo)

```prisma
model ReceiptNumber {
  id          String   @id @default(cuid())
  year        Int      @unique
  lastNumber  Int      @default(0)
  updatedAt   DateTime @updatedAt

  @@map("receipt_numbers")
}
```

### 2.2 Modificaciones a Modelos Existentes

#### 2.2.1 StudentCharge (Modificar)

```prisma
model StudentCharge {
  id                    String              @id @default(cuid())
  studentId             String
  conceptId             String
  periodLabel           String
  amount                Decimal             @db.Decimal(12, 2)
  paidAmount            Decimal             @default(0) @db.Decimal(12, 2)
  dueDate               DateTime?
  status                ChargeStatus        @default(PENDING)
  notes                 String?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  userId                String?
  academicTermId        String?

  // NUEVOS CAMPOS
  lateFeeApplied       Decimal             @default(0) @db.Decimal(12, 2) // Recargos aplicados
  discountApplied      Decimal             @default(0) @db.Decimal(12, 2) // Descuentos aplicados
  scholarshipApplied    Decimal             @default(0) @db.Decimal(12, 2) // Beca aplicada
  finalAmount          Decimal             @db.Decimal(12, 2) // Monto final (amount + lateFee - discount - scholarship)
  isOverdue            Boolean             @default(false) // Está vencida
  overdueSince         DateTime?           // Fecha desde la que está vencida

  allocations          PaymentAllocation[]
  lateFees             LateFee[]
  academicTerm         AcademicTerm?       @relation(fields: [academicTermId], references: [id])
  concept              ChargeConcept       @relation(fields: [conceptId], references: [id])
  student              Student             @relation(fields: [studentId], references: [id])
  user                 User?               @relation(fields: [userId], references: [id])

  @@index([studentId, status])
  @@index([periodLabel])
  @@index([academicTermId])
  @@index([dueDate])
  @@index([isOverdue])
  @@map("student_charges")
}
```

#### 2.2.2 Payment (Modificar)

```prisma
model Payment {
  id             String              @id @default(cuid())
  studentId      String
  amount         Decimal             @db.Decimal(12, 2)
  method         PaymentMethod
  reference      String?
  paidAt         DateTime            @default(now())
  notes          String?
  createdAt      DateTime            @default(now())
  userId         String?
  academicTermId String?

  // NUEVOS CAMPOS
  receiptId      String?             // Recibo asociado
  cancelledAt    DateTime?           // Fecha de anulación
  cancelledBy    String?             // userId del anulador
  cancelledReason String?            // Motivo de anulación
  isCancelled    Boolean             @default(false)

  allocations    PaymentAllocation[]
  receipt        Receipt?            @relation(fields: [receiptId], references: [id])
  academicTerm   AcademicTerm?       @relation(fields: [academicTermId], references: [id])
  student        Student             @relation(fields: [studentId], references: [id])
  user           User?               @relation(fields: [userId], references: [id])

  @@index([studentId, paidAt])
  @@index([academicTermId])
  @@index([receiptId])
  @@index([isCancelled])
  @@map("payments")
}
```

#### 2.2.3 Scholarship (Modificar)

```prisma
model Scholarship {
  id              String        @id @default(cuid())
  studentId       String
  name            String
  percentage      Decimal       @db.Decimal(5, 2) // Porcentaje de beca
  active          Boolean       @default(true)
  startDate       DateTime
  endDate         DateTime?
  userId          String?

  // NUEVOS CAMPOS
  applicableTo    String[]      // ["MATRICULA", "CUOTA_MENSUAL", "EXAMEN"]
  autoApply       Boolean       @default(true) // Aplicar automáticamente
  maxMonthlyAmount Decimal?     @db.Decimal(12, 2) // Monto máximo mensual
  appliedAmount   Decimal       @default(0) @db.Decimal(12, 2) // Monto total aplicado
  lastAppliedAt   DateTime?     // Última fecha de aplicación

  student         Student       @relation(fields: [studentId], references: [id])
  user            User?         @relation(fields: [userId], references: [id])

  @@index([studentId, active])
  @@index([active])
  @@map("scholarships")
}
```

### 2.3 Nuevos Enums

```prisma
enum ReceiptStatus {
  ISSUED
  CANCELLED
}

enum FinancialMovementType {
  CHARGE       // Generación de cuota
  PAYMENT      // Registro de pago
  ALLOCATION   // Asignación de pago a cuota
  RECEIPT      // Emisión de recibo
  CANCELLATION // Anulación de pago/recibo
  ADJUSTMENT   // Ajuste manual
  LATE_FEE     // Aplicación de recargo
  DISCOUNT     // Aplicación de descuento
  SCHOLARSHIP  // Aplicación de beca
}

enum DiscountType {
  PERCENTAGE
  FIXED
}

enum LateFeeType {
  PERCENTAGE
  FIXED
}

enum FinancialBlockType {
  ENROLLMENT    // Inscripción
  EXAM          // Mesas de examen
  COURSE        // Cursadas
  CERTIFICATE   // Constancias
  REPORT        // Reportes
  ALL           // Todo
}
```

### 2.4 Relaciones, Índices y Constraints

#### 2.4.1 Constraints Únicos

- `Receipt.receiptNumber + Receipt.receiptYear` - Evita duplicados de número de recibo por año
- `Discount.code` - Evita duplicados de código de descuento
- `FinancialConfig.key` - Evita duplicados de configuración
- `ReceiptNumber.year` - Solo una secuencia por año

#### 2.4.2 Índices Críticos

- `StudentCharge[studentId, status]` - Consultas de deuda por alumno
- `StudentCharge[dueDate]` - Consultas de vencimientos
- `StudentCharge[isOverdue]` - Consultas de mora
- `Payment[studentId, paidAt]` - Historial de pagos
- `Payment[receiptId]` - Pagos por recibo
- `Payment[isCancelled]` - Pagos anulados
- `FinancialMovement[studentId, createdAt]` - Historial financiero
- `FinancialBlock[studentId, isActive]` - Bloqueos activos
- `Receipt[receiptNumber, receiptYear]` - Búsqueda de recibo

#### 2.4.3 Reglas ON DELETE

- `ReceiptItem` - CASCADE al eliminar Receipt
- `LateFee` - CASCADE al eliminar StudentCharge
- `PaymentAllocation` - RESTRICT (no permitir eliminar Payment con allocations)
- `StudentCharge` - RESTRICT (no permitir eliminar con allocations o late fees)

### 2.5 Prevención de Duplicados

#### 2.5.1 Cuotas Duplicadas

**Estrategia:** Validar en application layer antes de crear

```typescript
const existing = await prisma.studentCharge.findFirst({
	where: {
		studentId,
		conceptId,
		periodLabel,
		status: { not: 'CANCELLED' }
	}
});
if (existing) throw new Error('Cuota duplicada');
```

#### 2.5.2 Pagos Duplicados

**Estrategia:** Validar referencia única por método

```typescript
if (method === 'BANK_TRANSFER' && reference) {
	const existing = await prisma.payment.findFirst({
		where: { method, reference, isCancelled: false }
	});
	if (existing) throw new Error('Pago duplicado');
}
```

#### 2.5.3 Recibos Duplicados

**Estrategia:** Constraint único `[receiptNumber, receiptYear]` en Prisma

#### 2.5.4 Movimientos Duplicados

**Estrategia:** Validar en application layer antes de crear FinancialMovement

### 2.6 Manejo de Pagos Parciales, Múltiples y Recibo con Varias Cuotas

#### 2.6.1 Pago Parcial

1. Crear Payment con monto parcial
2. Crear PaymentAllocation con monto parcial a cuota
3. Actualizar StudentCharge.paidAmount
4. Actualizar StudentCharge.status a PARTIAL
5. Crear FinancialMovement

#### 2.6.2 Pago Múltiple (varias cuotas)

1. Crear Payment con monto total
2. Iterar cuotas pendientes
3. Crear PaymentAllocation por cada cuota
4. Actualizar cada StudentCharge.paidAmount
5. Actualizar cada StudentCharge.status
6. Crear FinancialMovement por cada allocation

#### 2.6.3 Recibo con Varias Cuotas

1. Crear Receipt con número correlativo
2. Crear ReceiptItem por cada cuota/pago
3. Asociar múltiples Payment al Receipt
4. Calcular totalAmount sumando ReceiptItem
5. Crear FinancialMovement de tipo RECEIPT

---

## 3. Recibo Institucional

### 3.1 Diseño del Recibo

El recibo seguirá el formato estándar del Instituto ISFD "PAULO FREIRE" 1117 con:

- Encabezado institucional (nombre, tipo, CUIT, domicilio, condición IVA)
- Número correlativo (ej: 0001-2026)
- Fecha de emisión
- Datos del pagador (nombre, DNI, dirección)
- Tabla de detalle (concepto, período, base, recargo, descuento, total)
- Totales (subtotal, total)
- Forma de pago y referencia
- Emisor y observaciones
- Firma y sello
- Indicador original/copia

### 3.2 Campos del Recibo

| Campo              | Tipo               | Fuente                   |
| ------------------ | ------------------ | ------------------------ |
| Número correlativo | Int                | ReceiptNumber            |
| Fecha              | DateTime           | Receipt.issuedAt         |
| Institución nombre | String             | Configuración            |
| CUIT               | String             | Configuración            |
| Domicilio          | String             | Configuración            |
| Condición IVA      | String             | Configuración            |
| Pagador nombre     | String             | Receipt.studentName      |
| Pagador DNI        | String             | Receipt.studentDni       |
| Pagador dirección  | String             | Receipt.studentAddress   |
| Conceptos          | Array[ReceiptItem] | ReceiptItem[]            |
| Forma de pago      | Enum               | Receipt.paymentMethod    |
| Referencia         | String             | Receipt.paymentReference |
| Emisor             | String             | Receipt.issuedByName     |
| Observaciones      | String             | Receipt.observations     |
| Estado             | Enum               | Receipt.status           |

### 3.3 Generación de Número Correlativo

**Estrategia:** Modelo `ReceiptNumber` con secuencia por año

```typescript
async function getNextReceiptNumber(year: number): Promise<number> {
	const seq = await prisma.receiptNumber.upsert({
		where: { year },
		create: { year, lastNumber: 0 },
		update: { lastNumber: { increment: 1 } }
	});
	return seq.lastNumber + 1;
}
```

**Prevención de duplicados:** Constraint único `[receiptNumber, receiptYear]` en Prisma

### 3.4 Asociación del Recibo a Pagos

Relación uno-a-muchos Payment → Receipt. Un recibo puede agrupar múltiples pagos.

### 3.5 Reimpresión

Incrementar contador `printCount` y generar PDF con marca "REIMPRESIÓN".

### 3.6 Anulación sin Borrar Historial

Soft delete con campos `cancelledAt`, `cancelledBy`, `cancelledReason`. Revertir allocations y actualizar cuotas.

### 3.7 Exportación/Impresión en PDF

**Estrategia:** Usar **PDFKit** (librería Node.js para generación de PDF)

**Razones:**

- Generación server-side (no depende del navegador)
- Control total sobre el diseño
- Soporte para fuentes, imágenes, tablas
- Integración fácil con SvelteKit

---

## 4. Generación de Cuotas

### 4.1 Generación Individual

1. Validar duplicado (alumno, concepto, período)
2. Obtener concepto
3. Calcular monto base
4. Aplicar beca si corresponde
5. Aplicar descuentos configurados
6. Crear cuota con montos calculados
7. Crear FinancialMovement
8. Auditoría

### 4.2 Generación Masiva

Iterar sobre lista de alumnos y llamar a generación individual. Manejar errores por alumno.

### 4.3 Prevención de Duplicados

Validar antes de crear: `studentId + conceptId + periodLabel + status != CANCELLED`

### 4.4 Regeneración de Cuotas

NO permitir regeneración directa. Anular cuota existente (status CANCELLED) y generar nueva.

### 4.5 Aplicación de Becas, Descuentos y Recargos

**Orden de aplicación:**

1. Monto base del concepto
2. Aplicar beca (porcentaje)
3. Aplicar descuentos configurados (por prioridad)
4. Calcular recargos por mora (si está vencida)
5. Monto final = base - beca - descuento + recargo

### 4.6 Auditoría de Generación y Regeneración

Auditar CREATE (generación) y UPDATE (anulación a CANCELLED). Metadata con montos calculados.

---

## 5. Registro de Pagos

### 5.1 Flujo Completo de Registro de Pago

1. Validar monto > 0
2. Validar duplicado (para transferencias)
3. Obtener cuotas pendientes (ordenadas por vencimiento)
4. Crear Payment
5. Asignar pago a cuotas (FIFO)
6. Actualizar cuotas (paidAmount, status)
7. Crear FinancialMovement por cada allocation
8. Crear FinancialMovement del pago
9. Auditoría

### 5.2 Pagos Parciales y Totales

Pago parcial: remaining > 0 después de asignar
Pago total: remaining === 0 después de asignar

### 5.3 Asignación Automática vs Manual

Por defecto: Automática (FIFO por fecha de vencimiento)
Manual: Usuario selecciona a qué cuotas aplicar

### 5.4 Validaciones de Monto

- Monto > 0
- Monto de allocation no exceder pendiente de cuota

### 5.5 Comprobantes Externos

Almacenar referencia del comprobante (número de operación, últimos 4 dígitos, código QR)

### 5.6 Prevención de Pagos Duplicados

Validar referencia única por método (especialmente para transferencias)

### 5.7 Anulación de Pagos y Reversión de Allocations

1. Obtener pago con allocations
2. Revertir allocations (decrementar paidAmount de cuotas)
3. Eliminar allocations
4. Marcar pago como cancelado
5. Crear FinancialMovement de anulación
6. Auditoría

### 5.8 Auditoría con Valores Anteriores y Nuevos

Metadata en FinancialMovement con oldValue y newValue de paidAmount y status.

---

## 6. Control de Deuda

### 6.1 Cálculo de Deuda

**Deuda total:** Suma de `finalAmount - paidAmount` de cuotas PENDING y PARTIAL
**Deuda vencida:** Suma de cuotas con `dueDate < now()` y `status != PAID`
**Saldo pendiente:** Deuda total - pagos no asignados

### 6.2 Cálculo en Tiempo Real vs Registro en Movimientos

**Estrategia:** Cálculo en tiempo real + registro en FinancialMovement

### 6.3 Actualización de Estados de Cuotas

Reglas: pending <= 0 → PAID, paidAmount > 0 → PARTIAL, else → PENDING

### 6.4 Manejo de Recargos por Mora

Job nocturno que recorre cuotas vencidas, calcula días de mora y aplica recargos según configuración.

### 6.5 Aplicación de Becas y Descuentos

Se aplican en generación de cuota (ver sección 4.5)

### 6.6 Validación de Consistencia

Validar periódicamente que:

- sum(allocations) = sum(payments)
- paidAmount = sum(allocations) por cuota

---

## 7. Bloqueos Automáticos por Deuda

### 7.1 Acciones Bloqueadas por Deuda

- Inscripción: Sí
- Mesas de examen: Sí
- Cursadas: Sí
- Constancias: Sí
- Reportes: No
- Ver notas: No

### 7.2 Reglas Configurables

Configuración en FinancialConfig:

- blockOnAnyDebt: Bloquear con cualquier deuda
- blockOnOverdueDebt: Bloquear solo con deuda vencida
- minDebtAmount: Bloquear a partir de este monto
- minOverdueCharges: Bloquear a partir de esta cantidad de cuotas vencidas
- graceDays: Días de gracia
- blockTypes: Qué acciones bloquear

### 7.3 Excepciones Manuales Autorizadas

Actualizar FinancialBlock con exceptionGranted=true, exceptionBy, exceptionAt, exceptionReason.

### 7.4 Auditoría de Bloqueos, Desbloqueos y Excepciones

Auditar CREATE (bloqueo), UPDATE (desbloqueo/excepción). Metadata con debtAmount, overdueDays, blockType.

### 7.5 Servicios Backend de Validación

Función `checkFinancialBlock(studentId, action)` que verifica:

- Bloqueo activo con excepción no otorgada
- Reglas de configuración (deuda total, deuda vencida, monto mínimo, cuotas vencidas)

Uso en inscripciones, mesas de examen, cursadas, constancias.

---

## 8. Estados Financieros y Reportes

### 8.1 Panel Financiero

Métricas: studentsWithDebt, totalDebt, overdueDebt, paymentsCount, totalCollected, pendingCharges, overdueCharges, activeScholarships, receiptsIssued, receiptsCancelled.

### 8.2 Reportes por Alumno

Historial financiero unificado desde FinancialMovement ordenado por fecha.

### 8.3 Reportes por Carrera, Comisión, Período, Concepto, Localidad

Filtros en FinancialReportFilters. Consultas con joins a Student, Career, Location.

### 8.4 Exportación PDF/Excel

PDF: PDFKit
Excel: library `exceljs`

### 8.5 Reportes de Deuda y Cobranza

Reporte de morosidad con: alumno, DNI, carrera, email, concepto, período, monto, pagado, pendiente, vencimiento, días de mora.

---

## 9. Servicio de Dominio

### 9.1 FinancialService

**Ubicación:** `src/lib/server/financial/financial-service.ts`

**Métodos principales:**

- generateCharge, generateBulkCharges, cancelCharge
- registerPayment, cancelPayment, allocatePaymentManually
- issueReceipt, cancelReceipt, reprintReceipt
- calculateDebt, applyLateFees
- checkFinancialBlock, createFinancialBlock, removeFinancialBlock, grantBlockException
- createScholarship, updateScholarship, createDiscount
- updateConfig, getConfig
- getFinancialMetrics, getStudentFinancialHistory, getDelinquencyReport
- validateFinancialConsistency

### 9.2 Delegación desde Routes/Actions

Las routes/actions solo deben:

- Parsear FormData
- Validar formato básico
- Verificar autenticación (locals.user)
- Llamar a FinancialService
- Retornar respuesta UI

Toda la lógica de negocio está en FinancialService.

---

## 10. Permisos y Seguridad

### 10.1 Permisos Granulares

Nuevos permisos:

- FINANCE_VIEW, FINANCE_VIEW_OWN
- CHARGE_CREATE, CHARGE_EDIT, CHARGE_DELETE, CHARGE_VIEW
- PAYMENT_CREATE, PAYMENT_CANCEL, PAYMENT_VIEW
- RECEIPT_ISSUE, RECEIPT_CANCEL, RECEIPT_VIEW, RECEIPT_PRINT
- SCHOLARSHIP_MANAGE, DISCOUNT_MANAGE
- FINANCE_CONFIG, FINANCE_REPORTS
- BLOCK_MANAGE, BLOCK_EXCEPTION

### 10.2 Roles Autorizados

| Rol        | Permisos                                           |
| ---------- | -------------------------------------------------- |
| SUPERADMIN | Todos                                              |
| DIRECTOR   | Todos excepto configuración técnica                |
| SECRETARIA | Ver, registrar pagos, emitir recibos, ver reportes |
| FINANZAS   | Todos los financieros                              |
| ALUMNO     | FINANCE_VIEW_OWN, RECEIPT_VIEW (propios)           |
| DOCENTE    | Ninguno                                            |
| PRECEPTOR  | Ninguno                                            |

### 10.3 Validación de Acceso Propio

Para alumnos: verificar que student.userId === user.id antes de permitir acceso a finanzas propias.

---

## 11. Auditoría

### 11.1 Operaciones Financieras Auditables

Todas las operaciones críticas:

- Generación/anulación de cuotas
- Registro/anulación de pagos
- Emisión/anulación de recibos
- Becas, descuentos, recargos
- Configuración
- Bloqueos, desbloqueos, excepciones

### 11.2 Metadata con Valores Anteriores y Nuevos

Usar metadata con oldValue y newValue para operaciones de actualización/anulación.

### 11.3 Pruebas de Auditoría

Script de prueba que verifica registros reales en AuditLog después de cada operación financiera.

---

## 12. Migraciones

### 12.1 Migración Incremental Requerida

**SÍ, se requiere nueva migración.**

**Nombre propuesto:** `20260614_add_financial_receipts_and_blocks`

### 12.2 Prueba de Migración en Base Temporal

1. Crear base temporal vacía
2. Configurar DATABASE_URL temporal
3. Ejecutar `prisma migrate deploy`
4. Verificar schema con `prisma db pull`
5. Eliminar base temporal

### 12.3 Confirmación de Estrategia

- NO usar `db push`
- NO usar `migrate reset`
- Preservar datos existentes de StudentCharge, Payment, PaymentAllocation
- Migración incremental con SQL de migración

### 12.4 Preservación de Datos Existentes

Los datos existentes de StudentCharge, Payment y PaymentAllocation se preservan automáticamente porque:

- Solo se agregan nuevos campos con valores por defecto
- No se eliminan ni renombran campos existentes
- No se cambian tipos de datos existentes

---

## 13. Plan de Implementación por Fases

### Fase 1: Schema y Servicio de Dominio

**Objetivo:** Crear estructura de datos y servicio centralizado

**Archivos a crear:**

- `prisma/schema.prisma` - Agregar nuevos modelos y modificar existentes
- `prisma/migrations/20260614_add_financial_receipts_and_blocks/migration.sql` - Nueva migración
- `src/lib/server/financial/financial-service.ts` - FinancialService base

**Archivos a modificar:**

- `prisma/schema.prisma` - Agregar modelos y enums

**Riesgos:**

- Error en migración puede dejar base inconsistente
- Validar en base temporal antes de aplicar a producción

**Pruebas:**

- `prisma migrate deploy` en base temporal
- Verificar que todos los modelos se crean correctamente
- Verificar que los índices se crean correctamente
- Verificar que los constraints se crean correctamente

**Criterios de cierre:**

- Migración aplicada exitosamente en base temporal
- Schema validado con `prisma validate`
- FinancialService creado con estructura de métodos
- Prisma Client regenerado con `prisma generate`

---

### Fase 2: Generación de Cuotas

**Objetivo:** Implementar generación individual y masiva de cuotas

**Archivos a crear:**

- `src/routes/(app)/finanzas/cuotas/generar/+page.server.ts`
- `src/routes/(app)/finanzas/cuotas/generar/+page.svelte`
- `src/routes/(app)/finanzas/cuotas/[id]/anular/+page.server.ts`
- `src/routes/(app)/finanzas/cuotas/[id]/anular/+page.svelte`

**Archivos a modificar:**

- `src/lib/server/financial/financial-service.ts` - Implementar generateCharge, generateBulkCharges, cancelCharge
- `src/lib/server/audit.ts` - Extender para auditoría de cuotas

**Riesgos:**

- Generación de cuotas duplicadas
- Cálculo incorrecto de becas/descuentos
- Validar prevención de duplicados

**Pruebas:**

- Script de prueba de cuotas duplicadas
- Script de prueba de aplicación de becas
- Script de prueba de aplicación de descuentos
- Script de prueba de anulación de cuotas

**Criterios de cierre:**

- Generación individual funciona sin duplicados
- Generación masiva funciona sin errores
- Becas se aplican correctamente
- Descuentos se aplican correctamente
- Anulación funciona y actualiza estados
- Auditoría registra todas las operaciones

---

### Fase 3: Pagos y Anulación

**Objetivo:** Implementar registro de pagos y anulación con reversión

**Archivos a crear:**

- `src/routes/(app)/finanzas/pagos/[id]/anular/+page.server.ts`
- `src/routes/(app)/finanzas/pagos/[id]/anular/+page.svelte`

**Archivos a modificar:**

- `src/routes/(app)/finanzas/pagos/nuevo/+page.server.ts` - Migrar a FinancialService
- `src/lib/server/financial/financial-service.ts` - Implementar registerPayment, cancelPayment, allocatePaymentManually

**Riesgos:**

- Pagos duplicados no detectados
- Reversión incorrecta de allocations
- Validar consistencia después de anulación

**Pruebas:**

- Script de prueba de pago parcial
- Script de prueba de pago total
- Script de prueba de pago mayor al saldo
- Script de prueba de anulación de pago
- Script de prueba de consistencia de allocations

**Criterios de cierre:**

- Registro de pagos funciona
- Asignación automática FIFO funciona
- Asignación manual funciona
- Anulación revierte allocations correctamente
- Estados de cuotas se actualizan correctamente
- Auditoría registra todas las operaciones

---

### Fase 4: Recibos Institucionales

**Objetivo:** Implementar generación, anulación e impresión de recibos

**Archivos a crear:**

- `src/lib/server/financial/receipt-pdf-generator.ts` - Generador de PDF con PDFKit
- `src/routes/(app)/finanzas/recibos/emitir/+page.server.ts`
- `src/routes/(app)/finanzas/recibos/emitir/+page.svelte`
- `src/routes/(app)/finanzas/recibos/[id]/ver/+page.server.ts`
- `src/routes/(app)/finanzas/recibos/[id]/ver/+page.svelte`
- `src/routes/(app)/finanzas/recibos/[id]/anular/+page.server.ts`
- `src/routes/(app)/finanzas/recibos/[id]/imprimir/+server.ts`

**Archivos a modificar:**

- `src/lib/server/financial/financial-service.ts` - Implementar issueReceipt, cancelReceipt, reprintReceipt
- `src/lib/server/audit.ts` - Extender para auditoría de recibos

**Riesgos:**

- Duplicados de números de recibo
- Generación de PDF falla
- Validar secuencia de números

**Pruebas:**

- Script de prueba de emisión de recibo
- Script de prueba de duplicados de número
- Script de prueba de anulación de recibo
- Script de prueba de reimpresión
- Script de prueba de generación de PDF

**Criterios de cierre:**

- Emisión de recibo genera número correlativo único
- PDF se genera correctamente
- Recibo agrupa múltiples pagos
- Anulación funciona y revierte pagos
- Reimpresión incrementa contador
- Auditoría registra todas las operaciones

---

### Fase 5: Deuda y Bloqueos

**Objetivo:** Implementar cálculo de deuda y bloqueos automáticos

**Archivos a crear:**

- `src/lib/server/financial/debt-calculator.ts` - Calculadora de deuda
- `src/lib/server/financial/block-validator.ts` - Validador de bloqueos
- `src/lib/server/financial/late-fee-job.ts` - Job de recargos por mora

**Archivos a modificar:**

- `src/lib/server/financial/financial-service.ts` - Implementar calculateDebt, applyLateFees, checkFinancialBlock, createFinancialBlock, removeFinancialBlock, grantBlockException
- `src/lib/server/auth/financial-access.ts` - Agregar validaciones de bloqueo
- `src/routes/(app)/inscripciones/+page.server.ts` - Agregar validación de bloqueo
- `src/routes/(app)/mesas/+page.server.ts` - Agregar validación de bloqueo

**Riesgos:**

- Cálculo incorrecto de deuda
- Bloqueos no se aplican correctamente
- Validar en inscripciones y mesas

**Pruebas:**

- Script de prueba de cálculo de deuda
- Script de prueba de deuda vencida
- Script de prueba de bloqueo por deuda
- Script de prueba de excepción autorizada
- Script de prueba de aplicación de recargos

**Criterios de cierre:**

- Cálculo de deuda es correcto
- Bloqueos se aplican en inscripciones
- Bloqueos se aplican en mesas de examen
- Excepciones funcionan correctamente
- Recargos por mora se aplican
- Auditoría registra bloqueos y excepciones

---

### Fase 6: Reportes y Estados Financieros

**Objetivo:** Implementar panel financiero y reportes

**Archivos a crear:**

- `src/routes/(app)/finanzas/reportes/+page.server.ts`
- `src/routes/(app)/finanzas/reportes/+page.svelte`
- `src/routes/(app)/finanzas/reportes/deuda/+page.server.ts`
- `src/routes/(app)/finanzas/reportes/deuda/+page.svelte`
- `src/routes/(app)/finanzas/reportes/cobranza/+page.server.ts`
- `src/routes/(app)/finanzas/reportes/cobranza/+page.svelte`
- `src/routes/(app)/finanzas/reportes/export.xlsx/+server.ts`
- `src/routes/(app)/finanzas/reportes/export.pdf/+server.ts`

**Archivos a modificar:**

- `src/lib/server/financial/financial-service.ts` - Implementar getFinancialMetrics, getStudentFinancialHistory, getDelinquencyReport
- `src/routes/(app)/finanzas/+page.server.ts` - Migrar a FinancialService
- `src/routes/(app)/reportes/financiero/+page.server.ts` - Migrar a FinancialService

**Riesgos:**

- Reportes lentos por falta de índices
- Exportación falla
- Validar performance de consultas

**Pruebas:**

- Script de prueba de panel financiero
- Script de prueba de reporte de deuda
- Script de prueba de reporte de cobranza
- Script de prueba de exportación Excel
- Script de prueba de exportación PDF

**Criterios de cierre:**

- Panel financiero muestra métricas correctas
- Reportes de deuda funcionan con filtros
- Reportes de cobranza funcionan con filtros
- Exportación Excel funciona
- Exportación PDF funciona
- Performance aceptable

---

### Fase 7: Pruebas, Auditoría y Documentación

**Objetivo:** Validar completa funcionalidad y documentar

**Archivos a crear:**

- `scripts/test-financial-module.ts` - Script de pruebas funcionales
- `scripts/test-financial-audit.ts` - Script de pruebas de auditoría
- `docs/FINANCIAL_MODULE_CHANGELOG.md` - Changelog del módulo
- `docs/FINANCIAL_MODULE_MIGRATION_STRATEGY.md` - Estrategia de migración

**Archivos a modificar:**

- `src/lib/server/financial/financial-service.ts` - Validar todos los métodos
- `src/lib/server/audit.ts` - Validar auditoría completa

**Riesgos:**

- Pruebas no cubren todos los casos
- Auditoría incompleta
- Validar cobertura de pruebas

**Pruebas:**

- Ejecutar script de pruebas funcionales
- Ejecutar script de pruebas de auditoría
- Validar migración desde cero
- Validar consistencia de datos

**Criterios de cierre:**

- Todas las pruebas funcionales pasan
- Todas las pruebas de auditoría pasan
- Migración desde cero funciona
- Consistencia de datos validada
- Documentación completa
- Changelog actualizado

---

## 14. Pruebas

### 14.1 Script de Prueba Funcional

**Ubicación:** `scripts/test-financial-module.ts`

**Casos de prueba:**

1. Cuotas duplicadas - Intentar generar cuota duplicada, debe fallar
2. Pago parcial - Registrar pago menor al saldo, verificar estado PARTIAL
3. Pago total - Registrar pago igual al saldo, verificar estado PAID
4. Pago mayor al saldo - Registrar pago mayor, verificar que se acepta (a cuenta)
5. Anulación de pago - Anular pago, verificar reversión de allocations
6. Emisión de recibo - Emitir recibo, verificar número correlativo
7. Anulación de recibo - Anular recibo, verificar reversión de pagos
8. Deuda vencida - Verificar cálculo de deuda vencida
9. Bloqueo por deuda - Verificar que alumno con deuda no puede inscribirse
10. Excepción autorizada - Otorgar excepción, verificar que alumno puede inscribirse
11. Auditoría real - Verificar registros en AuditLog después de cada operación
12. Migración desde cero - Ejecutar migración en base vacía, verificar schema

### 14.2 Script de Prueba de Auditoría

**Ubicación:** `scripts/test-financial-audit.ts`

**Casos de prueba:**

1. Generación de cuota - Verificar registro CREATE en AuditLog
2. Anulación de cuota - Verificar registro UPDATE en AuditLog con metadata
3. Registro de pago - Verificar registro CREATE en AuditLog
4. Anulación de pago - Verificar registro DELETE en AuditLog con metadata
5. Emisión de recibo - Verificar registro CREATE en AuditLog
6. Anulación de recibo - Verificar registro UPDATE en AuditLog con metadata
7. Bloqueo - Verificar registro CREATE en AuditLog
8. Excepción - Verificar registro UPDATE en AuditLog con metadata

---

## 15. Riesgos

### 15.1 Riesgos Técnicos

| Riesgo                         | Probabilidad | Impacto | Mitigación                                                   |
| ------------------------------ | ------------ | ------- | ------------------------------------------------------------ |
| Error en migración             | Media        | Alto    | Probar en base temporal antes de producción                  |
| Duplicados de número de recibo | Baja         | Alto    | Constraint único en Prisma + validación en application layer |
| Inconsistencia de datos        | Media        | Alto    | Validación periódica de consistencia                         |
| Performance de reportes        | Media        | Medio   | Optimizar índices, usar paginación                           |
| Falla en generación de PDF     | Baja         | Medio   | Validar generación en pruebas                                |

### 15.2 Riesgos Operativos

| Riesgo                    | Probabilidad | Impacto | Mitigación                              |
| ------------------------- | ------------ | ------- | --------------------------------------- |
| Error en cálculo de deuda | Baja         | Alto    | Validar cálculo en pruebas              |
| Bloqueos incorrectos      | Baja         | Alto    | Validar reglas de configuración         |
| Anulación incorrecta      | Media        | Medio   | Validar reversión en pruebas            |
| Auditoría incompleta      | Baja         | Medio   | Validar todas las operaciones auditadas |

### 15.3 Riesgos de Negocio

| Riesgo                         | Probabilidad | Impacto | Mitigación                                  |
| ------------------------------ | ------------ | ------- | ------------------------------------------- |
| Rechazo de recibos por AFIP    | Baja         | Alto    | Consultar con contador antes de implementar |
| Quejas por bloqueos            | Media        | Medio   | Configurar días de gracia y excepciones     |
| Errores en cálculo de recargos | Baja         | Medio   | Validar fórmulas con contador               |

---

## 16. Recomendación Final

**Recomendación:** Aprobar el diseño técnico propuesto y proceder con la Fase 1.

**Justificación:**

- El diseño es completo y cubre todos los requisitos
- La arquitectura es robusta y sigue patrones establecidos
- Los riesgos están identificados y mitigados
- El plan por fases permite validación incremental
- La estrategia de migración es segura (prueba en base temporal)

**Próximos pasos:**

1. Aprobar el diseño técnico
2. Iniciar Fase 1: Schema y Servicio de Dominio
3. Validar migración en base temporal
4. Proceder con fases siguientes según criterios de cierre

**Estimación de tiempo total:** 2-3 semanas de desarrollo full-time para completar todas las fases.

**Estimación por fase:**

- Fase 1: 2-3 días
- Fase 2: 2-3 días
- Fase 3: 2-3 días
- Fase 4: 3-4 días
- Fase 5: 3-4 días
- Fase 6: 2-3 días
- Fase 7: 2-3 días
