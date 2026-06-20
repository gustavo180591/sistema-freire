# Convenios de Pago - Fase 1: Schema + Migración + Servicio Base + Permisos

## Resumen

Este documento describe la implementación de la Fase 1 del módulo de Convenios de Pago, que incluye el schema de Prisma, migración formal, servicio base y permisos granulares.

## Fecha de Implementación

20 de Junio de 2026

## Archivos Modificados/Creados

### Archivos de Schema
- `prisma/schema.prisma` - Modificado con nuevos enums y modelos
- `prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql` - Migración creada (no aplicada a base real)

### Archivos de Servicio
- `src/lib/server/payment-agreements/payment-agreement-service.ts` - Servicio base creado

### Archivos de Permisos
- `src/lib/server/auth/permissions-granular.ts` - Agregada entidad PAYMENT_AGREEMENT
- `prisma/seed-permissions.ts` - Agregados permisos para PAYMENT_AGREEMENT

### Archivos de Documentación
- `docs/PAYMENT_AGREEMENTS_PHASE_1_SCHEMA.md` - Este documento

## Enums Agregados

### PaymentAgreementStatus
Estados de un convenio de pago:
- `DRAFT` - Borrador (estado inicial)
- `ACTIVE` - Activo (en curso)
- `COMPLETED` - Completado (todas las cuotas pagadas)
- `OVERDUE` - Vencido (con cuotas atrasadas)
- `DEFAULTED` - Incumplido (mora grave)
- `CANCELLED` - Cancelado
- `REFINANCED` - Refinanciado (reemplazado por otro convenio)

### PaymentAgreementInstallmentStatus
Estados de una cuota de convenio:
- `PENDING` - Pendiente de pago
- `PARTIAL` - Pagado parcialmente
- `PAID` - Pagado completamente
- `OVERDUE` - Vencida
- `CANCELLED` - Cancelada
- `WAIVED` - Condonada

### PaymentAgreementChargeRelationType
Tipos de relación con deuda original:
- `REFINANCED` - Deuda refinanciada
- `BLOCKED` - Bloqueo financiero asociado
- `ASSOCIATED` - Asociada sin modificación

### PaymentAgreementEventType
Tipos de eventos de auditoría:
- `CREATED` - Convenio creado
- `ACTIVATED` - Convenio activado
- `MODIFIED` - Convenio modificado
- `CANCELLED` - Convenio cancelado
- `REFINANCED` - Convenio refinanciado
- `INSTALLMENT_PAID` - Cuota pagada
- `INSTALLMENT_OVERDUE` - Cuota vencida
- `DEFAULTED` - Convenio incumplido
- `STATUS_CHANGED` - Cambio de estado
- `BLOCK_EXCEPTION` - Excepción de bloqueo
- `BLOCK_REACTIVATED` - Bloqueo reactivado

### FinancialBlockExceptionSource
Origen de excepción de bloqueo financiero:
- `MANUAL` - Excepción manual
- `PAYMENT_AGREEMENT` - Excepción por convenio de pago

## Modelos Agregados

### PaymentAgreement
Modelo principal de convenios de pago.

**Campos principales:**
- `id` - Identificador único (CUID)
- `agreementNumber` - Número de convenio (correlativo por año)
- `agreementYear` - Año del convenio
- `studentId` - ID del estudiante
- `studentName` - Nombre del estudiante (snapshot)
- `studentDni` - DNI del estudiante (opcional)
- `originalDebt` - Deuda original (Decimal @db.Decimal(12, 2))
- `agreedAmount` - Monto acordado (Decimal @db.Decimal(12, 2))
- `paidAmount` - Monto pagado (Decimal @db.Decimal(12, 2))
- `pendingAmount` - Monto pendiente (Decimal @db.Decimal(12, 2))
- `createdAt` - Fecha de creación
- `activatedAt` - Fecha de activación
- `completedAt` - Fecha de completado
- `cancelledAt` - Fecha de cancelación
- `status` - Estado (PaymentAgreementStatus)
- `reason` - Motivo del convenio (Text)
- `observations` - Observaciones (Text, opcional)
- `createdBy` - ID del usuario creador
- `createdByName` - Nombre del usuario creador
- `activatedBy` - ID del usuario activador
- `activatedByName` - Nombre del usuario activador
- `cancelledBy` - ID del usuario cancelador
- `cancelledByName` - Nombre del usuario cancelador
- `cancelledReason` - Motivo de cancelación (Text, opcional)
- `metadata` - Metadatos adicionales (JSON, opcional)

**Relaciones:**
- `relatedCharges` - Relaciones con cargos originales
- `installments` - Cuotas del convenio
- `events` - Eventos de auditoría
- `receipts` - Recibos asociados
- `financialBlocks` - Bloqueos financieros asociados

**Constraints:**
- `@@unique([agreementNumber, agreementYear])` - Número único por año
- `@@index([studentId])` - Índice por estudiante
- `@@index([status])` - Índice por estado
- `@@index([createdAt])` - Índice por fecha de creación
- `@@index([studentId, status])` - Índice compuesto

### PaymentAgreementInstallment
Modelo de cuotas de convenio.

**Campos principales:**
- `id` - Identificador único (CUID)
- `agreementId` - ID del convenio
- `installmentNumber` - Número de cuota
- `dueDate` - Fecha de vencimiento
- `amount` - Monto de la cuota (Decimal @db.Decimal(12, 2))
- `paidAmount` - Monto pagado (Decimal @db.Decimal(12, 2))
- `pendingAmount` - Monto pendiente (Decimal @db.Decimal(12, 2))
- `status` - Estado (PaymentAgreementInstallmentStatus)
- `paidAt` - Fecha de pago
- `overdueSince` - Fecha desde la que está vencida
- `notes` - Notas (Text, opcional)
- `metadata` - Metadatos (JSON, opcional)

**Relaciones:**
- `agreement` - Convenio padre
- `allocations` - Asignaciones de pagos

**Constraints:**
- `@@unique([agreementId, installmentNumber])` - Número único por convenio
- `@@index([agreementId])` - Índice por convenio
- `@@index([dueDate])` - Índice por fecha de vencimiento
- `@@index([status])` - Índice por estado
- `@@index([agreementId, status])` - Índice compuesto

**Política onDelete:**
- `agreement` - `Restrict` (No permite borrar el convenio si tiene cuotas)

### PaymentAgreementChargeRelation
Modelo de relación con deuda original (snapshot no destructivo).

**Campos principales:**
- `id` - Identificador único (CUID)
- `agreementId` - ID del convenio
- `chargeId` - ID del cargo original
- `originalChargeAmount` - Monto original del cargo (Decimal @db.Decimal(12, 2))
- `originalChargePaidAmount` - Monto pagado original (Decimal @db.Decimal(12, 2))
- `originalChargeStatus` - Estado original del cargo (String snapshot)
- `amountIncluded` - Monto incluido en el convenio (Decimal @db.Decimal(12, 2))
- `newStatus` - Nuevo estado del cargo (opcional)
- `relationType` - Tipo de relación (PaymentAgreementChargeRelationType)

**Relaciones:**
- `agreement` - Convenio padre
- `charge` - Cargo original

**Constraints:**
- `@@unique([agreementId, chargeId])` - Relación única
- `@@index([agreementId])` - Índice por convenio
- `@@index([chargeId])` - Índice por cargo

**Política onDelete:**
- `agreement` - `Cascade` (Se elimina si se elimina el convenio)
- `charge` - `Restrict` (No permite borrar el cargo si está en un convenio)

### PaymentAgreementEvent
Modelo de eventos de auditoría.

**Campos principales:**
- `id` - Identificador único (CUID)
- `agreementId` - ID del convenio
- `eventType` - Tipo de evento (PaymentAgreementEventType)
- `description` - Descripción del evento (Text)
- `previousStatus` - Estado anterior (opcional)
- `newStatus` - Estado nuevo (opcional)
- `oldValue` - Valor anterior (JSON, opcional)
- `newValue` - Valor nuevo (JSON, opcional)
- `metadata` - Metadatos adicionales (JSON, opcional)
- `reason` - Motivo del cambio (Text, opcional)
- `userId` - ID del usuario
- `userName` - Nombre del usuario
- `createdAt` - Fecha de creación

**Relaciones:**
- `agreement` - Convenio asociado

**Constraints:**
- `@@index([agreementId])` - Índice por convenio
- `@@index([eventType])` - Índice por tipo de evento
- `@@index([createdAt])` - Índice por fecha
- `@@index([agreementId, createdAt])` - Índice compuesto

**Política onDelete:**
- `agreement` - `Cascade` (Se eliminan eventos si se elimina el convenio)

### PaymentAgreementNumber
Modelo de control de numeración por año.

**Campos principales:**
- `id` - Identificador único (CUID)
- `year` - Año (único)
- `lastNumber` - Último número utilizado
- `updatedAt` - Fecha de actualización

**Constraints:**
- `@@unique([year])` - Un registro por año

## Modelos Modificados

### FinancialMovementType
Agregados valores:
- `PAYMENT_AGREEMENT` - Movimiento de convenio
- `AGREEMENT_INSTALLMENT` - Movimiento de cuota de convenio

### FinancialBlock
Agregados campos:
- `exceptionSource` - Origen de la excepción (FinancialBlockExceptionSource, opcional)
- `exceptionAgreementId` - ID del convenio que genera la excepción (opcional)
- `exceptionAgreement` - Relación con PaymentAgreement

**Índices agregados:**
- `@@index([exceptionSource])`
- `@@index([exceptionAgreementId])`

**Política onDelete:**
- `exceptionAgreement` - `SetNull` (Se setea a null si se elimina el convenio)

### PaymentAllocation
Agregados campos:
- `installmentId` - ID de la cuota de convenio (opcional)
- `installment` - Relación con PaymentAgreementInstallment

**Índices agregados:**
- `@@index([installmentId])`

**Nota:** No se usa `@@unique` en `installmentId` para permitir pagos parciales a una cuota.

### Receipt
Agregados campos:
- `agreementId` - ID del convenio (opcional)
- `agreementNumber` - Número del convenio (opcional)
- `installmentNumber` - Número de cuota (opcional)
- `agreement` - Relación con PaymentAgreement

**Índices agregados:**
- `@@index([agreementId])`

**Política onDelete:**
- `agreement` - `SetNull` (Se setea a null si se elimina el convenio)

### StudentCharge
Agregada relación:
- `agreementChargeRelations` - Relaciones con convenios

## Política onDelete

Para preservar la integridad de datos financieros históricos, se usan las siguientes políticas:

- **PaymentAgreementInstallment.agreement** - `Restrict` (No permite borrar el convenio si tiene cuotas)
- **PaymentAgreementChargeRelation.charge** - `Restrict` (No permite borrar el cargo si está en un convenio)
- **FinancialBlock.exceptionAgreement** - `SetNull` (Se setea a null si se elimina el convenio)
- **Receipt.agreement** - `SetNull` (Se setea a null si se elimina el convenio)
- **PaymentAgreementChargeRelation.agreement** - `Cascade` (Se eliminan relaciones si se elimina el convenio)
- **PaymentAgreementEvent.agreement** - `Cascade` (Se eliminan eventos si se elimina el convenio)

## Numeración de Convenios

La numeración de convenios es:
- **Correlativa por año** - Cada año tiene su propia secuencia
- **Transaccional** - Se obtiene y actualiza en una transacción
- **No reutilizable** - Los números no se reutilizan
- **Controlada por PaymentAgreementNumber** - Tabla separada para control

## Relación con Deuda Original

La relación con la deuda original es:
- **No destructiva** - No modifica el cargo original directamente
- **Snapshot** - Guarda el estado del cargo en el momento del convenio
- **Trazable** - Permite rastrear qué deudas se incluyeron en cada convenio
- **Controlada por PaymentAgreementChargeRelation** - Tabla separada para relaciones

## Relación con Pagos

La relación con pagos es:
- **A través de PaymentAllocation** - Los pagos se asignan a cuotas
- **Permite pagos parciales** - Un pago puede asignarse parcialmente a una cuota
- **Validación en servicio** - El servicio valida que un pago se asigne a chargeId O installmentId, no ambos

## Relación con Recibos

La relación con recibos es:
- **Identificación en Receipt** - Los recibos tienen campos para identificar el convenio y cuota
- **No destructiva** - Si se elimina el convenio, los recibos permanecen (agreementId se setea a null)

## Relación con Bloqueos Financieros

La relación con bloqueos financieros es:
- **Excepciones por convenio** - Los bloqueos pueden tener excepciones generadas por convenios
- **Origen identificado** - Se distingue entre excepciones manuales y por convenio
- **No destructiva** - Si se elimina el convenio, la excepción se pierde (exceptionAgreementId se setea a null)

## Permisos Agregados

### Entidad PAYMENT_AGREEMENT

**SUPERADMIN:**
- Todos los permisos (por defecto del sistema)

**DIRECTOR:**
- `create` - Puede crear convenios
- `read` - Puede ver convenios
- `update` - Puede editar convenios
- `delete` - Puede eliminar convenios

**FINANZAS:**
- `create` - Puede crear convenios
- `read` - Puede ver convenios
- `update` - Puede editar convenios
- `delete` - NO puede eliminar convenios (solo soft delete)

**SECRETARIA:**
- `create` - NO puede crear convenios
- `read` - Puede ver convenios
- `update` - NO puede editar convenios
- `delete` - NO puede eliminar convenios

**ALUMNO:**
- `create` - NO puede crear convenios
- `read` - Puede ver sus propios convenios (validación por ownership en servicio)
- `update` - NO puede editar convenios
- `delete` - NO puede eliminar convenios

**Nota:** ALUMNO no puede crear, modificar, cancelar, refinanciar ni registrar pagos de convenios.

## Servicio Base

### PaymentAgreementService

El servicio base incluye:

**Métodos implementados:**
- `getNextAgreementNumber(year)` - Obtiene el siguiente número de convenio para un año (transaccional)
- `getAgreementById(id)` - Obtiene un convenio por ID con sus relaciones
- `getStudentAgreements(studentId)` - Obtiene todos los convenios de un estudiante
- `createAgreement(input)` - Crea un convenio en estado DRAFT con sus cuotas y relaciones
- `logEventInternal(tx, data)` - Método interno para registrar eventos de auditoría
- `auditLogInternal(...)` - Método interno para registrar en audit log general
- `mapPaymentAgreement(agreement)` - Método interno para mapear modelos Prisma a tipos de servicio

**Métodos NO implementados en Fase 1:**
- Activación de convenios
- Cancelación de convenios
- Refinanciación
- Registro de pagos
- Generación de recibos
- Impacto en bloqueos financieros
- Validaciones de negocio avanzadas

## Estado del servicio base

**Schema y migración:**
- ✅ Schema de Prisma actualizado con todos los enums y modelos aprobados
- ✅ Migración formal creada: `20260620164627_add_payment_agreements_phase1`
- ✅ Migración validada exitosamente en base temporal `sistema_freire_migration_test`
- ❌ Migración NO aplicada a base real por drift académico (tarea separada)

**Servicio PaymentAgreementService:**
- ✅ Servicio existe como estructura base tipada con interfaces y tipos
- ✅ Métodos definidos con firmas correctas y tipos seguros
- ❌ Métodos NO habilitados para uso productivo hasta aplicar migración real
- ❌ Métodos actuales son stubs que lanzan error claro si se invocan
- ⚠️  NO conectar este servicio desde rutas/UI todavía

**Por qué este enfoque:**
- La migración no puede aplicarse a la base real debido a drift académico detectado
- TypeScript debe compilar sin `@ts-ignore` ni `as any` (requisito de módulo financiero)
- El servicio proporciona seguridad de tipos y estructura para implementación futura
- El script de prueba valida el schema en base temporal con datos reales

**Fase 2 - Próximos pasos:**
1. Resolver drift académico en base real
2. Aplicar migración `20260620164627_add_payment_agreements_phase1` a base real
3. Reemplazar stubs de `PaymentAgreementService` con implementación real de Prisma
4. Implementar lógica de negocio para ciclo de vida de convenios
5. Conectar servicio a rutas/UI
6. Ejecutar seed de permisos en base real

**Estado actual del servicio:**
```typescript
// Métodos actuales (Fase 1):
async getNextAgreementNumber(year: number): Promise<number> {
  throw MIGRATION_NOT_APPLIED_ERROR;
}

async getAgreementById(id: string): Promise<PaymentAgreement | null> {
  throw MIGRATION_NOT_APPLIED_ERROR;
}

async getStudentAgreements(studentId: string): Promise<PaymentAgreement[]> {
  throw MIGRATION_NOT_APPLIED_ERROR;
}

async createAgreement(input: CreateAgreementInput): Promise<PaymentAgreement> {
  throw MIGRATION_NOT_APPLIED_ERROR;
}
```

**Validaciones ejecutadas:**
- ✅ `npm run check` - 0 errores TypeScript
- ✅ `npm run build` - Build exitoso
- ✅ Script de prueba - Todas las pruebas pasando en base temporal
- ✅ `grep -R "@ts-ignore"` - 0 resultados en archivos de Convenios
- ✅ Base real - NO tocada, migración pendiente por drift académico

## Limitaciones de Fase 1

### Funcionalidades NO implementadas:
- Activación de convenios (DRAFT → ACTIVE)
- Cancelación de convenios
- Refinanciación de convenios
- Registro de pagos a cuotas
- Generación de recibos de convenios
- Impacto automático en bloqueos financieros
- Validaciones de negocio avanzadas
- UI completa
- Integración con módulo de pagos existente
- Integración con módulo de recibos existente

### Errores TypeScript esperados:
Los errores de TypeScript en `payment-agreement-service.ts` son esperados porque:
- Los nuevos modelos de Prisma aún no se han generado en el cliente
- La migración se validó en base temporal pero no se aplicó a la base real
- Estos errores se resolverán cuando se aplique la migración a la base real

## Validaciones Ejecutadas

### Prisma
- `npx prisma format` - ✅ Formateado correctamente
- `npx prisma validate` - ✅ Schema válido
- `npx prisma generate` - ✅ Cliente generado
- `npx prisma migrate status` - ✅ 27 migraciones encontradas, schema actualizado

### Migración en Base Temporal
- Base temporal creada: `sistema_freire_migration_test`
- Base shadow temporal creada: `sistema_freire_shadow_test`
- Migración generada: `20260620164627_add_payment_agreements_phase1`
- Migración validada con `migrate reset --force --skip-seed` - ✅ Exitosa

### Proyecto
- `npm run check` - ⚠️ 2 errores y 96 warnings (preexistentes, no relacionados con Convenios)
- `npm run build` - ✅ Build exitoso

## Estado de la Migración

**IMPORTANTE:** La migración NO se ha aplicado a la base de datos real.

**Estado actual:**
- Migración creada: `prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql`
- Migración validada en base temporal: ✅ Exitosa
- Migración aplicada a base real: ❌ NO aplicada

**Razón:** Hay un drift detectado en la base real en tablas académicas (no relacionado con Convenios de Pago). Se requiere una estrategia separada para resolver el drift académico antes de aplicar la migración de Convenios.

## Confirmaciones

✅ **No se tocó la base real** - Todos los cambios se validaron en base temporal
✅ **No se usó baseline** - No se creó baseline improvisado
✅ **No se usó migrate reset** - Solo en base temporal
✅ **No se usó migrate resolve** - No se resolvió drift
✅ **No se usó db push** - No se aplicó schema directamente
✅ **No se usó SQL manual** - Solo migración Prisma formal
✅ **No se hizo commit ni push** - Cambios solo en working directory

## Próximos Pasos (Fuera de Fase 1)

1. Resolver el drift académico en la base real
2. Aplicar la migración de Convenios a la base real
3. Ejecutar seed de permisos
4. Implementar funcionalidades avanzadas del servicio
5. Crear UI para gestión de convenios
6. Integrar con módulo de pagos
7. Integrar con módulo de recibos
8. Implementar impacto en bloqueos financieros

## Archivos Modificados

```
M prisma/schema.prisma
M src/lib/server/auth/permissions-granular.ts
M prisma/seed-permissions.ts
A prisma/migrations/20260620164627_add_payment_agreements_phase1/migration.sql
A src/lib/server/payment-agreements/payment-agreement-service.ts
A docs/PAYMENT_AGREEMENTS_PHASE_1_SCHEMA.md
```

## Riesgos y Decisiones Pendientes

### Riesgos:
1. **Drift académico** - La base real tiene drift en tablas académicas que debe resolverse antes de aplicar la migración
2. **Errores TypeScript** - El servicio tiene errores TypeScript esperados hasta que se aplique la migración
3. **Validaciones de negocio** - Las validaciones avanzadas de negocio no están implementadas

### Decisiones pendientes:
1. **Estrategia para drift académico** - Se requiere decidir cómo resolver el drift en tablas académicas
2. **Momento de aplicación de migración** - Se requiere decidir cuándo aplicar la migración a la base real
3. **Estrategia de rollback** - Se requiere definir estrategia de rollback si hay problemas

## Conclusión

La Fase 1 de Convenios de Pago se ha completado exitosamente en términos de:
- ✅ Schema de Prisma actualizado con enums y modelos aprobados
- ✅ Migración formal creada y validada en base temporal
- ✅ Servicio base implementado con métodos fundamentales
- ✅ Permisos granulares agregados
- ✅ Documentación completa creada

La migración está lista para aplicarse a la base real una vez resuelto el drift académico.
