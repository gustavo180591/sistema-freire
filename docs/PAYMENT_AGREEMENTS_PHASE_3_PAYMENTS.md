# Payment Agreements - Phase 3: Installment Payments

## Overview

Phase 3 implements the payment registration functionality for payment agreement installments. This phase allows users to register payments (total, partial, or multiple) on agreement installments, with full integration with the existing `Payment` and `PaymentAllocation` models, comprehensive validation, event logging, and audit trails.

## Implementation Details

### Core Method: `registerInstallmentPayment`

**Location:** `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Signature:**
```typescript
async registerInstallmentPayment(
  input: InstallmentPaymentInput,
  userRoles: UserRole[],
  userId: string
): Promise<PaymentResult>
```

**Input Type:**
```typescript
type InstallmentPaymentInput = {
  installmentId: string;
  amount: Decimal;
  method: PaymentMethod;
  reference: string;
  notes?: string;
  paidBy: string;
  paidByName: string;
};
```

**Return Type:**
```typescript
type PaymentResult = {
  payment: Payment;
  allocation: PaymentAllocation;
  installment: PaymentAgreementInstallment;
  agreement: PaymentAgreement;
};
```

## Flow

### 1. Permission Validation
- Validates that the user has the required roles (`SUPERADMIN`, `DIRECTOR`, `FINANZAS`, or `ALUMNO` with ownership)
- Throws error if user lacks permissions

### 2. Installment Validation
- Fetches the installment with related agreement and student
- Validates that the installment exists
- Validates that the agreement is in `ACTIVE` status
- Validates that the installment is not in `CANCELLED` or `WAIVED` status
- Validates that the payment amount is greater than 0
- Validates that the payment amount does not exceed the pending amount

### 3. Transactional Payment Processing
All operations are wrapped in a single Prisma transaction to ensure atomicity:

#### 3.1 Create Payment
- Creates a `Payment` record with:
  - `studentId`: From the agreement
  - `amount`: The payment amount
  - `method`: Payment method (CASH, BANK_TRANSFER, DEBIT_CARD, CREDIT_CARD, QR, SCHOLARSHIP)
  - `reference`: Unique reference for the payment
  - `notes`: Optional notes
  - `userId`: The user who registered the payment

#### 3.2 Create Payment Allocation
- Creates a `PaymentAllocation` record linking the payment to the installment:
  - `paymentId`: The created payment ID
  - `installmentId`: The installment being paid
  - `amount`: The payment amount
  - `studentId`: From the agreement

#### 3.3 Update Installment
- Updates the installment's payment information:
  - `paidAmount`: Increased by the payment amount
  - `pendingAmount`: Decreased by the payment amount
  - `status`: Updated based on remaining pending amount:
    - `PAID` if pending amount becomes 0
    - `PARTIAL` if pending amount > 0
    - `PENDING` if no payment yet

#### 3.4 Update Agreement Totals
- Recalculates agreement totals:
  - `paidAmount`: Sum of all installment paid amounts
  - `pendingAmount`: Sum of all installment pending amounts
  - `status`: Updated to `COMPLETED` if all installments are paid

#### 3.5 Record Events
- Creates a `PaymentAgreementEvent` record:
  - `eventType`: `PAYMENT_REGISTERED`
  - `description`: Details about the payment
  - `previousStatus`: `null` (not applicable for payment events)
  - `newStatus`: `null` (not applicable for payment events)
  - `userId`: The user who registered the payment
  - `userName`: The user's name

#### 3.6 Create Audit Log
- Creates an `AuditLog` record:
  - `action`: `CREATE`
  - `entityType`: `Payment`
  - `entityId`: The payment ID
  - `description`: Payment registration details
  - `metadata`: Payment details including amount, method, reference, installmentId, agreementId

### 4. Return Result
- Returns the created payment, allocation, updated installment, and updated agreement

## Validations

### Pre-Payment Validations
1. **Permission Check**: User must have `SUPERADMIN`, `DIRECTOR`, `FINANZAS`, or be the student owner
2. **Installment Existence**: Installment must exist in the database
3. **Agreement Status**: Agreement must be in `ACTIVE` status
4. **Installment Status**: Installment must not be `CANCELLED` or `WAIVED`
5. **Amount Validity**: Payment amount must be greater than 0
6. **Amount Limit**: Payment amount must not exceed the installment's pending amount

### Transactional Validations
- All database operations are performed within a single transaction
- If any operation fails, the entire transaction is rolled back
- This ensures data consistency and prevents partial updates

## Payment Methods

Supported payment methods (from `PaymentMethod` enum):
- `CASH`: Cash payment
- `BANK_TRANSFER`: Bank transfer
- `DEBIT_CARD`: Debit card
- `CREDIT_CARD`: Credit card
- `QR`: QR code payment
- `SCHOLARSHIP`: Scholarship payment

## Installment Status Flow

```
PENDING ──(partial payment)──> PARTIAL ──(full payment)──> PAID
```

- **PENDING**: No payments made yet
- **PARTIAL**: Partial payment made, pending amount > 0
- **PAID**: Full payment made, pending amount = 0
- **CANCELLED**: Installment cancelled (cannot receive payments)
- **WAIVED**: Installment waived (cannot receive payments)

## Agreement Status Flow

```
ACTIVE ──(all installments paid)──> COMPLETED
```

- **DRAFT**: Agreement in draft status (cannot receive payments)
- **ACTIVE**: Agreement active (can receive payments)
- **COMPLETED**: All installments paid
- **CANCELLED**: Agreement cancelled
- **SUSPENDED**: Agreement suspended

## Event Logging

### PaymentAgreementEvent
Each payment registration creates an event with:
- `eventType`: `INSTALLMENT_PAID` (Note: This is the event type available in the PaymentAgreementEventType enum. It represents the registration of a payment for an agreement installment.)
- `description`: Human-readable description of the payment
- `userId`: User who registered the payment
- `userName`: User's name
- `createdAt`: Timestamp of the event

### AuditLog
Each payment registration creates an audit log entry with:
- `action`: `CREATE`
- `entityType`: `Payment`
- `entityId`: Payment ID
- `description`: Payment registration description
- `metadata`: JSON object containing:
  - `amount`: Payment amount
  - `method`: Payment method
  - `reference`: Payment reference
  - `installmentId`: Installment ID
  - `agreementId`: Agreement ID
  - `studentId`: Student ID
  - `studentName`: Student name

## Integration with Existing Models

### Payment Model
- Uses existing `Payment` model from financial module
- Links to student via `studentId`
- Links to user via `userId`
- Stores payment method, amount, reference, and notes

### PaymentAllocation Model
- Uses existing `PaymentAllocation` model from financial module
- Links payment to installment via `installmentId`
- Stores allocation amount
- Links to student via `studentId`

### No Destructive Modifications to StudentCharge
- **Important**: This implementation does NOT modify `StudentCharge` records
- The original debt remains intact in `StudentCharge`
- Payment tracking is done through the agreement's installments
- This prevents data duplication and maintains the integrity of the original debt records
- Future phases may implement logic to reflect payment information in `StudentCharge` if needed

## UI Integration

### Route: `/finanzas/convenios/[id]`

**Server Action:** `registerPayment` in `+page.server.ts`

**Form Fields:**
- `installmentId`: The installment to pay
- `amount`: Payment amount
- `method`: Payment method
- `reference`: Payment reference
- `notes`: Optional notes

**UI Components:** `+page.svelte`
- Displays list of installments with:
  - Installment number
  - Due date
  - Amount
  - Paid amount
  - Pending amount
  - Status
- Payment form for each installment (if status allows payment)
- Validation on UI for amount limits

## Limitations

### Phase 3 Limitations
1. **No Receipt Generation**: Receipt generation is not implemented in this phase (deferred to Phase 4)
2. **No Automatic Blocking**: Automatic blocking logic is not implemented (deferred to later phases)
3. **No StudentCharge Updates**: Original debt in `StudentCharge` is not modified
4. **No Payment Reversals**: Payment reversal/refund logic is not implemented
5. **No Payment Scheduling**: Scheduled payments are not supported
6. **No Payment Plans**: Dynamic payment plan creation is not supported

### Future Enhancements
- Receipt generation with templates
- Automatic blocking when payments are overdue
- Integration with `StudentCharge` to reflect payment status
- Payment reversal and refund functionality
- Scheduled payments and automatic processing
- Dynamic payment plan modification

## Testing

### Functional Test Script
**Location:** `scripts/test-payment-agreement-payments.ts`

**Test Coverage:**
1. Total payment of an installment
2. Partial payment of an installment
3. Rejection of payment exceeding pending amount
4. Rejection if agreement is not active
5. Rejection if installment is already paid
6. Verification of Payment creation
7. Verification of PaymentAllocation with installmentId
8. Verification of installment status updates
9. Verification of agreement total updates
10. Verification of event creation
11. Verification of audit log creation
12. Transactional rollback test

**Running Tests:**
```bash
npx tsx scripts/test-payment-agreement-payments.ts
```

## Security Considerations

1. **Permission Checks**: All operations validate user permissions before execution
2. **Ownership Validation**: Students can only view and pay their own agreements
3. **Transactional Integrity**: All operations are atomic to prevent data corruption
4. **Audit Trail**: All payment registrations are logged in `AuditLog`
5. **Event Logging**: All payment registrations create `PaymentAgreementEvent` records

## Error Handling

### Common Errors
- **Permission Denied**: User lacks required permissions
- **Installment Not Found**: Installment does not exist
- **Agreement Not Active**: Agreement is not in ACTIVE status
- **Installment Cancelled**: Installment is in CANCELLED status
- **Installment Waived**: Installment is in WAIVED status
- **Invalid Amount**: Payment amount is 0 or negative
- **Amount Exceeds Pending**: Payment amount exceeds pending amount

### Error Messages
All errors are thrown with descriptive messages to help with debugging and user feedback.

## Performance Considerations

1. **Transaction Scope**: All operations are in a single transaction to ensure consistency
2. **Query Optimization**: Uses `include` to fetch related data in a single query
3. **Index Usage**: Leverages database indexes on foreign keys for efficient queries
4. **Decimal Precision**: Uses `Decimal` type for financial calculations to avoid floating-point errors

## Database Schema

### Payment Model
```prisma
model Payment {
  id          String   @id @default(cuid())
  studentId   String
  amount      Decimal  @db.Decimal(12, 2)
  method      PaymentMethod
  reference   String
  notes       String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  allocations PaymentAllocation[]
  student     Student  @relation(fields: [studentId], references: [id])
  user        User     @relation(fields: [userId], references: [id])

  @@unique([method, reference])
  @@index([studentId])
  @@index([userId])
}
```

### PaymentAllocation Model
```prisma
model PaymentAllocation {
  id           String   @id @default(cuid())
  paymentId    String
  installmentId String?
  chargeId     String?
  amount       Decimal  @db.Decimal(12, 2)
  studentId    String
  createdAt    DateTime @default(now())

  payment      Payment                      @relation(fields: [paymentId], references: [id])
  installment  PaymentAgreementInstallment? @relation(fields: [installmentId], references: [id])
  charge       StudentCharge?               @relation(fields: [chargeId], references: [id])
  student      Student                      @relation(fields: [studentId], references: [id])

  @@index([paymentId])
  @@index([installmentId])
  @@index([chargeId])
  @@index([studentId])
}
```

## Summary

Phase 3 successfully implements payment registration for payment agreement installments with:
- Full integration with existing `Payment` and `PaymentAllocation` models
- Comprehensive validation and error handling
- Transactional integrity
- Event logging and audit trails
- Minimal UI for payment registration
- Functional test coverage
- No destructive modifications to original debt

The implementation is production-ready for the payment registration functionality, with receipts and automatic blocking deferred to later phases.
