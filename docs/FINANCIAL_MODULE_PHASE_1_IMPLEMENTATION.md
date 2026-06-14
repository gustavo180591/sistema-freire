# Módulo de Sistema Financiero - Fase 1: Schema y Servicio de Dominio

**Fecha:** 14 de junio de 2026  
**Estado:** Completado  
**Migración:** `20260614_add_financial_receipts_blocks_and_movements`

## Resumen Ejecutivo

La Fase 1 del Módulo de Sistema Financiero establece la base técnica sólida para todas las operaciones financieras. Esta fase incluye:

- Schema Prisma con constraints únicos para prevención de duplicados en base de datos
- 8 nuevos modelos financieros con relaciones y reglas ON DELETE apropiadas
- 5 nuevos enums para tipificación de operaciones financieras
- Modificaciones no destructivas a modelos existentes (StudentCharge, Payment, Scholarship)
- Estrategia de numeración de recibos transaccional y segura contra concurrencia
- FinancialService inicial con métodos bien tipados
- Helpers de cálculo decimal para precisión financiera
- Migración incremental formal

## Inspección de Tablas Financieras Existentes

Antes de iniciar la implementación, se inspeccionó el estado actual de las tablas financieras:

| Tabla | Registros | Estado |
|-------|-----------|--------|
| StudentCharge | 0 | ✅ Vacía |
| Payment | 0 | ✅ Vacía |
| PaymentAllocation | 0 | ✅ Vacía |
| ChargeConcept | 0 | ✅ Vacía |
| Scholarship | 0 | ✅ Vacía |

**Conclusión:** No hay datos financieros existentes. Schema limpio para migración segura.

## Cambios en Schema Prisma

### 1. Enums Agregados

#### ReceiptStatus
- `ISSUED`: Recibo emitido y válido
- `CANCELLED`: Recibo anulado

#### FinancialMovementType
- `CHARGE`: Creación de cuota
- `PAYMENT`: Registro de pago
- `ALLOCATION`: Asignación de pago a cuota
- `RECEIPT`: Emisión de recibo
- `CANCELLATION`: Anulación (pago, recibo, cuota)
- `ADJUSTMENT`: Ajuste manual
- `LATE_FEE`: Recargo por mora
- `DISCOUNT`: Aplicación de descuento
- `SCHOLARSHIP`: Aplicación de beca

#### DiscountType
- `PERCENTAGE`: Descuento porcentual
- `FIXED`: Descuento fijo

#### LateFeeType
- `PERCENTAGE`: Recargo porcentual
- `FIXED`: Recargo fijo

#### FinancialBlockType
- `ENROLLMENT`: Bloqueo de inscripción
- `EXAM`: Bloqueo de mesas de examen
- `COURSE`: Bloqueo de cursadas
- `CERTIFICATE`: Bloqueo de constancias
- `REPORT`: Bloqueo de reportes
- `ALL`: Bloqueo total

### 2. Modelos Modificados (No Destructivos)

#### StudentCharge
**Campos agregados:**
- `lateFeeApplied`: Decimal(12,2) - Recargo por mora aplicado
- `discountApplied`: Decimal(12,2) - Descuento aplicado
- `scholarshipApplied`: Decimal(12,2) - Beca aplicada
- `finalAmount`: Decimal(12,2) - Monto final después de ajustes
- `isOverdue`: Boolean - Indica si está vencida
- `overdueSince`: DateTime - Fecha desde la que está vencida

**Constraints agregados:**
- `@@unique([studentId, conceptId, periodLabel, academicTermId])` - Previene cuotas duplicadas por alumno+concepto+período+ciclo

**Índices agregados:**
- `@@index([dueDate])` - Para consultas de vencimientos
- `@@index([isOverdue])` - Para consultas de cuotas vencidas

**Relaciones agregadas:**
- `lateFees: LateFee[]` - Recargos asociados

#### Payment
**Campos agregados:**
- `receiptId`: String - Referencia al recibo generado
- `cancelledAt`: DateTime - Fecha de anulación
- `cancelledBy`: String - Usuario que anuló
- `cancelledReason`: String - Motivo de anulación
- `isCancelled`: Boolean - Indica si está anulado

**Constraints agregados:**
- `@@unique([method, reference], name: "payment_method_reference_unique")` - Previene referencias duplicadas por método

**Índices agregados:**
- `@@index([receiptId])` - Para consultas por recibo
- `@@index([isCancelled])` - Para filtrar pagos anulados

**Relaciones agregadas:**
- `receipt: Receipt?` - Recibo asociado

#### Scholarship
**Campos agregados:**
- `applicableTo`: String[] - Lista de conceptos aplicables
- `autoApply`: Boolean - Aplicación automática
- `maxMonthlyAmount`: Decimal(12,2) - Monto máximo mensual
- `appliedAmount`: Decimal(12,2) - Monto total aplicado
- `lastAppliedAt`: DateTime - Última aplicación

### 3. Modelos Nuevos

#### Receipt
**Propósito:** Entidad financiera real de recibo institucional (no solo PDF)

**Campos principales:**
- `receiptNumber`: Int - Número correlativo
- `receiptYear`: Int - Año del recibo
- `studentId`, `studentName`, `studentDni`, `studentAddress` - Datos del alumno
- `totalAmount`: Decimal(12,2) - Monto total
- `paymentMethod`: PaymentMethod - Forma de pago
- `paymentReference`: String - Referencia externa
- `issuedAt`, `issuedBy`, `issuedByName` - Datos de emisión
- `status`: ReceiptStatus - Estado (ISSUED/CANCELLED)
- `cancelledAt`, `cancelledBy`, `cancelledReason` - Datos de anulación
- `printCount`: Int - Contador de reimpresiones
- `originalCopy`: Boolean - Indica si es copia original

**Constraints:**
- `@@unique([receiptNumber, receiptYear])` - Unicidad por año

**Índices:**
- `@@index([studentId])` - Por alumno
- `@@index([status])` - Por estado

**Relaciones:**
- `items: ReceiptItem[]` - Ítems del recibo
- `payments: Payment[]` - Pagos asociados

#### ReceiptItem
**Propósito:** Ítems individuales de un recibo

**Campos:**
- `receiptId`: String - Referencia al recibo
- `chargeId`: String? - Referencia a la cuota (opcional)
- `concept`: String - Concepto del ítem
- `periodLabel`: String? - Período
- `baseAmount`: Decimal(12,2) - Monto base
- `lateFeeAmount`: Decimal(12,2) - Recargo
- `discountAmount`: Decimal(12,2) - Descuento
- `finalAmount`: Decimal(12,2) - Monto final

**Relaciones:**
- `receipt: Receipt` - Recibo padre (onDelete: Cascade)

#### FinancialMovement
**Propósito:** Historial financiero append-only (no se borran movimientos)

**Campos:**
- `studentId`: String - Alumno
- `movementType`: FinancialMovementType - Tipo de movimiento
- `entityType`: String - Tipo de entidad (Charge, Payment, etc.)
- `entityId`: String - ID de la entidad
- `description`: String - Descripción
- `amount`: Decimal(12,2) - Monto del movimiento
- `balanceBefore`: Decimal(12,2) - Saldo antes
- `balanceAfter`: Decimal(12,2) - Saldo después
- `metadata`: Json - Metadatos adicionales
- `userId`: String - Usuario que realizó la operación
- `createdAt`: DateTime - Fecha del movimiento

**Índices:**
- `@@index([studentId, createdAt])` - Historial por alumno
- `@@index([movementType])` - Por tipo
- `@@index([entityType, entityId])` - Por entidad

#### Discount
**Propósito:** Configuración de descuentos

**Campos:**
- `code`: String - Código único
- `name`: String - Nombre
- `description`: String? - Descripción
- `discountType`: DiscountType - Tipo (PERCENTAGE/FIXED)
- `value`: Decimal(12,2) - Valor del descuento
- `applicableTo`: String[] - Conceptos aplicables
- `minAmount`: Decimal(12,2)? - Monto mínimo
- `maxAmount`: Decimal(12,2)? - Monto máximo
- `validFrom`: DateTime - Vigencia desde
- `validUntil`: DateTime? - Vigencia hasta
- `active`: Boolean - Activo
- `priority`: Int - Prioridad de aplicación

**Constraints:**
- `@@unique([code])` - Código único

**Índices:**
- `@@index([active])` - Descuentos activos
- `@@index([validFrom, validUntil])` - Por vigencia

#### LateFee
**Propósito:** Registro de recargos por mora

**Campos:**
- `chargeId`: String - Cuota asociada
- `chargeAmount`: Decimal(12,2) - Monto de la cuota
- `daysOverdue`: Int - Días de vencimiento
- `feeType`: LateFeeType - Tipo (PERCENTAGE/FIXED)
- `feeValue`: Decimal(12,2) - Valor del recargo
- `calculatedAmount`: Decimal(12,2) - Monto calculado
- `appliedAt`: DateTime - Fecha de aplicación
- `appliedBy`: String - Usuario que aplicó
- `isAutomatic`: Boolean - Si fue automático

**Relaciones:**
- `charge: StudentCharge` - Cuota padre (onDelete: Cascade)

**Índices:**
- `@@index([chargeId])` - Por cuota
- `@@index([appliedAt])` - Por fecha

#### FinancialBlock
**Propósito:** Bloqueos financieros por deuda

**Campos:**
- `studentId`: String - Alumno bloqueado
- `blockType`: FinancialBlockType - Tipo de bloqueo
- `blockReason`: String - Motivo
- `blockedAt`: DateTime - Fecha de bloqueo
- `blockedBy`, `blockedByName` - Usuario que bloqueó
- `debtAmount`: Decimal(12,2) - Monto de deuda
- `overdueDays`: Int? - Días de vencimiento
- `exceptionGranted`: Boolean - Excepción otorgada
- `exceptionBy`, `exceptionAt`, `exceptionReason` - Datos de excepción
- `unblockedAt`, `unblockedBy` - Datos de desbloqueo
- `isActive`: Boolean - Si está activo

**Constraints:**
- `@@unique([studentId, blockType, isActive])` - Un bloqueo activo por tipo

**Índices:**
- `@@index([studentId, isActive])` - Por alumno y estado
- `@@index([blockType])` - Por tipo
- `@@index([isActive])` - Por estado

#### FinancialConfig
**Propósito:** Configuración financiera (reglas de bloqueo, mora, etc.)

**Campos:**
- `key`: String - Clave única
- `value`: Json - Valor (JSON flexible)
- `description`: String? - Descripción
- `category`: String - Categoría
- `updatedAt`: DateTime - Última actualización
- `updatedBy`: String - Usuario que actualizó

**Constraints:**
- `@@unique([key])` - Clave única

**Índices:**
- `@@index([category])` - Por categoría

#### ReceiptNumber
**Propósito:** Numeración de recibos transaccional y segura contra concurrencia

**Campos:**
- `year`: Int - Año
- `lastNumber`: Int - Último número usado
- `updatedAt`: DateTime - Última actualización

**Constraints:**
- `@@unique([year])` - Un registro por año

**Estrategia de numeración:**
1. En una transacción, hacer `SELECT ... FOR UPDATE` sobre el registro del año
2. Incrementar `lastNumber`
3. Usar el nuevo número para el recibo
4. Commit de la transacción

Esto garantiza que no haya números duplicados incluso bajo alta concurrencia.

### 4. Reglas ON DELETE

| Relación | ON DELETE | Justificación |
|----------|-----------|---------------|
| PaymentAllocation → StudentCharge | Restrict | Evitar borrar cuotas con pagos asignados |
| PaymentAllocation → Payment | Restrict | Evitar borrar pagos con asignaciones |
| ReceiptItem → Receipt | Cascade | Borrar ítems al borrar recibo |
| LateFee → StudentCharge | Cascade | Borrar recargos al borrar cuota |
| Payments → Receipt | Set Null | Permitir borrar recibo sin borrar pagos |

### 5. Estrategia Decimal

**Todos los montos financieros usan `Decimal` con precisión `(12, 2)`:**
- 12 dígitos totales (hasta 999,999,999.99)
- 2 decimales (centavos)

**Tipos que usan Decimal:**
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

**Helpers de cálculo decimal:**
- `add`, `subtract`, `multiply`, `divide`
- `percentage`, `applyPercentageDiscount`, `applyFixedDiscount`
- `calculatePercentageLateFee`, `calculateFixedLateFee`
- `roundToTwoDecimals`
- Comparaciones: `isGreaterThan`, `isLessThan`, `isEqual`, `isZero`, `isPositive`, `isNegative`
- Conversiones: `fromNumber`, `fromString`, `toNumber`, `toString`
- Agregaciones: `sum`, `average`
- Formateo: `formatCurrency`
- Fechas: `daysBetween`, `isOverdue`, `overdueDays`

## FinancialService

**Ubicación:** `src/lib/server/financial/financial-service.ts`

**Responsabilidades:**
- Servicio de dominio centralizado para todas las operaciones financieras
- Validaciones de negocio
- Manejo de transacciones
- Registro de movimientos financieros
- Auditoría

**Métodos definidos (esqueleto):**

### Gestión de Cuotas
- `createCharge(input, tx?)` - Crear cuota individual
- `createBulkCharges(inputs, tx?)` - Crear cuotas en masa
- `applyScholarshipToCharge(chargeId, scholarshipId, tx?)` - Aplicar beca
- `applyDiscountToCharge(chargeId, discountId, tx?)` - Aplicar descuento
- `calculateLateFee(chargeId, tx?)` - Calcular recargo por mora
- `getPendingCharges(studentId)` - Obtener cuotas pendientes

### Gestión de Pagos
- `registerPayment(input, tx?)` - Registrar pago
- `cancelPayment(paymentId, reason, userId, tx?)` - Anular pago
- `allocatePayment(paymentId, chargeIds, tx?)` - Asignar pago a cuotas
- `getPayments(studentId)` - Obtener pagos

### Gestión de Recibos
- `generateReceipt(input, tx?)` - Generar recibo
- `cancelReceipt(receiptId, reason, userId, tx?)` - Anular recibo
- `reprintReceipt(receiptId, tx?)` - Reimprimir recibo
- `getNextReceiptNumber(year, tx?)` - Obtener siguiente número (transaccional)
- `getReceipts(studentId)` - Obtener recibos

### Control de Deuda
- `calculateDebtSummary(studentId)` - Calcular resumen de deuda
- `updateOverdueStatus(tx?)` - Actualizar estado de vencimiento

### Bloqueos Financieros
- `checkBlockStatus(studentId, blockType?)` - Verificar bloqueos
- `createBlock(input, tx?)` - Crear bloqueo
- `removeBlock(blockId, userId, tx?)` - Quitar bloqueo
- `grantBlockException(blockId, userId, reason, tx?)` - Otorgar excepción
- `validateActionAllowed(studentId, action)` - Validar si acción está permitida

### Configuración
- `getConfig(key)` - Obtener configuración
- `setConfig(key, value, userId, tx?)` - Establecer configuración

### Historial
- `getFinancialHistory(studentId, options?)` - Obtener historial financiero

### Becas y Descuentos
- `getActiveScholarships(studentId)` - Obtener becas activas
- `getActiveDiscounts()` - Obtener descuentos activos

**Nota:** Todos los métodos lanzan `Error('Not implemented yet - Phase X')` indicando en qué fase se implementarán.

## Migración

**Nombre:** `20260614_add_financial_receipts_blocks_and_movements`

**Operaciones:**
1. Crear 5 enums financieros
2. Modificar StudentCharge (agregar 6 campos, 1 unique constraint, 2 índices)
3. Modificar Payment (agregar 5 campos, 1 unique constraint, 2 índices, 1 FK)
4. Modificar PaymentAllocation (cambiar ON DELETE a Restrict)
5. Modificar Scholarship (agregar 5 campos)
6. Crear tabla Receipt (con constraints e índices)
7. Crear tabla ReceiptItem (con FK)
8. Crear tabla FinancialMovement (con índices)
9. Crear tabla Discount (con constraints e índices)
10. Crear tabla LateFee (con FK e índices)
11. Crear tabla FinancialBlock (con constraints e índices)
12. Crear tabla FinancialConfig (con constraints e índices)
13. Crear tabla ReceiptNumber (con constraint)

**Características:**
- No destructiva (solo agrega campos y tablas)
- Preserva datos existentes (no había datos financieros)
- Constraints únicos para prevención de duplicados en DB
- Índices para optimización de consultas

## Archivos Creados/Modificados

### Archivos Creados
1. `prisma/migrations/20260614_add_financial_receipts_blocks_and_movements/migration.sql`
2. `src/lib/server/financial/financial-service.ts`
3. `src/lib/server/financial/decimal-helpers.ts`
4. `scripts/inspect-financial-tables.ts`

### Archivos Modificados
1. `prisma/schema.prisma` - Agregados modelos, enums, constraints

## Próximos Pasos (Fase 2)

La Fase 2 implementará:
1. Generación de cuotas (individual y masiva)
2. Aplicación automática de becas
3. Aplicación de descuentos
4. Cálculo de montos finales
5. Validaciones de cuotas duplicadas
6. Pruebas funcionales

## Riesgos y Mitigaciones

### Riesgos Técnicos
- **Riesgo:** Drift entre schema y migraciones existentes
  - **Mitigación:** Migración creada manualmente para evitar conflictos
- **Riesgo:** Errores de precisión decimal
  - **Mitigación:** Helpers de cálculo decimal y uso consistente de Decimal(12,2)

### Riesgos Operativos
- **Riesgo:** Números de recibo duplicados bajo concurrencia
  - **Mitigación:** Estrategia transaccional con SELECT FOR UPDATE en ReceiptNumber

### Riesgos de Negocio
- **Riesgo:** Bloqueos incorrectos por deuda
  - **Mitigación:** Reglas configurables vía FinancialConfig y excepciones manuales

## Validaciones Pendientes

Antes de pasar a Fase 2, se deben ejecutar:
1. `npx prisma generate` - Regenerar cliente Prisma
2. `npx prisma migrate status` - Verificar estado de migraciones
3. `npm run check` - Verificar linting
4. `npm run build` - Verificar compilación
5. `prisma migrate deploy` en base temporal - Verificar migración desde cero
