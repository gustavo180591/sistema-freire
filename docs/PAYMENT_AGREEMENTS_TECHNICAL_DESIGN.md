# Convenios de Pago - Diseño Técnico

## 1. Diagnóstico del Estado Actual Financiero

### 1.1 Entidades Financieras Existentes

El Módulo Financiero actual (Fases 1-6) implementa:

- **StudentCharge**: Cuotas individuales con estado (PENDING, PARTIAL, PAID, CANCELLED)
- **Payment**: Pagos con asignación a cuotas vía PaymentAllocation
- **Receipt**: Recibos institucionales vinculados a pagos
- **FinancialBlock**: Bloqueos financieros por deuda vencida
- **FinancialMovement**: Historial unificado de movimientos
- **Scholarship**: Becas con aplicación automática
- **LateFee**: Recargos por mora
- **Discount**: Descuentos configurables

### 1.2 Gaps Identificados

**Falta capacidad para:**

- Negociar planes de pago personalizados
- Refinanciar deuda existente
- Establecer cuotas irregulares
- Suspender bloqueos por convenio activo
- Seguimiento específico de convenios
- Auditoría de cambios en planes de pago

**Limitaciones actuales:**

- Las cuotas son individuales y no están agrupadas en planes
- No hay concepto de "convenio" que agrupe múltiples cuotas
- Los bloqueos no consideran excepciones por convenios activos
- No hay flujo de refinanciación formal

### 1.3 Oportunidades de Integración

**Reutilizable:**

- `Payment` y `PaymentAllocation` - pueden asignarse a cuotas de convenio
- `Receipt` - pueden emitirse para pagos de convenio
- `FinancialBlock` - pueden tener excepciones por convenio
- `FinancialMovement` - pueden registrar eventos de convenio
- `AuditLog` - puede auditar todas las operaciones de convenio
- `hasPermission` - puede validar permisos granulares

**Necesario crear:**

- Entidad `PaymentAgreement` para el convenio
- Entidad `PaymentAgreementInstallment` para las cuotas del convenio
- Enum `PaymentAgreementStatus` para estados del convenio
- Relación con deuda original

---

## 2. Modelos Prisma Propuestos

### 2.1 PaymentAgreement

```prisma
model PaymentAgreement {
  id                String                        @id @default(cuid())
  agreementNumber   Int
  agreementYear     Int
  studentId         String
  studentName       String
  studentDni        String?

  // Montos y deuda
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
  reason            String
  observations      String?

  // Usuario responsable
  createdBy         String
  createdByName     String
  activatedBy       String?
  activatedByName   String?
  cancelledBy       String?
  cancelledByName   String?
  cancelledReason   String?

  // Relación con deuda original
  relatedCharges    PaymentAgreementChargeRelation[]
  installments      PaymentAgreementInstallment[]
  events            PaymentAgreementEvent[]

  // Metadatos
  metadata          Json?

  @@unique([agreementNumber, agreementYear])
  @@index([studentId])
  @@index([status])
  @@index([createdAt])
  @@map("payment_agreements")
}
```

### 2.2 PaymentAgreementInstallment

```prisma
model PaymentAgreementInstallment {
  id                String                        @id @default(cuid())
  agreementId       String
  installmentNumber Int
  dueDate           DateTime
  amount            Decimal                       @db.Decimal(12, 2)
  paidAmount        Decimal                       @default(0) @db.Decimal(12, 2)
  pendingAmount     Decimal                       @db.Decimal(12, 2)
  status            InstallmentStatus             @default(PENDING)

  // Fechas
  paidAt            DateTime?
  overdueSince      DateTime?

  // Relación con pagos
  allocations       PaymentAllocation[]

  // Metadatos
  notes             String?
  metadata          Json?

  agreement         PaymentAgreement             @relation(fields: [agreementId], references: [id], onDelete: Cascade)

  @@unique([agreementId, installmentNumber])
  @@index([agreementId])
  @@index([dueDate])
  @@index([status])
  @@map("payment_agreement_installments")
}
```

### 2.3 PaymentAgreementChargeRelation

```prisma
model PaymentAgreementChargeRelation {
  id                String                        @id @default(cuid())
  agreementId       String
  chargeId          String
  originalAmount    Decimal                       @db.Decimal(12, 2)
  includedAmount    Decimal                       @db.Decimal(12, 2)

  // Estado de la cuota original
  originalStatus    ChargeStatus
  newStatus         ChargeStatus?

  // Tipo de relación
  relationType      ChargeRelationType           @default(REFINANCED)

  agreement         PaymentAgreement             @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  charge            StudentCharge                @relation(fields: [chargeId], references: [id], onDelete: Restrict)

  @@unique([agreementId, chargeId])
  @@index([agreementId])
  @@index([chargeId])
  @@map("payment_agreement_charge_relations")
}
```

### 2.4 PaymentAgreementEvent

```prisma
model PaymentAgreementEvent {
  id                String                        @id @default(cuid())
  agreementId       String
  eventType         AgreementEventType
  description       String
  previousStatus    PaymentAgreementStatus?
  newStatus         PaymentAgreementStatus?
  metadata          Json?

  // Usuario y contexto
  userId            String
  userName          String
  createdAt         DateTime                      @default(now())

  agreement         PaymentAgreement             @relation(fields: [agreementId], references: [id], onDelete: Cascade)

  @@index([agreementId])
  @@index([eventType])
  @@index([createdAt])
  @@map("payment_agreement_events")
}
```

### 2.5 PaymentAgreementNumber

```prisma
model PaymentAgreementNumber {
  id         String   @id @default(cuid())
  year       Int      @unique
  lastNumber Int      @default(0)
  updatedAt  DateTime @updatedAt

  @@map("payment_agreement_numbers")
}
```

---

## 3. Enums Propuestos

### 3.1 PaymentAgreementStatus

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
```

### 3.2 InstallmentStatus

```prisma
enum InstallmentStatus {
  PENDING        // Pendiente - no vencida
  PARTIAL        // Parcial - pago parcial
  PAID           // Pagada - completamente pagada
  OVERDUE        // Vencida - fecha pasada y no pagada
  WAIVED         // Condonada - perdonada
}
```

### 3.3 ChargeRelationType

```prisma
enum ChargeRelationType {
  REFINANCED     // Refinanciada - cuota original reemplazada
  BLOCKED        // Bloqueada - cuota original suspendida temporalmente
  ASSOCIATED     // Asociada - cuota original referenciada pero activa
}
```

### 3.4 AgreementEventType

```prisma
enum AgreementEventType {
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
```

---

## 4. Relaciones con Entidades Existentes

### 4.1 Relación con StudentCharge

**Modelo:** `PaymentAgreementChargeRelation`

**Propósito:** Vincular el convenio con las cuotas originales que refinancia.

**Flujo:**

1. Al crear el convenio, se seleccionan las cuotas a incluir
2. Se crea una relación por cada cuota
3. Según el tipo de relación:
   - `REFINANCED`: La cuota original se marca como PAID (refinanciada)
   - `BLOCKED`: La cuota original se mantiene pero no genera bloqueos
   - `ASSOCIATED`: La cuota original permanece activa y se paga normalmente

**Impacto en deuda:**

- Si `REFINANCED`: La deuda original se considera "resuelta" por el convenio
- Si `BLOCKED`: La deuda original no cuenta para bloqueos pero sigue existiendo
- Si `ASSOCIATED`: La deuda original se paga normalmente, el convenio es solo informativo

### 4.2 Relación con Payment y PaymentAllocation

**Reutilización:** Se usa `Payment` y `PaymentAllocation` existentes.

**Modificación necesaria:** `PaymentAllocation` necesita poder referenciar `PaymentAgreementInstallment`.

**Propuesta:** Agregar campo opcional a `PaymentAllocation`:

```prisma
model PaymentAllocation {
  paymentId String
  chargeId  String
  installmentId String?  // NUEVO: opcional, referencia a cuota de convenio
  amount    Decimal       @db.Decimal(12, 2)

  charge    StudentCharge @relation(fields: [chargeId], references: [id], onDelete: Restrict)
  payment   Payment       @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  installment PaymentAgreementInstallment? @relation(fields: [installmentId], references: [id], onDelete: Restrict) // NUEVO

  @@id([paymentId, chargeId])
  @@unique([paymentId, installmentId]) // NUEVO: índice único para pagos a convenio
  @@map("payment_allocations")
}
```

**Validación:** Un pago no puede asignarse simultáneamente a una cuota original y a una cuota de convenio.

### 4.3 Relación con Receipt

**Reutilización:** Se usa `Receipt` existente.

**Modificación:** `Receipt` necesita indicar si corresponde a un convenio.

**Propuesta:** Agregar campo opcional a `Receipt`:

```prisma
model Receipt {
  // ... campos existentes ...
  agreementId String?  // NUEVO: opcional, referencia al convenio
  agreementNumber Int?  // NUEVO: número de convenio para mostrar en recibo

  agreement PaymentAgreement? @relation(fields: [agreementId], references: [id], onDelete: SetNull) // NUEVO

  @@index([agreementId]) // NUEVO
}
```

**Impacto:** Al emitir recibo de pago de convenio, se vincula al convenio para trazabilidad.

### 4.4 Relación con FinancialBlock

**Reutilización:** Se usa `FinancialBlock` existente.

**Integración:**

- Un convenio activo y al día puede generar excepción automática
- Un convenio vencido/incumplido puede reactivar bloqueos

**Propuesta:** Agregar campo para indicar origen de excepción:

```prisma
model FinancialBlock {
  // ... campos existentes ...
  exceptionSource String?  // NUEVO: 'MANUAL', 'PAYMENT_AGREEMENT'
  exceptionAgreementId String?  // NUEVO: referencia al convenio que genera la excepción

  @@index([exceptionSource]) // NUEVO
  @@index([exceptionAgreementId]) // NUEVO
}
```

**Flujo:**

1. Al activar un convenio, se crea excepción automática si corresponde
2. Al vencer cuotas, se evalúa si debe reactivar bloqueos
3. Al cancelar el convenio, se revocan excepciones automáticas

### 4.5 Relación con FinancialMovement

**Reutilización:** Se usa `FinancialMovement` existente.

**Nuevo tipo de movimiento:** Agregar a `FinancialMovementType`:

```prisma
enum FinancialMovementType {
  // ... tipos existentes ...
  PAYMENT_AGREEMENT  // NUEVO: creación/modificación de convenio
  AGREEMENT_INSTALLMENT // NUEVO: cuota de convenio
}
```

**Propósito:** Registrar eventos de convenio en el historial financiero unificado.

### 4.6 Relación con AuditLog

**Reutilización:** Se usa `AuditLog` existente.

**Nueva entidad:** `PAYMENT_AGREEMENT`

**Propósito:** Auditar todas las operaciones de convenio.

**Eventos a auditar:**

- CREATE: Creación de convenio
- ACTIVATE: Activación de convenio
- UPDATE: Modificación de convenio
- DELETE: Cancelación de convenio
- PAYMENT: Pago de cuota
- DEFAULT: Incumplimiento
- REFINANCE: Refinanciación

---

## 5. Reglas de Negocio

### 5.1 Reglas de Creación

**Requisitos:**

- El alumno debe tener deuda vencida o pendiente
- El monto acordado debe ser mayor o igual a la deuda seleccionada
- El plan de cuotas debe sumar exactamente el monto acordado
- Las fechas de vencimiento deben ser futuras
- Debe haber al menos 2 cuotas (si no, es un pago normal)

**Validaciones:**

- No se puede crear convenio para deuda ya refinanciada
- No se puede crear convenio para deuda cancelada
- El usuario debe tener permiso `PAYMENT_AGREEMENT:create`

**Estado inicial:** DRAFT

### 5.2 Reglas de Activación

**Transición:** DRAFT → ACTIVE

**Requisitos:**

- El convenio debe tener al menos 2 cuotas
- La suma de cuotas debe coincidir con el monto acordado
- La deuda original debe estar bloqueada o refinanciada

**Acciones al activar:**

- Cambiar estado de cuotas originales según tipo de relación
- Crear excepción de bloqueo si corresponde
- Registrar evento de activación
- Generar FinancialMovement

**Usuario:** Debe tener permiso `PAYMENT_AGREEMENT:update`

### 5.3 Reglas de Pagos

**Aplicación de pagos:**

- Los pagos se asignan a cuotas de convenio vía PaymentAllocation
- Se priorizan cuotas vencidas sobre cuotas futuras
- Si el pago excede la cuota, el excedente va a la siguiente cuota

**Estado de cuotas:**

- Pago parcial: PARTIAL
- Pago completo: PAID
- Sin pago y fecha pasada: OVERDUE

**Actualización del convenio:**

- `paidAmount` se incrementa con cada pago
- `pendingAmount` se decrementa
- Si todas las cuotas están PAID: ACTIVE → COMPLETED

**Emisión de recibos:**

- Los pagos de convenio generan recibos normales
- El recibo indica el número de convenio y cuota

### 5.4 Reglas de Incumplimiento

**Definición de incumplimiento:**

- Más de N cuotas vencidas (configurable)
- O más de X días desde la primera cuota vencida (configurable)

**Transición:** ACTIVE → DEFAULTED

**Acciones al incumplir:**

- Cambiar estado del convenio
- Reactivar bloqueos financieros
- Registrar evento de incumplimiento
- Generar FinancialMovement
- Notificar al usuario

**Recuperación:**

- Si se ponen al día las cuotas vencidas: DEFAULTED → ACTIVE
- Si se refinancia: DEFAULTED → REFINANCED

### 5.5 Reglas de Cancelación

**Transición:** Cualquier → CANCELLED

**Requisitos:**

- Solo se puede cancelar si no hay pagos asociados
- O si se autoriza explícitamente (requiere permiso elevado)

**Acciones al cancelar:**

- Reactivar cuotas originales si estaban refinanciadas
- Reactivar bloqueos si había excepciones
- Registrar evento de cancelación
- Generar FinancialMovement

**Usuario:** Debe tener permiso `PAYMENT_AGREEMENT:delete`

### 5.6 Reglas de Refinanciación

**Transición:** Cualquier → REFINANCED

**Requisitos:**

- Debe existir un nuevo convenio que reemplace este
- El nuevo convenio debe referenciar al anterior

**Acciones al refinanciar:**

- Marcar convenio anterior como REFINANCED
- Vincular nuevo convenio con anterior
- Transferir excepciones de bloqueo
- Registrar evento de refinanciación

**Usuario:** Debe tener permiso `PAYMENT_AGREEMENT:create` y `PAYMENT_AGREEMENT:update`

---

## 6. Flujo de Creación

### 6.1 Paso 1: Selección de Deuda

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

1. Buscar alumno
2. Ver deuda actual (cuotas vencidas y pendientes)
3. Seleccionar cuotas a incluir en el convenio
4. Ver monto total de deuda seleccionada

**Validación:**

- Alumno debe tener deuda seleccionable
- Cuotas no pueden estar ya refinanciadas

### 6.2 Paso 2: Definición del Convenio

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

1. Ingresar motivo del convenio
2. Ingresar observaciones (opcional)
3. Definir monto acordado (puede incluir descuentos/condonaciones)
4. Seleccionar tipo de relación con deuda original

**Validación:**

- Monto acordado >= deuda seleccionada (si no hay condonación)
- Monto acordado puede ser < deuda seleccionada si hay condonación (requiere autorización)

### 6.3 Paso 3: Definición del Plan de Cuotas

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

1. Definir cantidad de cuotas
2. Definir fechas de vencimiento (pueden ser irregulares)
3. Definir montos por cuota (pueden ser irregulares)
4. Validar que la suma coincida con el monto acordado

**Validación:**

- Suma de cuotas == monto acordado
- Fechas de vencimiento futuras
- Al menos 2 cuotas

### 6.4 Paso 4: Confirmación

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

1. Revisar resumen del convenio
2. Confirmar creación

**Resultado:**

- Convenio creado en estado DRAFT
- Cuotas creadas pero no activas
- Relaciones con deuda original creadas
- Evento de creación registrado

---

## 7. Flujo de Pagos

### 7.1 Pago Normal

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

1. Registrar pago normalmente
2. Seleccionar cuota de convenio como destino
3. Sistema asigna pago a cuota

**Resultado:**

- Payment creado
- PaymentAllocation vinculado a cuota de convenio
- Cuota actualizada (PARTIAL o PAID)
- Convenio actualizado (paidAmount, pendingAmount)
- Si todas las cuotas pagadas: ACTIVE → COMPLETED
- Recibo emitido con referencia al convenio

### 7.2 Pago Automático

**Usuario:** Sistema (no implementado en Fase 1)

**Acción:**

- Si hay débito automático configurado
- Sistema procesa pago en fecha de vencimiento

**Resultado:** Igual que pago normal

### 7.3 Pago Parcial

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

- Registrar pago menor al monto de la cuota

**Resultado:**

- Cuota en estado PARTIAL
- Restante sigue pendiente
- Siguiente pago se aplica al restante

---

## 8. Flujo de Incumplimiento

### 8.1 Detección

**Usuario:** Sistema (job nocturno)

**Acción:**

1. Revisar convenios activos
2. Identificar cuotas vencidas
3. Evaluar criterios de incumplimiento:
   - Más de N cuotas vencidas
   - O más de X días desde primera vencida

**Resultado:**

- Si cumple criterios: ACTIVE → DEFAULTED
- Reactivar bloqueos financieros
- Notificar usuario

### 8.2 Recuperación

**Usuario:** FINANZAS o DIRECTOR

**Acción:**

- Pagar cuotas vencidas
- O refinanciar deuda

**Resultado:**

- Si se ponen al día: DEFAULTED → ACTIVE
- Si se refinancia: DEFAULTED → REFINANCED

---

## 9. Impacto en Deuda y Bloqueos

### 9.1 Impacto en Deuda

**Cálculo de deuda:**

- Si cuota está `REFINANCED`: No cuenta como deuda pendiente
- Si cuota está `BLOCKED`: Cuenta como deuda pero no genera bloqueos
- Si cuota está `ASSOCIATED`: Cuenta como deuda normal

**Deuda del convenio:**

- Se calcula como suma de cuotas pendientes
- Se muestra separada de deuda original
- Se incluye en reportes financieros

### 9.2 Impacto en Bloqueos

**Excepción automática:**

- Al activar convenio: Crear excepción para `FinancialBlock`
- Tipo de excepción: `PAYMENT_AGREEMENT`
- Referencia al convenio

**Reactivación:**

- Al incumplir: Revocar excepción, reactivar bloqueos
- Al cancelar: Revocar excepción, reactivar bloqueos

**Validación:**

- No mezclar excepciones manuales con automáticas
- Distingir origen en `exceptionSource`

---

## 10. Permisos

### 10.1 Entidad: PAYMENT_AGREEMENT

**SUPERADMIN:**

- canCreate: true
- canRead: true
- canUpdate: true
- canDelete: true

**DIRECTOR:**

- canCreate: true
- canRead: true
- canUpdate: true
- canDelete: true

**FINANZAS:**

- canCreate: true
- canRead: true
- canUpdate: true
- canDelete: false

**SECRETARIA:**

- canCreate: false
- canRead: true
- canUpdate: false
- canDelete: false

**ALUMNO:**

- canCreate: false
- canRead: true (solo propios)
- canUpdate: false
- canDelete: false

### 10.2 Validación de Ownership

**Para ALUMNO:**

- Solo puede ver sus propios convenios
- Se valida en el server: `studentId === locals.user.studentId`

**Para otros roles:**

- Pueden ver todos los convenios
- No hay restricción de ownership

---

## 11. Rutas Propuestas

### 11.1 Listado de Convenios

**Ruta:** `/finanzas/convenios`

**Permisos:** `PAYMENT_AGREEMENT:read`

**Funcionalidad:**

- Listar todos los convenios
- Filtros: estado, alumno, fecha
- Acciones: ver detalle, crear nuevo

### 11.2 Detalle de Convenio

**Ruta:** `/finanzas/convenios/[id]`

**Permisos:** `PAYMENT_AGREEMENT:read` + ownership si es alumno

**Funcionalidad:**

- Ver datos del convenio
- Ver cuotas y estados
- Ver pagos realizados
- Ver historial de eventos
- Acciones: activar, modificar, cancelar, refinanciar

### 11.3 Crear Convenio

**Ruta:** `/finanzas/convenios/nuevo`

**Permisos:** `PAYMENT_AGREEMENT:create`

**Funcionalidad:**

- Seleccionar alumno
- Seleccionar deuda
- Definir convenio
- Definir plan de cuotas
- Confirmar

### 11.4 Mis Convenios (Alumno)

**Ruta:** `/alumno/convenios`

**Permisos:** Solo para alumnos

**Funcionalidad:**

- Ver solo sus propios convenios
- Ver estado y cuotas
- Ver próximos vencimientos

---

## 12. Métodos Propuestos para PaymentAgreementService

### 12.1 Gestión de Convenios

```typescript
// Crear convenio en borrador
async createAgreement(input: AgreementInput): Promise<AgreementResult>

// Activar convenio
async activateAgreement(agreementId: string, userId: string): Promise<void>

// Modificar convenio (solo en DRAFT)
async modifyAgreement(agreementId: string, input: AgreementInput, userId: string): Promise<void>

// Cancelar convenio
async cancelAgreement(agreementId: string, reason: string, userId: string): Promise<void>

// Refinanciar convenio
async refinanceAgreement(agreementId: string, newAgreementId: string, userId: string): Promise<void>

// Obtener convenio
async getAgreement(agreementId: string, userId: string): Promise<Agreement | null>

// Listar convenios
async listAgreements(filters: AgreementFilters): Promise<Agreement[]>

// Obtener convenios de alumno
async getStudentAgreements(studentId: string, userId: string): Promise<Agreement[]>
```

### 12.2 Gestión de Cuotas

```typescript
// Crear cuotas de convenio
async createInstallments(agreementId: string, installments: InstallmentInput[]): Promise<void>

// Obtener cuotas de convenio
async getInstallments(agreementId: string): Promise<Installment[]>

// Actualizar estado de cuota
async updateInstallmentStatus(installmentId: string, status: InstallmentStatus): Promise<void>

// Validar plan de cuotas
async validateInstallmentPlan(agreementId: string): Promise<boolean>
```

### 12.3 Gestión de Pagos

```typescript
// Aplicar pago a cuota de convenio
async applyPaymentToInstallment(paymentId: string, installmentId: string, amount: Decimal): Promise<void>

// Obtener pagos de convenio
async getAgreementPayments(agreementId: string): Promise<Payment[]>

// Calcular progreso del convenio
async calculateAgreementProgress(agreementId: string): Promise<AgreementProgress>
```

### 12.4 Gestión de Estado

```typescript
// Evaluar incumplimiento
async evaluateDefault(agreementId: string): Promise<boolean>

// Cambiar estado de convenio
async changeAgreementStatus(agreementId: string, newStatus: PaymentAgreementStatus, reason: string, userId: string): Promise<void>

// Verificar si puede activar
async canActivate(agreementId: string): Promise<boolean>
```

### 12.5 Integración con Bloqueos

```typescript
// Crear excepción de bloqueo por convenio
async createBlockException(agreementId: string, userId: string): Promise<void>

// Revocar excepción de bloqueo por convenio
async revokeBlockException(agreementId: string, userId: string): Promise<void>

// Evaluar impacto en bloqueos
async evaluateBlockImpact(agreementId: string): Promise<BlockImpact>
```

### 12.6 Relación con Deuda Original

```typescript
// Vincular cuotas originales
async linkOriginalCharges(agreementId: string, chargeIds: string[], relationType: ChargeRelationType): Promise<void>

// Actualizar estado de cuotas originales
async updateOriginalChargesStatus(agreementId: string, newStatus: ChargeStatus): Promise<void>

// Obtener deuda original relacionada
async getRelatedCharges(agreementId: string): Promise<StudentCharge[]>
```

---

## 13. Plan por Fases

### Fase 1: Schema y Servicio Base

**Objetivo:** Implementar modelos y servicio básico

**Tareas:**

- Crear migración con nuevos modelos
- Crear PaymentAgreementService con métodos CRUD
- Implementar validaciones básicas
- Registrar auditoría

**Criterios de cierre:**

- Schema actualizado
- Servicio funcional
- Auditoría funcionando
- Pruebas básicas pasando

### Fase 2: Creación y Activación de Convenios

**Objetivo:** Implementar flujo completo de creación

**Tareas:**

- UI para crear convenios
- Selección de deuda
- Definición de plan de cuotas
- Validación de totales
- Activación de convenios
- Relación con deuda original

**Criterios de cierre:**

- UI funcional
- Creación y activación funcionando
- Relación con deuda establecida
- Pruebas pasando

### Fase 3: Pagos y Seguimiento

**Objetivo:** Integrar pagos con convenios

**Tareas:**

- Modificar PaymentAllocation para aceptar cuotas de convenio
- Integrar pagos con cuotas de convenio
- Implementar cálculo de progreso
- UI de seguimiento
- Emisión de recibos con referencia a convenio

**Criterios de cierre:**

- Pagos aplicándose a convenios
- Seguimiento funcionando
- Recibos emitidos correctamente
- Pruebas pasando

### Fase 4: Incumplimiento y Bloqueos

**Objetivo:** Implementar detección de incumplimiento e integración con bloqueos

**Tareas:**

- Implementar evaluación de incumplimiento
- Integrar con FinancialBlock
- Crear excepciones automáticas
- Reactivar bloqueos al incumplir
- UI de gestión de incumplimiento

**Criterios de cierre:**

- Incumplimiento detectado
- Bloqueos integrados
- Excepciones funcionando
- Pruebas pasando

### Fase 5: Refinanciación y Cancelación

**Objetivo:** Implementar refinanciación y cancelación

**Tareas:**

- Implementar flujo de refinanciación
- Implementar cancelación de convenios
- Reactivar deuda original
- Reactivar bloqueos
- UI de refinanciación y cancelación

**Criterios de cierre:**

- Refinanciación funcionando
- Cancelación funcionando
- Deuda original reactivada
- Pruebas pasando

### Fase 6: Reportes y Auditoría

**Objetivo:** Implementar reportes específicos de convenios

**Tareas:**

- Reporte de convenios activos
- Reporte de convenios vencidos
- Reporte de cumplimiento
- Exportación CSV
- Auditoría completa
- Documentación

**Criterios de cierre:**

- Reportes funcionando
- Auditoría completa
- Documentación actualizada
- Pruebas pasando

---

## 14. Riesgos Técnicos

### 14.1 Riesgo: Duplicación de Deuda

**Descripción:** Riesgo de que la deuda original y el convenio se cuenten doble.

**Mitigación:**

- Usar `PaymentAgreementChargeRelation` para vincular explícitamente
- Cambiar estado de cuotas originales según tipo de relación
- Validar en cálculo de deuda que no se duplique

### 14.2 Riesgo: Doble Imputación de Pagos

**Descripción:** Riesgo de que un pago se asigne a cuota original y a cuota de convenio.

**Mitigación:**

- Agregar índice único en PaymentAllocation
- Validar que un pago no tenga chargeId y installmentId simultáneamente
- Implementar validación en FinancialService

### 14.3 Riesgo: Inconsistencia en Bloqueos

**Descripción:** Riesgo de que las excepciones de bloqueo por convenio se mezclen con manuales.

**Mitigación:**

- Agregar campo `exceptionSource` en FinancialBlock
- Distinguir origen en todas las operaciones
- Implementar lógica separada para cada tipo

### 14.4 Riesgo: Complejidad de Refinanciación

**Descripción:** Riesgo de que la refinanciación de convenios sea compleja y propensa a errores.

**Mitigación:**

- Implementar refinanciación como fase separada
- Validar que el nuevo convenio reemplace completamente al anterior
- Mantener trazabilidad entre convenios

### 14.5 Riesgo: Performance

**Descripción:** Riesgo de que las consultas de convenios sean lentas con muchos datos.

**Mitigación:**

- Agregar índices apropiados
- Implementar paginación en listados
- Optimizar consultas con Prisma

---

## 15. Validaciones Necesarias

### 15.1 Validaciones de Creación

- Alumno tiene deuda seleccionable
- Monto acordado >= deuda seleccionada (o autorización para condonación)
- Suma de cuotas == monto acordado
- Fechas de vencimiento futuras
- Al menos 2 cuotas
- Usuario tiene permiso `PAYMENT_AGREEMENT:create`

### 15.2 Validaciones de Activación

- Convenio está en estado DRAFT
- Al menos 2 cuotas definidas
- Suma de cuotas coincide con monto acordado
- Deuda original vinculada
- Usuario tiene permiso `PAYMENT_AGREEMENT:update`

### 15.3 Validaciones de Pagos

- Pago no excede monto de cuota
- Pago no está ya asignado a otra cuota
- Cuota está en estado PENDING o PARTIAL
- Usuario tiene permiso `PAYMENT:create`

### 15.4 Validaciones de Cancelación

- Convenio no tiene pagos (o autorización explícita)
- Usuario tiene permiso `PAYMENT_AGREEMENT:delete`

### 15.5 Validaciones de Refinanciación

- Convenio anterior existe
- Nuevo convenio está activo
- Usuario tiene permiso `PAYMENT_AGREEMENT:create` y `PAYMENT_AGREEMENT:update`

### 15.6 Validaciones de Ownership

- Si es alumno: solo puede ver sus propios convenios
- Si es otro rol: puede ver todos

---

## 16. Consideraciones Adicionales

### 16.1 Números de Convenio

- Similar a recibos: número secuencial por año
- Tabla `PaymentAgreementNumber` para tracking
- Formato: `YYYY-NNNN`

### 16.2 Configuración

- Parámetros configurables:
  - Días de gracia para incumplimiento
  - Cantidad de cuotas vencidas para incumplimiento
  - Monto mínimo para condonación
- Usar `FinancialConfig` para almacenar

### 16.3 Notificaciones

- No implementado en Fase 1
- Futuro: notificar al alumno cuando:
  - Convenio se active
  - Cuota venza
  - Convenio entre en incumplimiento

### 16.4 Integración con UI Existente

- Reutilizar componentes de pagos
- Reutilizar componentes de deuda
- Agregar sección específica de convenios en `/finanzas`

---

## 17. Conclusión

El diseño técnico propuesto:

- **Reutiliza** entidades existentes (Payment, Receipt, FinancialBlock, FinancialMovement, AuditLog)
- **Extiende** el schema con modelos específicos para convenios
- **Mantiene** trazabilidad con deuda original
- **Integra** con bloqueos financieros
- **Implementa** auditoría completa
- **Respecta** permisos granulares
- **Define** un plan por fases claro
- **Identifica** riesgos y mitigaciones

**Próximo paso:** Revisión y aprobación del diseño antes de implementar migraciones y código.
