# Payment Agreements - Phase 5.3: Block Exceptions

## Overview

Phase 5.3 implements the logic that allows an active and up-to-date payment agreement to generate a financial block exception, and revokes that exception if the agreement becomes overdue or defaulted. This phase focuses on controlled modification of `FinancialBlock` records to apply and revoke exceptions linked to payment agreements.

## Scope

This phase implements:

- `applyAgreementBlockException()`: Applies block exception for active and up-to-date agreements
- `revokeAgreementBlockException()`: Revokes block exception for overdue or defaulted agreements
- `getActiveAgreementBlockException()`: Queries active block exception for a student
- `evaluateAgreementBlockException()`: Evaluates if an agreement should have a block exception
- `evaluateAgreementBlockStatus()`: Coordinator method to apply/revoke exceptions based on agreement status

**What is NOT implemented in this phase:**

- No modification of `StudentCharge`
- No modification of global reports
- No dashboard integration
- No cron jobs
- No automation
- No schema changes
- No migrations

## Business Rules

### Block Exception Application

1. **ACTIVE and up-to-date agreements**: Can generate block exceptions
2. **No overdue installments**: Agreement must have no `OVERDUE` installments
3. **Existing blocks required**: Exception only applies if student has active financial blocks
4. **No duplicates**: Exception cannot be applied if already exists for the same agreement
5. **Exception linking**: Exception must be linked with `exceptionSource = PAYMENT_AGREEMENT` and `exceptionAgreementId`

### Block Exception Revocation

1. **Overdue installments**: Agreement with `OVERDUE` installments should not have exception
2. **DEFAULTED agreements**: Must revoke exception if exists
3. **Exception clearing**: Revocation clears all exception fields including links
4. **Event registration**: Both application and revocation register `BLOCK_EXCEPTION` events

### Agreement Status Handling

| Status                  | Can Apply Exception? | Should Revoke Exception? | Notes                          |
| ----------------------- | -------------------- | ------------------------ | ------------------------------ |
| `DRAFT`                 | No                   | N/A                      | Cannot generate exceptions     |
| `ACTIVE` (no overdue)   | Yes                  | No                       | Can generate exception         |
| `ACTIVE` (with overdue) | No                   | Yes                      | Should revoke exception        |
| `COMPLETED`             | No                   | No                       | Does not need active exception |
| `DEFAULTED`             | No                   | Yes                      | Must revoke exception          |
| `CANCELLED`             | No                   | N/A                      | Cannot generate exceptions     |

## Implemented Methods

### 1. applyAgreementBlockException()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Apply block exception for an active and up-to-date agreement

**Parameters**:

- `agreementId`: ID of the payment agreement
- `userId`: ID of the user applying the exception
- `userName`: Name of the user applying the exception

**Returns**: `AgreementBlockExceptionResult`

```typescript
type AgreementBlockExceptionResult = {
	agreementId: string;
	agreementNumber: number;
	agreementYear: number;
	exceptionApplied: boolean;
	exceptionRevoked: boolean;
	blockId?: string;
	previousException?: {
		exceptionGranted: boolean;
		exceptionBy?: string | null;
		exceptionAt?: Date | null;
		exceptionReason?: string | null;
	};
	reason: string;
};
```

**Algorithm**:

1. Fetch agreement with installments
2. Validate agreement is `ACTIVE`
3. Check for overdue installments (reject if found)
4. Fetch active financial blocks for student
5. Return early if no active blocks exist
6. Check for existing exception for this agreement (return early if exists)
7. Apply exception to all active blocks:
   - Set `exceptionGranted = true`
   - Set `exceptionBy` and `exceptionAt`
   - Set `exceptionReason` with agreement details
   - Set `exceptionSource = PAYMENT_AGREEMENT`
   - Set `exceptionAgreementId`
8. Register `BLOCK_EXCEPTION` event
9. Create audit log
10. Return result

**Key Points**:

- Only `ACTIVE` agreements can apply exceptions
- Agreements with overdue installments cannot apply exceptions
- Exception is applied to all active blocks for the student
- Exception is linked to the agreement with `exceptionSource` and `exceptionAgreementId`
- No duplicate exceptions for the same agreement

### 2. revokeAgreementBlockException()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Revoke block exception for an agreement

**Parameters**:

- `agreementId`: ID of the payment agreement
- `userId`: ID of the user revoking the exception
- `userName`: Name of the user revoking the exception

**Returns**: `AgreementBlockExceptionResult`

**Algorithm**:

1. Fetch agreement
2. Find blocks with exception for this agreement
3. Return early if no exceptions exist
4. Revoke exception from all blocks:
   - Set `exceptionGranted = false`
   - Clear `exceptionBy`, `exceptionAt`, `exceptionReason`
   - Clear `exceptionSource`, `exceptionAgreementId`
5. Register `BLOCK_EXCEPTION` event (revocation)
6. Create audit log
7. Return result

**Key Points**:

- Only revokes exceptions linked to the specific agreement
- Clears all exception fields including links
- Registers event for audit trail

### 3. getActiveAgreementBlockException()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Query active block exception for a student

**Parameters**:

- `studentId`: ID of the student

**Returns**: `ActiveAgreementBlockException | null`

```typescript
type ActiveAgreementBlockException = {
	blockId: string;
	studentId: string;
	blockType: string;
	blockReason: string;
	exceptionGranted: boolean;
	exceptionBy?: string | null;
	exceptionAt?: Date | null;
	exceptionReason?: string | null;
	exceptionSource?: string | null;
	exceptionAgreementId?: string | null;
	agreementNumber?: number;
	agreementYear?: number;
};
```

**Algorithm**:

1. Fetch first active block with exception for student
2. Filter by `exceptionSource = PAYMENT_AGREEMENT`
3. Include related agreement
4. Return null if not found
5. Return exception details with agreement info

**Key Points**:

- Returns the first active exception found
- Includes agreement number and year for reference
- Returns null if no exception exists

### 4. evaluateAgreementBlockException()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Evaluate if an agreement should have a block exception

**Parameters**:

- `agreementId`: ID of the payment agreement

**Returns**: `{ shouldHaveException: boolean; reason: string; }`

**Algorithm**:

1. Fetch agreement with installments
2. Check agreement status:
   - `COMPLETED`: No exception needed
   - `DEFAULTED`: No exception (should revoke)
   - `DRAFT`/`CANCELLED`: Cannot have exception
   - `ACTIVE`: Check for overdue installments
3. For `ACTIVE` agreements:
   - If has overdue installments: No exception
   - If no overdue installments: Yes exception
4. Return evaluation result

**Key Points**:

- Read-only evaluation, does not modify data
- Provides clear reason for decision
- Used by coordinator method

### 5. evaluateAgreementBlockStatus()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Coordinator method to apply/revoke exceptions based on agreement status

**Parameters**:

- `agreementId`: ID of the payment agreement
- `userId`: ID of the user performing the evaluation
- `userName`: Name of the user performing the evaluation

**Returns**: `AgreementBlockExceptionResult`

**Algorithm**:

1. Fetch agreement
2. Evaluate if agreement should have exception
3. Get current exception status for student
4. Decision matrix:
   - Should have exception + no current exception → Apply
   - Should not have exception + has exception for this agreement → Revoke
   - Should have exception + has exception for this agreement → No action
   - Should not have exception + no current exception → No action
   - Exception exists for different agreement → No action (let other agreement handle)
5. Return result

**Key Points**:

- Main coordinator method for exception management
- Handles all scenarios without duplicating logic
- Prevents conflicts when multiple agreements exist
- Can be called after agreement status changes

## Integration with FinancialBlock

### FinancialBlock Model

The `FinancialBlock` model already includes fields for payment agreement exceptions:

```prisma
model FinancialBlock {
  // ... existing fields ...
  exceptionGranted Boolean @default(false)
  exceptionBy String?
  exceptionAt DateTime?
  exceptionReason String?

  // Fields for payment agreement exception source
  exceptionSource FinancialBlockExceptionSource?
  exceptionAgreementId String?
  exceptionAgreement PaymentAgreement? @relation(fields: [exceptionAgreementId], references: [id], onDelete: SetNull)

  // ... other fields ...
}
```

### FinancialBlockExceptionSource Enum

```prisma
enum FinancialBlockExceptionSource {
  MANUAL
  PAYMENT_AGREEMENT
}
```

### FinancialService Integration

`FinancialService` already has methods for managing block exceptions:

- `createFinancialBlockException()`: Creates manual exceptions
- `revokeFinancialBlockException()`: Revokes manual exceptions
- `checkFinancialBlock()`: Checks if student is blocked

**Phase 5.3 does not modify FinancialService** - it adds parallel methods in `PaymentAgreementService` that specifically handle agreement-linked exceptions.

## Testing

### Test Script

`scripts/test-payment-agreement-block-exceptions.ts` includes comprehensive tests:

1. **ACTIVE and up-to-date agreement generates block exception**: Verifies exception is applied
2. **No duplicate exceptions**: Verifies second application is rejected
3. **DRAFT agreement does not generate exception**: Verifies DRAFT status is rejected
4. **CANCELLED agreement does not generate exception**: Verifies CANCELLED status is rejected
5. **COMPLETED agreement does not generate active exception**: Verifies COMPLETED status is rejected
6. **Overdue installment revokes exception**: Verifies overdue installments prevent exception
7. **DEFAULTED agreement revokes exception**: Verifies DEFAULTED status revokes exception
8. **No StudentCharge modification**: Verifies `StudentCharge` is not modified
9. **evaluateAgreementBlockStatus coordinator**: Verifies coordinator method works correctly

### Running Tests

```bash
npx tsx scripts/test-payment-agreement-block-exceptions.ts
```

## Usage Examples

### Example 1: Apply exception for active agreement

```typescript
import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';

const result = await paymentAgreementService.applyAgreementBlockException(
	agreementId,
	userId,
	'John Doe'
);

console.log(`Exception applied: ${result.exceptionApplied}`);
console.log(`Block ID: ${result.blockId}`);
```

### Example 2: Revoke exception for defaulted agreement

```typescript
const result = await paymentAgreementService.revokeAgreementBlockException(
	agreementId,
	userId,
	'John Doe'
);

console.log(`Exception revoked: ${result.exceptionRevoked}`);
```

### Example 3: Check active exception

```typescript
const exception = await paymentAgreementService.getActiveAgreementBlockException(studentId);

if (exception) {
	console.log(`Exception from agreement #${exception.agreementNumber}/${exception.agreementYear}`);
	console.log(`Reason: ${exception.exceptionReason}`);
}
```

### Example 4: Evaluate and apply/revoke automatically

```typescript
const result = await paymentAgreementService.evaluateAgreementBlockStatus(
	agreementId,
	userId,
	'John Doe'
);

console.log(`Action taken: ${result.reason}`);
```

## Event Registration

### BLOCK_EXCEPTION Event

Both application and revocation of exceptions register a `BLOCK_EXCEPTION` event:

```typescript
await this.recordAgreementEvent(agreementId, 'BLOCK_EXCEPTION', description, userId, userName);
```

**Application**: "Excepción de bloqueo aplicada por convenio activo y al día"
**Revocation**: "Excepción de bloqueo revocada por convenio vencido o incumplido"

## Audit Logging

All exception operations create audit logs:

```typescript
await this.createAuditLog(userId, 'UPDATE', 'FinancialBlock', blockId, description, metadata);
```

**Metadata includes**:

- `agreementId`
- `agreementNumber`
- `agreementYear`
- `studentId`
- `blocksModified`

## Data Integrity

### No Schema Changes

This phase does not require any schema changes or migrations. All operations use existing data structures:

- `FinancialBlock`: Exception fields already exist
- `PaymentAgreement`: Agreement data
- `PaymentAgreementEvent`: Event registration
- `AuditLog`: Audit trail

### Limited FinancialBlock Modification

This phase only modifies `FinancialBlock` when:

- Applying an exception (sets exception fields)
- Revoking an exception (clears exception fields)

No other `FinancialBlock` fields are modified.

### No StudentCharge Modification

`StudentCharge` is never modified by this phase.

## Performance Considerations

### Query Optimization

The implementation uses Prisma includes to fetch related data efficiently:

- Agreements with installments
- Blocks with agreement relations

### Duplicate Prevention

The implementation checks for existing exceptions before applying new ones, preventing duplicate exceptions for the same agreement.

## Error Handling

### Validation Errors

The implementation validates:

- Agreement exists
- Agreement is `ACTIVE` (for application)
- No overdue installments (for application)
- Active blocks exist (for application)
- Exception exists (for revocation)

### Business Rule Violations

The implementation enforces:

- Only `ACTIVE` agreements can apply exceptions
- Agreements with overdue installments cannot apply exceptions
- No duplicate exceptions for the same agreement
- Exception is linked to agreement with proper fields

## Security Considerations

### Access Control

The methods do not include permission checks. These should be added at the API layer if needed.

### Data Privacy

The methods return financial and exception data. Ensure proper access control at the API layer.

## Limitations

### Current Limitations

1. **Manual Trigger**: Exception evaluation must be called manually
2. **No Automation**: No cron jobs or automated evaluation
3. **No Dashboard**: No dashboard integration for viewing exceptions
4. **No Reports**: Global reports do not yet consider agreement exceptions
5. **Single Exception**: Only one active exception per student (first found)

### Future Phases

The following features are planned for future phases:

- **Phase 5.4**: Integration with global financial reports
- **Phase 5.5**: Automated exception evaluation and blocking
- **Phase 5.6**: Dashboard integration for exception management

## Conclusion

Phase 5.3 successfully implements block exception logic for payment agreements. The implementation:

- Applies exceptions for active and up-to-date agreements
- Revokes exceptions for overdue or defaulted agreements
- Links exceptions to agreements with proper source tracking
- Registers events and audit logs
- Does not modify `StudentCharge`
- Does not touch global reports
- Includes comprehensive tests

This foundation enables future phases to integrate with reporting, automation, and dashboard features.
