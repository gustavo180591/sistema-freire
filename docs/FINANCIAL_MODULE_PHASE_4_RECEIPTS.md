# Módulo Financiero - Fase 4: Recibos Institucionales

## Resumen

La Fase 4 del Módulo Financiero implementa la funcionalidad de Recibos Institucionales, permitiendo emitir, visualizar, reimprimir y anular recibos de pago con numeración correlativa segura, auditoría completa y validación de permisos.

## Objetivos

- Emitir recibos institucionales asociados a uno o más pagos
- Implementar numeración correlativa segura por año con control de concurrencia
- Crear ReceiptItem con detalle desglosado de conceptos pagados
- Vincular recibos a pagos evitando duplicados de recibos activos
- Implementar anulación de recibos con auditoría (sin eliminación física)
- Implementar reimpresión de recibos con auditoría
- Crear vista HTML imprimible del recibo institucional
- Implementar validación de permisos granular para todas las operaciones
- Auditoría completa de todas las operaciones de recibos

## Flujo de Emisión de Recibos

1. **Validación de Permisos**: Se verifica que el usuario tenga permiso `RECEIPT.create`
2. **Validación de Pagos**: Se verifican que los pagos existan, no estén anulados y pertenezcan al mismo alumno
3. **Prevención de Duplicados**: Se verifica que los pagos no tengan recibos activos (estado ISSUED)
4. **Cálculo de Items**: Se generan los ReceiptItem con detalle de conceptos, recargos y descuentos
5. **Transacción de Emisión**:
   - Se obtiene o crea el registro de numeración del año actual
   - Se incrementa el número de recibo de forma segura dentro de la transacción
   - Se crea el recibo con toda la información
   - Se crean los ReceiptItem
   - Se vinculan los pagos al recibo
   - Se crea el movimiento financiero
   - Se registra auditoría
6. **Retorno**: Se retorna el recibo creado con sus items

## Numeración Correlativa Segura

La numeración de recibos se implementa de forma segura ante concurrencia:

- **Por año**: Cada año tiene su propia secuencia de numeración (model `ReceiptNumber`)
- **Transaccional**: La obtención, incremento y uso del número se hace dentro de una transacción Prisma
- **Control de concurrencia**: Prisma maneja el bloqueo a nivel de fila en `ReceiptNumber.update`
- **Constraint único**: El modelo `Receipt` tiene un constraint único `[receiptNumber, receiptYear]` como última barrera
- **Error controlado**: Si ocurre una colisión por el constraint único, Prisma lanza un error que se propaga al cliente

**Implementación en `issueReceipt()`:**
```typescript
await prisma.$transaction(async (tx) => {
  // Get or create receipt number for current year
  let receiptNumberRecord = await tx.receiptNumber.findUnique({
    where: { year: currentYear }
  });

  if (!receiptNumberRecord) {
    receiptNumberRecord = await tx.receiptNumber.create({
      data: { year: currentYear, lastNumber: 0 }
    });
  }

  // Increment receipt number
  const newReceiptNumber = receiptNumberRecord.lastNumber + 1;
  await tx.receiptNumber.update({
    where: { year: currentYear },
    data: { lastNumber: newReceiptNumber }
  });

  // Create receipt with the new number
  const receipt = await tx.receipt.create({
    data: {
      receiptNumber: newReceiptNumber,
      receiptYear: currentYear,
      // ... other fields
    }
  });
});
```

## Anulación de Recibos

La anulación de recibos NO anula el pago ni las allocations:

- **Solo el recibo**: Se actualiza el estado del recibo a `CANCELLED`
- **Pago intacto**: El pago sigue existiendo con `isCancelled: false`
- **Allocations intactas**: Las allocations de pagos a cuotas no se modifican
- **Saldo de cuotas**: No cambia, el pago sigue aplicado
- **Metadata de anulación**: Se guarda `cancelledAt`, `cancelledBy`, `cancelledReason`
- **Movimiento financiero**: Se crea un movimiento de tipo `CANCELLATION` con monto negativo
- **Auditoría**: Se registra la acción con metadata del estado anterior y nuevo

**Nota**: Si un recibo fue anulado, se permite emitir un nuevo recibo para los mismos pagos porque el recibo anterior ya no está en estado `ISSUED`.

## Reimpresión de Recibos

La reimpresión de recibos:

- **No crea nuevo recibo**: Solo actualiza el recibo existente
- **Conserva número**: El número de recibo no cambia
- **Incrementa contador**: Se incrementa `printCount` en 1
- **Audita la acción**: Se registra auditoría con el nuevo contador
- **Permite anulados**: No se restringe la reimpresión de recibos anulados (puede ser útil para auditoría)

## Permisos

La entidad `RECEIPT` está agregada al sistema granular de permisos:

- **Entidad**: `RECEIPT` agregada a `ENTITIES` en `permissions-granular.ts`
- **Label**: "Recibos" en `getEntityLabel`
- **Permisos disponibles**:
  - `RECEIPT.create` - Emitir recibos
  - `RECEIPT.read` - Ver recibos
  - `RECEIPT.update` - Modificar recibos (no implementado aún)
  - `RECEIPT.delete` - Anular recibos

**Validación por rol:**
- **SUPERADMIN**: Tiene todos los permisos automáticamente
- **DIRECTOR**: Puede emitir, ver y anular recibos si tiene permisos configurados
- **FINANZAS**: Puede emitir, ver y anular recibos si tiene permisos configurados
- **SECRETARIA**: Puede ver recibos si tiene permisos configurados
- **ALUMNO**: Solo puede ver sus propios recibos (validado en `getStudentReceipts`)

**Validación en backend**: Todas las operaciones validan permisos antes de ejecutarse usando `hasPermission()`.

## Auditoría

Todas las operaciones de recibos registran auditoría en `AuditLog`:

### Emisión de Recibo
- **Action**: `CREATE`
- **Entity**: `Receipt`
- **Metadata**:
  - `receiptNumber`, `receiptYear`
  - `studentId`, `studentName`
  - `totalAmount`
  - `paymentIds` (array de IDs de pagos)
  - `paymentMethod`
  - `observations` (si aplica)

### Anulación de Recibo
- **Action**: `DELETE`
- **Entity**: `Receipt`
- **Metadata**:
  - `receiptNumber`, `receiptYear`
  - `studentId`, `studentName`
  - `totalAmount`
  - `reason` (motivo de anulación)
  - `oldStatus` (antes de anular)
  - `newStatus` (CANCELLED)

### Reimpresión de Recibo
- **Action**: `UPDATE`
- **Entity**: `Receipt`
- **Metadata**:
  - `receiptNumber`, `receiptYear`
  - `studentId`, `studentName`
  - `printCount` (nuevo contador)

## Vista HTML Imprimible

La vista imprimible del recibo (`src/routes/(app)/finanzas/recibos/[id]/+page.svelte`):

- **Sin dependencias externas**: No usa date-fns ni otras librerías no instaladas
- **Estilos de impresión**: CSS `@media print` para ocultar botones y ajustar layout
- **Datos mostrados**:
  - Número de recibo y fecha de emisión
  - Datos del alumno (nombre, DNI, dirección)
  - Tabla de conceptos (concepto, período, base, recargo, descuento, final)
  - Total
  - Método de pago y referencia
  - Observaciones (si aplica)
  - Estado (incluye indicación de anulado si corresponde)
  - Contador de impresiones
- **No PDF todavía**: No se usa PDFKit, Playwright ni Puppeteer. La estrategia futura para PDF será agregar una librería como `html-pdf` o `puppeteer` en una fase posterior.

## Limitaciones Actuales

- **$queryRaw para verificación de recibos activos**: Se usa una consulta SQL raw para evitar problemas de Prisma con enums. La consulta es segura con parámetros y está encapsulada en `FinancialService`.
- **No hay restricción de reimpresión de anulados**: Se permite reimprimir recibos anulados para auditoría.
- **No hay exportación a PDF**: La vista es HTML imprimible, sin generación de PDF.
- **No hay plantillas personalizables**: El diseño del recibo es fijo.

## Componentes Implementados

### 1. FinancialService (`src/lib/server/financial/financial-service.ts`)

#### Métodos Implementados

##### `issueReceipt(params)`
Emite un recibo institucional asociado a uno o más pagos.

**Parámetros:**
- `paymentIds: string[]` - IDs de los pagos a incluir en el recibo
- `userId: string` - ID del usuario que emite el recibo
- `observations?: string` - Observaciones opcionales

**Validaciones:**
- Verifica permisos `RECEIPT.create`
- Valida que los pagos existan y no estén anulados
- Valida que todos los pagos pertenezcan al mismo alumno
- Previene emisión de recibos duplicados para pagos con recibo activo

**Proceso:**
1. Obtiene los pagos con sus allocations y conceptos
2. Calcula el total y genera los items del recibo
3. En una transacción:
   - Obtiene o crea el registro de numeración del año actual
   - Incrementa el número de recibo de forma segura
   - Crea el recibo con toda la información
   - Crea los ReceiptItem con detalle de conceptos
   - Vincula los pagos al recibo
   - Crea el movimiento financiero correspondiente
   - Registra auditoría

**Retorna:**
- `{ receipt: Receipt, items: ReceiptItem[] }`

##### `cancelReceipt(params)`
Anula un recibo existente (marcado como CANCELLED, sin eliminación física).

**Parámetros:**
- `receiptId: string` - ID del recibo a anular
- `reason: string` - Motivo de la anulación
- `userId: string` - ID del usuario que anula el recibo

**Validaciones:**
- Verifica permisos `RECEIPT.delete`
- Valida que el recibo exista
- Previene anulación de recibos ya anulados

**Proceso:**
1. Obtiene el recibo
2. En una transacción:
   - Actualiza el estado a CANCELLED
   - Registra fecha, usuario y motivo de anulación
   - Crea movimiento financiero de anulación
   - Registra auditoría

##### `reprintReceipt(params)`
Reimprime un recibo existente, incrementando el contador de impresiones.

**Parámetros:**
- `receiptId: string` - ID del recibo a reimprimir
- `userId: string` - ID del usuario que reimprime

**Validaciones:**
- Verifica permisos `RECEIPT.read`
- Valida que el recibo exista

**Proceso:**
1. Obtiene el recibo
2. Incrementa el contador de impresiones
3. Registra auditoría

**Retorna:**
- `Receipt` actualizado

##### `getReceipt(receiptId, userId)`
Obtiene un recibo específico con sus items.

**Parámetros:**
- `receiptId: string` - ID del recibo
- `userId: string` - ID del usuario que solicita

**Validaciones:**
- Verifica permisos `RECEIPT.read`

**Retorna:**
- `Receipt | null` con items incluidos

##### `getStudentReceipts(studentId, userId)`
Obtiene todos los recibos de un alumno.

**Parámetros:**
- `studentId: string` - ID del alumno
- `userId: string` - ID del usuario que solicita

**Validaciones:**
- Permite acceso si el usuario es el propio alumno
- Requiere permisos `RECEIPT.read` para otros usuarios

**Retorna:**
- `Receipt[]` ordenados por fecha de emisión descendente

### 2. Vista HTML Imprimible (`src/routes/(app)/finanzas/recibos/[id]/+page.svelte`)

Componente Svelte que genera una vista imprimible del recibo institucional con:

- Encabezado con número de recibo y fecha
- Datos del alumno (nombre, DNI, dirección)
- Tabla detallada de conceptos pagados:
  - Concepto
  - Período
  - Monto base
  - Recargos
  - Descuentos
  - Monto final
- Información de pago (método, referencia)
- Observaciones (si aplica)
- Footer con información de emisión y estado
- Estilos CSS específicos para impresión
- Botón de impresión (oculto al imprimir)

### 3. Server Actions (`src/routes/(app)/finanzas/recibos/+page.server.ts`)

Acciones de servidor para:

- `issueReceipt` - Emitir un nuevo recibo
- `cancelReceipt` - Anular un recibo existente
- `reprintReceipt` - Reimprimir un recibo

Todas las acciones incluyen:
- Validación de autenticación
- Manejo de errores con mensajes descriptivos
- Respuestas apropiadas para el cliente

### 4. Permisos (`src/lib/server/auth/permissions-granular.ts`)

Se agregó la entidad `RECEIPT` al sistema de permisos granular:

- Agregado al array `ENTITIES`
- Agregado al objeto `labels` en `getEntityLabel`

Permisos disponibles:
- `RECEIPT.create` - Emitir recibos
- `RECEIPT.read` - Ver recibos
- `RECEIPT.update` - Modificar recibos (no implementado aún)
- `RECEIPT.delete` - Anular recibos

### 5. Script de Pruebas (`scripts/test-financial-receipts.ts`)

Suite de pruebas funcionales que valida:

- Emisión de recibos
- Obtención de recibos
- Reimpresión de recibos
- Anulación de recibos
- Prevención de recibos duplicados
- Obtención de recibos por alumno

El script incluye:
- Setup de datos de prueba (usuario, alumno, pagos, conceptos)
- Ejecución de todas las pruebas
- Cleanup automático de datos de prueba
- Manejo de errores con mensajes descriptivos

## Modelo de Datos

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

  @@unique([receiptNumber, receiptYear])
  @@index([studentId])
  @@index([receiptNumber, receiptYear])
  @@index([status])
  @@map("receipts")
}
```

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
  receipt        Receipt @relation(fields: [receiptId], references: [id], onDelete: Restrict)

  @@index([receiptId])
  @@map("receipt_items")
}
```

### ReceiptNumber
```prisma
model ReceiptNumber {
  id         String   @id @default(cuid())
  year       Int      @unique
  lastNumber Int      @default(0)
  updatedAt  DateTime @updatedAt
}
```

### ReceiptStatus
```prisma
enum ReceiptStatus {
  ISSUED
  CANCELLED
}
```

## Seguridad

### Numeración Correlativa Segura

La numeración de recibos se maneja de forma segura:

1. **Por año**: Cada año tiene su propia secuencia de numeración
2. **Transaccional**: La obtención e incremento del número se hace dentro de una transacción
3. **Control de concurrencia**: Prisma maneja el bloqueo a nivel de fila para evitar conflictos

### Validación de Permisos

Todas las operaciones de recibos validan permisos antes de ejecutarse:

- `issueReceipt` requiere `RECEIPT.create`
- `cancelReceipt` requiere `RECEIPT.delete`
- `reprintReceipt` requiere `RECEIPT.read`
- `getReceipt` requiere `RECEIPT.read`
- `getStudentReceipts` requiere `RECEIPT.read` o ser el propio alumno

### Auditoría

Todas las operaciones de recibos registran auditoría:

- **CREATE**: Emisión de recibo
- **DELETE**: Anulación de recibo
- **UPDATE**: Reimpresión de recibo

Metadata de auditoría incluye:
- Número y año del recibo
- ID y nombre del alumno
- Monto total
- IDs de pagos asociados
- Método de pago
- Motivo de anulación (si aplica)
- Contador de impresiones

## Rutas

- `/finanzas/recibos` - Página principal de recibos
- `/finanzas/recibos/[id]` - Vista/imprimir recibo específico

## Uso

### Emitir un Recibo

```typescript
const result = await financialService.issueReceipt({
  paymentIds: ['payment-1', 'payment-2'],
  userId: 'user-id',
  observations: 'Recibo por cuotas de enero y febrero'
});

console.log(`Recibo #${result.receipt.receiptNumber}/${result.receipt.receiptYear} emitido`);
```

### Anular un Recibo

```typescript
await financialService.cancelReceipt({
  receiptId: 'receipt-id',
  reason: 'Error en el monto',
  userId: 'user-id'
});
```

### Reimprimir un Recibo

```typescript
const receipt = await financialService.reprintReceipt({
  receiptId: 'receipt-id',
  userId: 'user-id'
});

console.log(`Contador de impresiones: ${receipt.printCount}`);
```

### Obtener un Recibo

```typescript
const receipt = await financialService.getReceipt('receipt-id', 'user-id');
```

### Obtener Recibos de un Alumno

```typescript
const receipts = await financialService.getStudentReceipts('student-id', 'user-id');
```

## Pruebas

Ejecutar el script de pruebas:

```bash
npx tsx scripts/test-financial-receipts.ts
```

El script:
1. Configura datos de prueba
2. Ejecuta todas las pruebas
3. Limpia los datos de prueba
4. Reporta el resultado

## Próximos Pasos

- [ ] Implementar modificación de recibos (si aplica)
- [ ] Agregar filtros y búsqueda en la lista de recibos
- [ ] Implementar exportación a PDF
- [ ] Agregar reportes de recibos por período
- [ ] Implementar reembolso de recibos
- [ ] Agregar plantillas personalizables de recibos

## Notas

- Los recibos anulados no se eliminan físicamente, solo se marcan como CANCELLED
- La numeración de recibos es por año y se reinicia cada año
- Un pago solo puede tener un recibo activo a la vez
- Todas las operaciones son transaccionales para garantizar consistencia
- La vista HTML está optimizada para impresión con estilos específicos
