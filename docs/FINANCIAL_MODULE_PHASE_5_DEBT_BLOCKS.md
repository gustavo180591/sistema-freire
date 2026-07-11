# Módulo Financiero - Fase 5: Control de Deuda y Bloqueos Automáticos

## Resumen

La Fase 5 implementa el control automático de deuda y bloqueos financieros para alumnos. Esta fase permite calcular la deuda de los alumnos, evaluar automáticamente si deben ser bloqueados según reglas configurables, y gestionar excepciones manuales a los bloqueos.

## Reglas Implementadas

### Cálculo de Deuda Vencida

La deuda vencida se calcula sumando todas las cuotas (`StudentCharge`) que cumplen:

- `status` es `PENDING` o `PARTIAL`
- `dueDate` es menor a la fecha actual
- `paidAmount` es menor a `finalAmount`

El cálculo usa `Decimal.js` para precisión monetaria:

```typescript
const chargeBalance = DecimalHelpers.subtract(charge.finalAmount, charge.paidAmount);
```

### Reglas de Bloqueo

Las reglas de bloqueo se configuran en `FinancialConfig` con categoría `BLOCK_RULES`:

| Key                   | Tipo    | Default | Descripción                                           |
| --------------------- | ------- | ------- | ----------------------------------------------------- |
| `blockOnOverdue`      | boolean | true    | Si se debe bloquear por deuda vencida                 |
| `blockOverdueAmount`  | number  | 5000    | Monto mínimo de deuda vencida para bloqueo total      |
| `blockOverdueCharges` | number  | 2       | Cantidad mínima de cuotas vencidas para bloqueo total |
| `graceDays`           | number  | 5       | Días de gracia antes de aplicar bloqueo               |

### Resolución de Bloqueos

Los bloqueos se resuelven automáticamente cuando:

- La deuda vencida es 0
- La deuda total es 0
- No hay cuotas vencidas según las reglas configuradas

### Excepciones

Las excepciones manuales permiten otorgar acceso temporal a alumnos bloqueados:

- Requieren permiso `FINANCIAL_BLOCK.update`
- Deben incluir un motivo
- Pueden tener fecha de expiración opcional
- Se registran en auditoría completa

### Auditoría

Todas las operaciones de bloqueos registran auditoría en `AuditLog`:

- **Creación de bloqueo**: `action: 'CREATE'`, `entityType: 'FinancialBlock'`
- **Desactivación de bloqueo**: `action: 'UPDATE'`, `entityType: 'FinancialBlock'`
- **Excepción manual**: `action: 'UPDATE'`, `entityType: 'FinancialBlock'`
- **Revocación de excepción**: `action: 'UPDATE'`, `entityType: 'FinancialBlock'`

Metadatos registrados:

- `studentId`: ID del alumno
- `blockType`: Tipo de bloqueo (ALL, ENROLLMENT, EXAM, etc.)
- `blockReason`: Motivo del bloqueo
- `debtAmount`: Monto de deuda
- `overdueCharges`: Cantidad de cuotas vencidas
- `overdueDays`: Días de vencimiento
- `reason`: Motivo de excepción
- `expiresAt`: Fecha de expiración (si aplica)

## Características Implementadas

### 1. Cálculo de Deuda (`calculateDebtSummary`)

Calcula un resumen completo de la deuda de un alumno:

- **Deuda total**: Suma de todos los saldos pendientes
- **Deuda vencida**: Suma de cuotas con fecha de vencimiento pasada
- **Saldo pendiente**: Monto total adeudado
- **Contadores**: Cuotas pendientes, vencidas, parciales, pagadas y canceladas

**Ubicación**: `src/lib/server/financial/financial-service.ts`

```typescript
async calculateDebtSummary(studentId: string): Promise<{
  totalDebt: Decimal;
  overdueDebt: Decimal;
  pendingBalance: Decimal;
  pendingCharges: number;
  overdueCharges: number;
  partialCharges: number;
  paidCharges: number;
  cancelledCharges: number;
}>
```

### 2. Estado Financiero del Alumno (`getStudentFinancialStatus`)

Proporciona una vista completa del estado financiero de un alumno:

- Información del alumno
- Cuotas pendientes (ordenadas por fecha de vencimiento)
- Cuotas vencidas
- Pagos realizados
- Recibos emitidos
- Estado de bloqueos activos
- Reglas de bloqueo aplicables

**Ubicación**: `src/lib/server/financial/financial-service.ts`

```typescript
async getStudentFinancialStatus(studentId: string): Promise<{
  student: any;
  pendingCharges: any[];
  overdueCharges: any[];
  payments: any[];
  receipts: any[];
  totalDebt: Decimal;
  overdueDebt: Decimal;
  hasActiveBlock: boolean;
  blockRules: string[];
}>
```

### 3. Evaluación Automática de Bloqueos (`evaluateFinancialBlocks`)

Evalúa si un alumno debe ser bloqueado según reglas configurables en `FinancialConfig`:

**Reglas configurables** (categoría `BLOCK_RULES`):

- `blockOnOverdue`: Si se debe bloquear por deuda vencida (default: true)
- `blockOverdueAmount`: Monto mínimo de deuda vencida para bloqueo total
- `blockOverdueCharges`: Cantidad mínima de cuotas vencidas para bloqueo total
- `graceDays`: Días de gracia antes de aplicar bloqueo

**Tipos de bloqueo**:

- `ALL`: Bloqueo total (todas las operaciones)
- `ENROLLMENT`: Bloqueo de matriculación
- `EXAM`: Bloqueo de exámenes
- `COURSE`: Bloqueo de cursado
- `CERTIFICATE`: Bloqueo de certificados
- `REPORT`: Bloqueo de reportes

**Comportamiento**:

- Crea bloqueo si la deuda cumple las reglas
- Actualiza bloqueo existente si ya existe
- Desactiva bloqueos si la deuda se resuelve
- Registra auditoría de todos los cambios
- **Transaccional**: Acepta un cliente transaccional opcional para ejecutarse dentro de transacciones

**Ubicación**: `src/lib/server/financial/financial-service.ts`

```typescript
async evaluateFinancialBlocks(
  studentId: string,
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<void>
```

**Nota de transaccionalidad**:

- Cuando se llama desde `registerPayment` o `cancelPayment`, se ejecuta dentro de la misma transacción
- Esto garantiza que el pago/allocation/cuota/bloqueo sean atómicos
- Si falla el recálculo de bloqueos, se hace rollback completo de la transacción

### 4. Verificación de Bloqueos (`checkFinancialBlock`)

Método reutilizable para verificar si un alumno tiene bloqueos activos:

- Verifica si está bloqueado
- Indica el motivo del bloqueo
- Muestra el monto de deuda
- Indica si tiene excepción activa
- Muestra detalles de la excepción (quién la otorgó, razón)

**Ubicación**: `src/lib/server/financial/financial-service.ts`

```typescript
async checkFinancialBlock(studentId: string, blockType?: FinancialBlockType): Promise<{
  blocked: boolean;
  reason: string | null;
  debtAmount: Decimal | null;
  blockedAt: Date | null;
  blockType: FinancialBlockType | null;
  hasException: boolean;
  exceptionBy: string | null;
  exceptionReason: string | null;
}>
```

### 5. Excepciones de Bloqueo (`createFinancialBlockException`)

Permite otorgar excepciones manuales a bloqueos:

- Valida permisos de `FINANCIAL_BLOCK.update`
- Requiere motivo de la excepción
- Opcionalmente puede tener fecha de expiración
- Registra auditoría completa

**Ubicación**: `src/lib/server/financial/financial-service.ts`

```typescript
async createFinancialBlockException(params: {
  studentId: string;
  blockType: FinancialBlockType;
  reason: string;
  userId: string;
  expiresAt?: Date;
}): Promise<void>
```

### 6. Revocación de Excepciones (`revokeFinancialBlockException`)

Permite revocar excepciones previamente otorgadas:

- Valida permisos de `FINANCIAL_BLOCK.update`
- Elimina la excepción del bloqueo
- Registra auditoría

**Ubicación**: `src/lib/server/financial/financial-service.ts`

```typescript
async revokeFinancialBlockException(params: {
  studentId: string;
  blockType: FinancialBlockType;
  userId: string;
}): Promise<void>
```

### 7. Integración con Pagos

Los métodos de registro y anulación de pagos recalculan automáticamente la deuda y los bloqueos de forma transaccional:

- `registerPayment`: Dentro de la transacción, registra el pago, crea allocations, actualiza cuotas, crea movimiento financiero y recalcula bloqueos
- `cancelPayment`: Dentro de la transacción, anula el pago, revierte allocations, actualiza cuotas, crea movimiento de cancelación y recalcula bloqueos

**Transaccionalidad**:

- Todas las operaciones (pago, allocations, cuotas, movimientos, bloqueos) son atómicas
- Si falla cualquier parte de la transacción, se hace rollback completo
- No puede quedar un pago registrado sin el bloqueo actualizado

**Ubicación**: `src/lib/server/financial/financial-service.ts`

### 8. Permisos y Ownership

Se agregó la entidad `FINANCIAL_BLOCK` al sistema de permisos granulares:

- **Ubicación**: `src/lib/server/auth/permissions-granular.ts`
- **Permisos disponibles**: create, read, update, delete
- **Roles recomendados**:
  - `FINANZAS`: Todos los permisos
  - `DIRECTOR`: Todos los permisos
  - `ADMINISTRATIVO`: read, update (para excepciones)

**Ownership para alumnos**:

- Los alumnos solo pueden consultar su propia deuda
- Los alumnos no pueden evaluar bloqueos
- Los alumnos no pueden crear excepciones
- Los alumnos no pueden revocar excepciones
- La validación de ownership se realiza en el backend (server actions en `/finanzas/deuda`)
- Roles administrativos (FINANZAS, DIRECTOR, SUPERADMIN) pueden consultar y gestionar deuda de cualquier alumno

### 9. Rutas y Acciones

Se creó la ruta `/finanzas/deuda` con server actions:

**Ubicación**: `src/routes/(app)/finanzas/deuda/+page.server.ts`

**Acciones disponibles**:

- `getDebtSummary`: Calcular resumen de deuda
- `evaluateBlocks`: Evaluar bloqueos financieros
- `createException`: Crear excepción de bloqueo
- `revokeException`: Revocar excepción de bloqueo

### 10. Auditoría

Todas las operaciones de bloqueos y excepciones registran auditoría completa:

- Creación de bloqueos
- Actualización de bloqueos
- Desactivación de bloqueos
- Otorgamiento de excepciones
- Revocación de excepciones

**Metadatos registrados**:

- ID del alumno
- Tipo de bloqueo
- Motivo del bloqueo
- Monto de deuda
- Días de vencimiento
- Razón de excepción
- Fecha de expiración (si aplica)

## Modelo de Datos

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

  @@index([studentId, isActive])
  @@index([blockType])
  @@index([isActive])
  @@map("financial_blocks")
}
```

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

## Pruebas Funcionales

**Ubicación**: `scripts/test-financial-debt-blocks.ts`

**Casos de prueba cubiertos**:

1. Cálculo de resumen de deuda
2. Alumno sin deuda
3. Evaluación de bloqueos financieros
4. No duplicar bloqueos activos
5. Pago desbloquea alumno
6. Anulación de pago reactiva bloqueo
7. Excepción de bloqueo
8. Revocar excepción
9. Estado financiero del alumno
10. **Transacción atómica con bloqueo**: Verifica que pago, allocations, cuotas y bloqueos sean atómicos
11. **Deuda pendiente no vencida**: Verifica que deuda no vencida no dispara bloqueo
12. **Grace days**: Verifica que se respeten los días de gracia configurados
13. **Ownership**: Verifica que alumnos solo puedan ver su propia deuda y no tengan permisos para gestionar bloqueos

**Ejecución**:

```bash
npx tsx scripts/test-financial-debt-blocks.ts
```

## Flujo de Trabajo

### 1. Configuración de Reglas

Configurar las reglas de bloqueo en `FinancialConfig`:

```typescript
await prisma.financialConfig.createMany({
	data: [
		{
			key: 'blockOnOverdue',
			value: true,
			category: 'BLOCK_RULES',
			description: 'Bloquear por deuda vencida'
		},
		{
			key: 'blockOverdueAmount',
			value: 5000,
			category: 'BLOCK_RULES',
			description: 'Monto mínimo para bloqueo total'
		},
		{
			key: 'blockOverdueCharges',
			value: 2,
			category: 'BLOCK_RULES',
			description: 'Cuotas vencidas para bloqueo total'
		},
		{
			key: 'graceDays',
			value: 5,
			category: 'BLOCK_RULES',
			description: 'Días de gracia antes de bloquear'
		}
	]
});
```

### 2. Registro de Pagos

Los pagos registrados automáticamente recalculan la deuda y los bloqueos:

```typescript
await financialService.registerPayment({
	studentId: 'student-id',
	amount: new Decimal(1000),
	method: 'CASH',
	chargeIds: ['charge-id'],
	userId: 'user-id'
});
// Bloqueos se recalculan automáticamente
```

### 3. Evaluación Manual de Bloqueos

Evaluar bloqueos manualmente si es necesario:

```typescript
await financialService.evaluateFinancialBlocks('student-id', 'user-id');
```

### 4. Verificación de Bloqueos

Verificar si un alumno tiene bloqueos:

```typescript
const status = await financialService.checkFinancialBlock('student-id');
if (status.blocked) {
	console.log('Alumno bloqueado:', status.reason);
}
```

### 5. Excepciones Manuales

Otorgar una excepción temporal:

```typescript
await financialService.createFinancialBlockException({
	studentId: 'student-id',
	blockType: 'ALL',
	reason: 'Pago acordado con dirección',
	userId: 'user-id',
	expiresAt: new Date('2026-02-01')
});
```

Revocar una excepción:

```typescript
await financialService.revokeFinancialBlockException({
	studentId: 'student-id',
	blockType: 'ALL',
	userId: 'user-id'
});
```

## Limitaciones Actuales

1. **Interfaz de usuario**: La vista de deuda es mínima y requiere desarrollo adicional
2. **Configuración de reglas**: No hay interfaz para configurar las reglas de bloqueo
3. **Notificaciones**: No hay notificaciones automáticas cuando se aplica un bloqueo
4. **Historial de bloqueos**: No hay vista de historial de bloqueos y excepciones
5. **Reportes**: No hay reportes de alumnos bloqueados

## Integración Futura

### Inscripciones

El módulo de inscripciones debe verificar bloqueos antes de permitir matriculación:

```typescript
const blockStatus = await financialService.checkFinancialBlock(studentId, 'ENROLLMENT');
if (blockStatus.blocked && !blockStatus.hasException) {
	throw new Error('Alumno bloqueado para matriculación: ' + blockStatus.reason);
}
```

### Exámenes

El módulo de exámenes debe verificar bloqueos antes de permitir inscripción a exámenes:

```typescript
const blockStatus = await financialService.checkFinancialBlock(studentId, 'EXAM');
if (blockStatus.blocked && !blockStatus.hasException) {
	throw new Error('Alumno bloqueado para exámenes: ' + blockStatus.reason);
}
```

### Cursadas

El módulo de cursadas debe verificar bloqueos antes de permitir inscripción a comisiones:

```typescript
const blockStatus = await financialService.checkFinancialBlock(studentId, 'COURSE');
if (blockStatus.blocked && !blockStatus.hasException) {
	throw new Error('Alumno bloqueado para cursado: ' + blockStatus.reason);
}
```

### Constancias

El módulo de constancias debe verificar bloqueos antes de emitir certificados:

```typescript
const blockStatus = await financialService.checkFinancialBlock(studentId, 'CERTIFICATE');
if (blockStatus.blocked && !blockStatus.hasException) {
	throw new Error('Alumno bloqueado para certificados: ' + blockStatus.reason);
}
```

### Reportes

El módulo de reportes debe verificar bloqueos antes de generar reportes:

```typescript
const blockStatus = await financialService.checkFinancialBlock(studentId, 'REPORT');
if (blockStatus.blocked && !blockStatus.hasException) {
	throw new Error('Alumno bloqueado para reportes: ' + blockStatus.reason);
}
```

## Próximos Pasos Sugeridos

1. Desarrollar interfaz completa para gestión de deuda y bloqueos
2. Crear interfaz de configuración de reglas de bloqueo
3. Implementar notificaciones por email cuando se aplica un bloqueo
4. Crear vista de historial de bloqueos y excepciones
5. Implementar reportes de alumnos bloqueados
6. Integrar verificación de bloqueos en módulos de inscripciones, exámenes, cursadas y constancias

## Consideraciones de Seguridad

1. **Permisos**: Todas las operaciones validan permisos granulares
2. **Auditoría**: Todas las operaciones registran auditoría completa
3. **Validación**: Se valida que los bloqueos no se dupliquen
4. **Transacciones**: Las operaciones críticas usan transacciones atómicas (pago, allocations, cuotas, bloqueos)
5. **Ownership**: Los alumnos solo pueden consultar su propia deuda y no pueden gestionar bloqueos
6. **SQL Injection**: Las queries raw usan parámetros seguros

## Archivos Modificados/Creados

### Modificados

- `src/lib/server/financial/financial-service.ts` (transaccionalidad de bloqueos)
- `src/lib/server/auth/permissions-granular.ts` (entidad FINANCIAL_BLOCK)
- `src/routes/(app)/finanzas/deuda/+page.server.ts` (validación de ownership y permisos)
- `src/routes/+page.svelte` (icono de docente)

### Creados

- `src/routes/(app)/finanzas/deuda/+page.svelte`
- `scripts/test-financial-debt-blocks.ts`
- `docs/FINANCIAL_MODULE_PHASE_5_DEBT_BLOCKS.md`

## Conclusión

La Fase 5 implementa un sistema robusto de control de deuda y bloqueos automáticos que permite:

- Calcular automáticamente la deuda de los alumnos
- Evaluar y aplicar bloqueos según reglas configurables
- Gestionar excepciones manuales con auditoría completa
- Integrar el recálculo de bloqueos con el registro de pagos
- Proporcionar una vista completa del estado financiero de los alumnos

El sistema está listo para producción con todas las pruebas funcionales pasando exitosamente.
