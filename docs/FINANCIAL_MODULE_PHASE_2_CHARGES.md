# Fase 2: Generación de Cuotas - Módulo Financiero

## Resumen

La Fase 2 del Módulo Financiero implementa la generación de cuotas individuales y masivas, con aplicación automática de becas y descuentos, validaciones robustas, auditoría completa y prevención de duplicados.

## Alcance

Esta fase cubre exclusivamente:

1. **Generación individual de cuotas** - `createCharge()`
2. **Generación masiva de cuotas** - `createBulkCharges()`
3. **Aplicación de becas** - `applyScholarshipToCharge()`
4. **Aplicación de descuentos** - `applyDiscountToCharge()`
5. **Validaciones backend** - Alumnos, conceptos, ciclos lectivos, montos, permisos
6. **Permisos granulares** - Roles SUPERADMIN, DIRECTOR, SECRETARIA, FINANZAS
7. **Routes/actions** - `/finanzas/cuotas` con acciones para generación
8. **Pruebas funcionales** - Script completo de pruebas
9. **Auditoría real** - Registros en `AuditLog` con metadata completo
10. **Documentación** - Este documento

## Implementación

### 1. Servicio Financiero (`financial-service.ts`)

#### createCharge()

**Responsabilidades:**
- Validar permisos del usuario (rol FINANZAS, DIRECTOR, SUPERADMIN)
- Validar alumno existente y activo
- Validar concepto existente y activo
- Validar ciclo lectivo existente y activo
- Validar monto positivo
- Validar período no vacío
- Prevenir duplicados usando constraint `@@unique([studentId, conceptId, periodLabel, academicTermId])`
- Calcular becas automáticamente (si `autoApply: true`)
- Calcular descuentos automáticamente (si aplican al concepto)
- Calcular monto final: `monto base - beca - descuento`
- Crear cuota en transacción atómica
- Crear movimiento financiero tipo `CHARGE`
- Actualizar contadores de becas aplicadas
- Registrar auditoría con metadata completo

**Orden de cálculo:**
1. Monto base (input)
2. Beca (porcentaje del monto base)
3. Descuento (porcentaje o fijo sobre monto base)
4. Monto final = monto base - beca - descuento

**Validaciones:**
- Permisos: `STUDENT_CHARGE` + `create`
- Alumno: debe existir y estar `ACTIVE`
- Concepto: debe existir y estar `active: true`
- Ciclo lectivo: debe existir y estar `active: true`
- Monto: debe ser positivo (no negativo)
- Período: no puede estar vacío
- Duplicado: verifica constraint antes de insertar

**Transacción:**
- Obtiene balance actual del alumno
- Crea `StudentCharge` con todos los campos calculados
- Crea `FinancialMovement` tipo `CHARGE`
- Actualiza `Scholarship.appliedAmount` y `lastAppliedAt`
- Todo en una transacción atómica

**Auditoría:**
- Action: `CREATE`
- EntityType: `StudentCharge`
- Metadata: studentId, studentName, conceptId, conceptName, periodLabel, academicTermId, baseAmount, scholarshipApplied, discountApplied, finalAmount

#### createBulkCharges()

**Responsabilidades:**
- Validar permisos del usuario
- Validar que todos los inputs tengan el mismo userId
- Validación previa completa antes de escribir (no crear nada si hay errores)
- Reporte detallado de errores por alumno
- Generación en transacción atómica (si una falla, ninguna se crea)
- Auditoría de generación masiva con lista de IDs

**Validación previa:**
Para cada input:
- Alumno existe y está activo
- Concepto existe y está activo
- Ciclo lectivo existe y está activo
- Monto positivo
- Período no vacío
- No existe duplicado

**Transacción:**
- Llama a `createCharge()` para cada input válido
- Si alguno falla, toda la transacción hace rollback
- Retorna array de `ChargeResult`

**Auditoría:**
- Action: `CREATE`
- EntityType: `StudentCharge`
- Description: "Generó N cuotas en masa"
- Metadata: totalCharges, chargeIds

#### applyScholarshipToCharge()

**Responsabilidades:**
- Validar cuota existente
- Validar beca existente, activa y pertenece al alumno
- Validar permisos del usuario
- Verificar saldo suficiente en beca (si `maxMonthlyAmount`)
- Recalcular descuentos existentes
- Calcular nuevo monto final
- Actualizar cuota y beca en transacción
- Crear movimiento financiero tipo `SCHOLARSHIP`
- Registrar auditoría

**Transacción:**
- Recalcula descuentos aplicables
- Actualiza `StudentCharge.scholarshipApplied` y `finalAmount`
- Actualiza `Scholarship.appliedAmount` y `lastAppliedAt`
- Crea `FinancialMovement` tipo `SCHOLARSHIP`

#### applyDiscountToCharge()

**Responsabilidades:**
- Validar cuota existente
- Validar descuento existente, activo, vigente y aplicable
- Validar permisos del usuario
- Calcular descuento (porcentaje o fijo)
- Calcular nuevo monto final
- Actualizar cuota en transacción
- Crear movimiento financiero tipo `DISCOUNT`
- Registrar auditoría

**Transacción:**
- Actualiza `StudentCharge.discountApplied` y `finalAmount`
- Crea `FinancialMovement` tipo `DISCOUNT`

#### getPendingCharges()

**Responsabilidades:**
- Retornar cuotas pendientes de un alumno
- Incluir concepto y ciclo lectivo
- Ordenar por fecha de vencimiento

#### getActiveScholarships()

**Responsabilidades:**
- Retornar becas activas de un alumno
- Filtrar por `active: true` y vigencia temporal
- Ordenar por fecha de creación descendente

#### getActiveDiscounts()

**Responsabilidades:**
- Retornar descuentos activos globalmente
- Filtrar por `active: true` y vigencia temporal
- Ordenar por prioridad descendente

### 2. Routes/Actions (`/finanzas/cuotas/+page.server.ts`)

#### Load Function

Carga datos necesarios para el formulario:
- Alumnos activos (filtrados por ubicación permitida)
- Conceptos de cuota activos
- Ciclos lectivos activos
- Últimas 50 cuotas creadas (para visualización)

#### Actions

**createCharge:**
- Recibe datos del formulario
- Valida campos requeridos
- Delega en `financialService.createCharge()`
- Retorna ID de cuota creada o error

**createBulkCharges:**
- Recibe array de studentIds
- Valida campos requeridos
- Convierte montos a `Decimal`
- Delega en `financialService.createBulkCharges()`
- Retorna cantidad de cuotas creadas o error

### 3. Permisos

#### Entidad: `STUDENT_CHARGE`

**Roles con permisos:**

- **SUPERADMIN**: create, read, update, delete (todos)
- **DIRECTOR**: create, read, update, delete (todos)
- **FINANZAS**: create, read, update (no delete)
- **SECRETARIA**: read (solo lectura)
- **DOCENTE**: read (solo lectura)
- **PRECEPTOR**: read (solo lectura)
- **ALUMNO**: read (solo sus propios datos)

**Validación en código:**
```typescript
const userRoles = await prisma.userRole.findMany({
  where: { userId: input.userId },
  include: { role: true }
});
const roleCodes = userRoles.map(ur => ur.role.code);
const hasPermissionResult = await hasPermission(
  roleCodes[0] || '',
  'STUDENT_CHARGE',
  'create'
);
```

### 4. Pruebas Funcionales

Script: `scripts/test-financial-charge-generation.ts`

#### Tests implementados:

1. **testCreateCharge()**
   - Crea cuota individual
   - Verifica campos calculados (becas, descuentos, monto final)
   - Verifica movimiento financiero creado
   - Verifica balance antes/después

2. **testDuplicatePrevention()**
   - Crea cuota
   - Intenta crear duplicado
   - Verifica que se prevenga correctamente

3. **testBulkCharges()**
   - Crea cuotas masivas para múltiples alumnos
   - Verifica cantidad de cuotas creadas
   - Verifica movimientos financieros por cuota

4. **testBulkChargesRollback()**
   - Intenta crear cuotas con alumno inválido
   - Verifica validación previa
   - Verifica que no se creen cuotas (rollback)

5. **testScholarshipApplication()**
   - Crea cuota con beca activa
   - Verifica cálculo de beca (50%)
   - Verifica monto final correcto

6. **testDiscountApplication()**
   - Desactiva beca temporalmente
   - Crea cuota con descuento
   - Verifica cálculo de descuento (10%)
   - Verifica monto final correcto

7. **testAuditLog()**
   - Limpia auditoría previa
   - Crea cuota
   - Verifica registro en `AuditLog`
   - Verifica metadata completo

8. **testInvalidStudent()**
   - Intenta crear cuota con alumno inválido
   - Verifica validación

9. **testNegativeAmount()**
   - Intenta crear cuota con monto negativo
   - Verifica validación

### 5. Auditoría

#### Registros creados

**Generación individual:**
```typescript
{
  action: 'CREATE',
  entityType: 'StudentCharge',
  entityId: chargeId,
  description: 'Creó cuota para alumno {nombre}: {concepto} - {período}',
  userId: userId,
  metadata: {
    studentId,
    studentName,
    conceptId,
    conceptName,
    periodLabel,
    academicTermId,
    baseAmount,
    scholarshipApplied,
    discountApplied,
    finalAmount
  }
}
```

**Generación masiva:**
```typescript
{
  action: 'CREATE',
  entityType: 'StudentCharge',
  description: 'Generó N cuotas en masa',
  userId: userId,
  metadata: {
    totalCharges: N,
    chargeIds: [id1, id2, ...]
  }
}
```

**Aplicación de beca:**
```typescript
{
  action: 'UPDATE',
  entityType: 'StudentCharge',
  entityId: chargeId,
  description: 'Aplicó beca {nombre} a cuota de alumno {nombre}',
  userId: userId,
  metadata: {
    chargeId,
    scholarshipId,
    scholarshipName,
    scholarshipPercentage,
    scholarshipApplied,
    finalAmount
  }
}
```

**Aplicación de descuento:**
```typescript
{
  action: 'UPDATE',
  entityType: 'StudentCharge',
  entityId: chargeId,
  description: 'Aplicó descuento {nombre} a cuota de alumno {nombre}',
  userId: userId,
  metadata: {
    chargeId,
    discountId,
    discountName,
    discountType,
    discountValue,
    discountApplied,
    finalAmount
  }
}
```

### 6. Decimal Strategy

**Persistencia:**
- Todos los montos usan `Decimal` de `@prisma/client/runtime/library`
- No se persisten montos como `number`
- Helpers de `decimal-helpers.ts` para cálculos seguros

**Cálculos:**
- Porcentajes: `DecimalHelpers.percentage(value, percent)`
- Suma: `DecimalHelpers.add(a, b)`
- Resta: `DecimalHelpers.subtract(a, b)`
- Comparaciones: `DecimalHelpers.isGreaterThan()`, `isLessThan()`, `equals()`

### 7. Prevención de Duplicados

**Constraint de base de datos:**
```prisma
@@unique([studentId, conceptId, periodLabel, academicTermId])
```

**Validación previa en código:**
```typescript
const existingCharge = await client.studentCharge.findUnique({
  where: {
    studentId_conceptId_periodLabel_academicTermId: {
      studentId: input.studentId,
      conceptId: input.conceptId,
      periodLabel: input.periodLabel,
      academicTermId: input.academicTermId
    }
  }
});
if (existingCharge) {
  throw new Error('Ya existe una cuota para este alumno, concepto y período');
}
```

**Doble protección:**
1. Validación previa (mejor UX, mensaje claro)
2. Constraint de DB (garantía de integridad)

### 8. Transacción Atómica

**En createCharge():**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Obtener balance actual
  // 2. Crear StudentCharge
  // 3. Crear FinancialMovement
  // 4. Actualizar Scholarship
  // Si algo falla, todo hace rollback
});
```

**En createBulkCharges():**
```typescript
await prisma.$transaction(async (tx) => {
  for (const input of validInputs) {
    await this.createCharge(input, tx);
  }
  // Si una falla, ninguna se crea
});
```

### 9. Archivos Modificados/Creados

**Modificados:**
- `src/lib/server/financial/financial-service.ts` - Implementación completa de Fase 2

**Creados:**
- `src/routes/(app)/finanzas/cuotas/+page.server.ts` - Routes/actions para generación
- `scripts/test-financial-charge-generation.ts` - Pruebas funcionales
- `docs/FINANCIAL_MODULE_PHASE_2_CHARGES.md` - Este documento

## Flujo de Generación Individual

```
Usuario → Formulario → Action createCharge
                ↓
        financialService.createCharge()
                ↓
    Validar permisos (hasPermission)
                ↓
    Validar alumno (existente, activo)
                ↓
    Validar concepto (existente, activo)
                ↓
    Validar ciclo lectivo (existente, activo)
                ↓
    Validar monto (positivo)
                ↓
    Validar período (no vacío)
                ↓
    Verificar duplicado (constraint)
                ↓
    Calcular becas (autoApply)
                ↓
    Calcular descuentos (aplicables)
                ↓
    Calcular monto final
                ↓
    Transacción atómica:
        - Crear StudentCharge
        - Crear FinancialMovement (CHARGE)
        - Actualizar Scholarship
                ↓
    Registrar auditoría (AuditLog)
                ↓
    Retornar ChargeResult
```

## Flujo de Generación Masiva

```
Usuario → Formulario → Action createBulkCharges
                ↓
        financialService.createBulkCharges()
                ↓
    Validar permisos
                ↓
    Validar userId consistente
                ↓
    Validación previa (todos los inputs):
        - Alumno existente y activo
        - Concepto existente y activo
        - Ciclo lectivo existente y activo
        - Monto positivo
        - Período no vacío
        - Sin duplicados
                ↓
    Si hay errores → Reportar y abortar
                ↓
    Transacción atómica:
        for (input of validInputs) {
            createCharge(input, tx)
        }
                ↓
    Registrar auditoría masiva
                ↓
    Retornar ChargeResult[]
```

## Cálculo de Becas/Descuentos

### Regla Final de Becas

**Orden de cálculo:**
1. Monto base (input del usuario)
2. Beca (porcentaje del monto base)
3. Descuento (porcentaje o fijo del monto base)
4. Monto final = monto base - beca - descuento

**Validaciones de becas:**
- La beca individual no puede superar el monto base de la cuota
- El total de becas no puede superar el monto base de la cuota
- Si la beca tiene `maxMonthlyAmount`, se calcula cuánto se aplicó en el mes actual (cuotas creadas en el mes) y se limita al saldo disponible
- Si el límite mensual se alcanza, se rechaza la aplicación de la beca con error explícito

**Fórmula:**
```
beca_individual = monto_base * (porcentaje_beca / 100)
si maxMonthlyAmount existe:
  aplicado_mes_actual = suma(scholarshipApplied de cuotas del mes)
  total_aplicado = aplicado_mes_actual + scholarship.appliedAmount
  saldo_disponible = maxMonthlyAmount - total_aplicado
  beca_final = min(beca_individual, saldo_disponible)
  si saldo_disponible <= 0:
    error: "La beca ha alcanzado su límite mensual"
sino:
  beca_final = beca_individual
```

### Regla Final de Descuentos

**Orden de aplicación:**
1. Los descuentos se calculan sobre el monto base (no sobre el saldo restante después de beca)
2. Los descuentos se acumulan (se suman todos los descuentos aplicables)
3. Los descuentos se ordenan por `priority` descendente
4. El total de descuentos no puede superar el saldo restante después de beca
5. Si un descuento haría que el total supere el saldo restante, se limita al saldo disponible

**Validaciones de descuentos:**
- El descuento individual se calcula sobre el monto base
- El total de descuentos acumulados no puede superar el saldo restante después de beca
- Si el total superaría el saldo restante, se limita el último descuento al saldo disponible
- Esto garantiza que el monto final nunca sea negativo

**Fórmula:**
```
saldo_restante = monto_base - beca_total
para cada descuento (ordenado por priority descendente):
  si discountType == PERCENTAGE:
    descuento_valor = monto_base * (value / 100)
  sino:
    descuento_valor = value
  
  total_descuentos_actual = descuento_acumulado + descuento_valor
  si total_descuentos_actual > saldo_restante:
    descuento_valor = saldo_restante - descuento_acumulado
    // Limitar al saldo disponible
  
  descuento_acumulado += descuento_valor

monto_final = monto_base - beca_total - descuento_acumulado
```

**Ejemplo:**
- Monto base: $10,000
- Beca 50%: $5,000
- Saldo restante: $5,000
- Descuento 1 (10%): $1,000
- Descuento 2 (5%): $500
- Total descuentos: $1,500
- Monto final: $10,000 - $5,000 - $1,500 = $3,500

**Ejemplo con límite:**
- Monto base: $10,000
- Beca 50%: $5,000
- Saldo restante: $5,000
- Descuento 1 (60%): $6,000 → limitado a $5,000
- Total descuentos: $5,000
- Monto final: $10,000 - $5,000 - $5,000 = $0

## Manejo de Duplicados

**Doble protección:**
1. **Validación previa en código:** Antes de crear la cuota, se verifica si ya existe una cuota con la misma combinación de `studentId`, `conceptId`, `periodLabel` y `academicTermId`. Si existe, se lanza un error controlado: "Ya existe una cuota para este alumno, concepto, período y ciclo lectivo".

2. **Constraint de base de datos:** El modelo `StudentCharge` tiene un constraint único `@@unique([studentId, conceptId, periodLabel, academicTermId])` que previene duplicados a nivel de base de datos.

**Manejo de errores de concurrencia:**
- Si dos usuarios intentan crear la misma cuota simultáneamente, la validación previa puede no detectar el duplicado (race condition)
- En ese caso, el constraint de base de datos lanza un error `P2002`
- El código captura este error específico y lo convierte en un error controlado con el mismo mensaje
- Esto garantiza que nunca se devuelve un error 500 por duplicados esperables

**Código:**
```typescript
try {
  result = await prisma.$transaction(async (tx) => {
    return await this.createChargeInternal(input, student, concept, academicTerm, tx);
  });
} catch (error) {
  // Capturar errores de constraint de duplicado (P2002)
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    throw new Error('Ya existe una cuota para este alumno, concepto, período y ciclo lectivo');
  }
  throw error;
}
```

## Comportamiento Transaccional

### Generación Individual (`createCharge`)

- Usa una transacción atómica de Prisma (`prisma.$transaction`)
- La transacción incluye:
  - Creación de la cuota (`studentCharge.create`)
  - Creación del movimiento financiero (`financialMovement.create`)
  - Actualización de becas aplicadas (`scholarship.update`)
- Si cualquier operación falla, toda la transacción hace rollback
- La auditoría se registra **fuera** de la transacción, solo si la transacción fue exitosa

### Generación Masiva (`createBulkCharges`)

- Usa una **sola transacción atómica** para todo el lote
- No llama a `createCharge()` (que abre su propia transacción)
- En su lugar, usa el helper interno `createChargeInternal()` que acepta un `tx` (transaction client)
- La transacción incluye:
  - Creación de todas las cuotas
  - Creación de todos los movimientos financieros
  - Actualización de todas las becas
- Si **cualquier** cuota del lote falla, **ninguna** cuota se crea (rollback total)
- La auditoría se registra **fuera** de la transacción, solo si la transacción fue exitosa

**Confirmación técnica:**
- `createBulkCharges` no llama a `createCharge`
- `createBulkCharges` llama a `createChargeInternal` con el `tx` de la transacción masiva
- Esto garantiza que todo el lote esté en una sola transacción atómica
- Si una cuota falla, no se crean cuotas, movimientos financieros ni auditoría de éxito

## Errores Controlados

**Errores que se devuelven como mensajes de usuario (no 500):**
- "No tiene permisos para crear cuotas"
- "Alumno no encontrado"
- "El alumno no está activo"
- "Concepto no encontrado"
- "El concepto no está activo"
- "Ciclo lectivo no encontrado"
- "El ciclo lectivo no está activo"
- "El monto no puede ser negativo"
- "El período no puede estar vacío"
- "Ya existe una cuota para este alumno, concepto, período y ciclo lectivo" (duplicado)
- "La beca no puede superar el monto base de la cuota"
- "El total de becas no puede superar el monto base de la cuota"
- "La beca ha alcanzado su límite mensual"
- "El monto final no puede ser negativo. Verifique las becas y descuentos aplicados."

**Errores de validación en bulk:**
- En `createBulkCharges`, se hace una validación previa completa antes de iniciar la transacción
- Si hay errores, se devuelven todos los errores en un solo mensaje: "Validación falló para X cuotas: - error1 - error2 ..."
- Esto permite al usuario corregir todos los errores de una vez

## Auditoría

**Cuándo se registra auditoría:**
- Solo si la transacción fue **exitosa**
- En `createCharge`: después de que la transacción se completa exitosamente
- En `createBulkCharges`: después de que la transacción se completa exitosamente

**Cuándo NO se registra auditoría:**
- Si la validación previa falla
- Si la transacción hace rollback
- Si hay errores de constraint (duplicados)
- Si hay errores de validación de becas/descuentos

**Metadata de auditoría:**
- Generación individual: incluye `studentId`, `studentName`, `conceptId`, `conceptName`, `periodLabel`, `academicTermId`, `baseAmount`, `scholarshipApplied`, `discountApplied`, `finalAmount`
- Generación masiva: incluye `totalCharges`, `chargeIds`

**Intentos fallidos:**
- Los intentos fallidos NO se auditan como intentos fallidos
- Solo se auditan las operaciones exitosas
- Esto simplifica la auditoría y evita contaminar los logs con intentos fallidos esperables (como duplicados)

## Límites Conocidos

1. **Concurrencia:** Si dos usuarios crean la misma cuota simultáneamente, el constraint de DB previene duplicados y el error se captura y convierte en un error controlado. No se necesita retry adicional.

2. **Becas con límite mensual:** La validación de `maxMonthlyAmount` calcula cuánto se aplicó en el mes actual (cuotas creadas en el mes) y limita o rechaza la aplicación si supera el límite. El cálculo incluye tanto `scholarship.appliedAmount` (acumulado histórico) como las cuotas del mes actual.

3. **Descuentos múltiples:** Los descuentos se acumulan pero se limitan al saldo restante después de beca. El monto final nunca puede ser negativo. Si un descuento haría que el total supere el saldo restante, se limita al saldo disponible.

4. **Performance en bulk:** Si se generan miles de cuotas masivas, la transacción podría ser muy larga. Considerar implementar batch processing con transacciones más pequeñas si esto se convierte en un problema real.

5. **Transacción larga:** La transacción masiva incluye todas las operaciones del lote. Si el lote es muy grande, podría afectar el rendimiento. La validación previa ayuda a minimizar el tiempo de transacción.

## Próximos Pasos - Fase 3: Registro de Pagos

La Fase 3 implementará:

1. **Registro de pagos** - `registerPayment()`
2. **Anulación de pagos** - `cancelPayment()`
3. **Asignación de pagos a cuotas** - `allocatePayment()`
4. **Cálculo de deuda** - `calculateDebtSummary()`
5. **Validaciones de pagos**
6. **Permisos de pagos**
7. **Routes/actions para pagos**
8. **Pruebas funcionales de pagos**
9. **Auditoría de pagos**
10. **Documentación Fase 3**

## Conclusión

La Fase 2 del Módulo Financiero está completa con:

- ✅ Generación individual de cuotas con validaciones robustas
- ✅ Generación masiva de cuotas con transacción atómica
- ✅ Aplicación automática de becas y descuentos
- ✅ Prevención de duplicados (validación + constraint)
- ✅ Permisos granulares por rol
- ✅ Auditoría completa con metadata
- ✅ Uso exclusivo de Decimal para montos
- ✅ Pruebas funcionales completas
- ✅ Documentación actualizada

La implementación sigue las mejores prácticas de:
- Separación de responsabilidades
- Transacciones atómicas
- Validaciones backend
- Auditoría real
- Type safety con TypeScript
- Decimal precision para finanzas
