# Payment Agreements - Phase 2: Creation and Activation

## Overview

Phase 2 implements the core functionality for creating and activating payment agreements. This includes draft creation, installment planning, activation with validations, permission checks, audit logging, and transactional integrity.

## Features Implemented

### 1. Payment Agreement Service (`PaymentAgreementService`)

Location: `src/lib/server/payment-agreements/payment-agreement-service.ts`

#### Core Methods

- **`createDraftAgreement`**: Creates a draft payment agreement with full validation
- **`activateAgreement`**: Activates a draft agreement (DRAFT → ACTIVE)
- **`getAgreementById`**: Retrieves a single agreement with permission checks
- **`getStudentAgreements`**: Retrieves all agreements for a student
- **`getAgreementSummary`**: Returns summary statistics for an agreement

#### Helper Methods

- **`canCreateOrActivate`**: Checks if user has permission to create/activate agreements
- **`canViewAgreements`**: Checks if user has permission to view agreements
- **`recordAgreementEvent`**: Records audit events for agreement lifecycle
- **`createAuditLog`**: Creates system audit log entries
- **`getNextAgreementNumber`**: Generates sequential agreement numbers per year

### 2. Routes

#### `/finanzas/convenios`

- Lists all payment agreements
- Filters by user role (students see only their own agreements)
- Shows agreement status, amounts, and dates

#### `/finanzas/convenios/nuevo`

- Form to create new payment agreements
- Select student and charges to include
- Configure installment plan (count, dates, amounts)
- Validates installment sum matches agreed amount

#### `/finanzas/convenios/[id]`

- View detailed agreement information
- Shows agreement summary and installments
- Activate button for DRAFT agreements
- Displays charge relations and events

### 3. Functional Tests

Location: `scripts/test-payment-agreements-creation.ts`

Test coverage includes:

- Draft agreement creation
- Agreement activation
- Permission validation
- Installment validation
- Transactional rollback
- Audit logging

Run with: `npx tsx scripts/test-payment-agreements-creation.ts`

## Validation Rules

### Create Draft Agreement

1. **User Permissions**
   - Only SUPERADMIN, DIRECTOR, and FINANZAS can create agreements
   - SECRETARIA and ALUMNO cannot create agreements

2. **Student Validation**
   - Student must exist in database
   - Student must have at least one charge

3. **Charge Validation**
   - At least one charge must be selected
   - All charges must belong to the student
   - Charges cannot be already in an active/draft agreement

4. **Installment Validation**
   - At least one installment must be specified
   - Installments must have positive amounts
   - Sum of installments must equal agreed amount
   - Installments must have valid due dates

5. **Amount Validation**
   - Agreed amount cannot exceed original debt (without justification)
   - Original debt is calculated from selected charges

6. **Transaction Integrity**
   - All operations (agreement, installments, charge relations, events, audit log) are atomic
   - Rollback on any failure

### Activate Agreement

1. **Status Validation**
   - Agreement must be in DRAFT status
   - Cannot activate ACTIVE, COMPLETED, or CANCELLED agreements

2. **Content Validation**
   - Agreement must have at least one charge relation
   - Agreement must have at least one installment
   - Sum of installments must match agreed amount

3. **User Permissions**
   - Only SUPERADMIN, DIRECTOR, and FINANZAS can activate agreements

4. **Transaction Integrity**
   - Status update, event recording, and audit logging are atomic
   - Rollback on any failure

## Permission Model

| Role       | Create | Activate | View Own | View All |
| ---------- | ------ | -------- | -------- | -------- |
| SUPERADMIN | ✅     | ✅       | ✅       | ✅       |
| DIRECTOR   | ✅     | ✅       | ✅       | ✅       |
| FINANZAS   | ✅     | ✅       | ✅       | ✅       |
| SECRETARIA | ❌     | ❌       | ✅       | ✅       |
| ALUMNO     | ❌     | ❌       | ✅       | ❌       |

## Audit Trail

### Payment Agreement Events

Events are recorded in `payment_agreement_events` table:

- **CREATED**: When a draft agreement is created
- **ACTIVATED**: When an agreement is activated
- **CANCELLED**: When an agreement is cancelled (future)
- **COMPLETED**: When all installments are paid (future)

Each event includes:

- Event type
- Description
- Previous and new status
- Old and new values (JSON)
- User ID and name
- Timestamp
- Reason (optional)

### System Audit Logs

Audit logs are recorded in `audit_logs` table:

- **CREATE**: When a payment agreement is created
- **UPDATE**: When a payment agreement is activated/modified
- **DELETE**: When a payment agreement is deleted (future)

Each log includes:

- User ID
- Action type
- Entity type (PaymentAgreement)
- Entity ID
- Description
- Metadata (JSON)

## Transactional Integrity

All critical operations use Prisma transactions:

```typescript
await prisma.$transaction(async (tx) => {
	// 1. Create agreement
	// 2. Create installments
	// 3. Create charge relations
	// 4. Record event
	// 5. Create audit log
});
```

If any step fails, the entire transaction is rolled back, ensuring no partial data is created.

## Installment Planning

### Equal Installments

Simplest case: divide agreed amount by number of installments.

Example:

- Agreed amount: $1000
- Installments: 2
- Each installment: $500

### Custom Installments

Support for irregular amounts and dates.

Example:

- Installment 1: $300 (due Jan 15)
- Installment 2: $400 (due Feb 15)
- Installment 3: $300 (due Mar 15)

Total: $1000

### Validation

- Sum of all installments must equal agreed amount
- Each installment must be > 0
- Due dates must be valid dates
- Installments are numbered sequentially

## Charge Relations

When creating an agreement, charge relations are created with snapshots:

- **Original charge amount**: Snapshot of charge amount at time of agreement
- **Original charge paid amount**: Snapshot of paid amount at time of agreement
- **Original charge status**: Snapshot of charge status at time of agreement
- **Amount included**: Portion of charge included in agreement
- **New status**: Status to set on original charge after agreement (future)

This ensures non-destructive tracking of charge history.

## Limitations

### Current Limitations (Phase 2)

1. **No Payment Processing**
   - Cannot allocate payments to installments
   - Cannot mark installments as paid
   - No receipt generation

2. **No Automatic Blocking**
   - Overdue installments do not trigger financial blocks
   - No automatic status changes

3. **No Refinancing**
   - Cannot modify existing agreements
   - Cannot create new agreements from existing ones

4. **Basic UI**
   - Minimal forms without advanced features
   - No bulk operations
   - No filtering or sorting

5. **No Cancellation**
   - Cannot cancel agreements (future phase)

### Future Phases

- Phase 3: Payment allocation and receipt generation
- Phase 4: Automatic blocking and status management
- Phase 5: Refinancing and agreement modification
- Phase 6: Cancellation and completion workflows

## Error Handling

All service methods throw descriptive errors:

```typescript
// Permission errors
throw new Error('User does not have permission to create payment agreements');

// Validation errors
throw new Error('Agreed amount cannot exceed original debt');
throw new Error('Sum of installments must equal agreed amount');

// Not found errors
throw new Error('Agreement not found');
throw new Error('Student not found');
```

Routes catch these errors and display appropriate messages to users.

## Testing

### Running Functional Tests

```bash
npx tsx scripts/test-payment-agreements-creation.ts
```

### Test Coverage

1. **Draft Creation**
   - Valid agreement creation
   - Installments and charge relations
   - Event recording
   - Audit logging

2. **Activation**
   - Status transition
   - Event recording
   - Audit logging

3. **Validation**
   - Permission checks
   - Installment sum validation
   - Transactional rollback

4. **Audit**
   - Event logging
   - System audit logs

## Database Schema

### Tables Used

- `payment_agreements`: Main agreement records
- `payment_agreement_installments`: Installments for each agreement
- `payment_agreement_charge_relations`: Links between agreements and charges
- `payment_agreement_events`: Audit events for agreement lifecycle
- `payment_agreement_numbers`: Sequential number tracking per year
- `audit_logs`: System-wide audit logging

### Key Relationships

- PaymentAgreement → PaymentAgreementInstallment (1:N)
- PaymentAgreement → PaymentAgreementChargeRelation (1:N)
- PaymentAgreement → PaymentAgreementEvent (1:N)
- PaymentAgreementChargeRelation → StudentCharge (N:1)
- PaymentAgreementInstallment → PaymentAllocation (1:N) (future)

## API Reference

### Create Agreement Input

```typescript
interface CreateAgreementInput {
	studentId: string;
	studentName: string;
	studentDni?: string;
	originalDebt: Decimal;
	agreedAmount: Decimal;
	reason: string;
	observations?: string;
	createdBy: string;
	createdByName: string;
	chargeIds: string[];
	installments: InstallmentInput[];
}

interface InstallmentInput {
	installmentNumber: number;
	dueDate: string; // ISO date string
	amount: Decimal;
}
```

### Agreement Summary

```typescript
interface AgreementSummary {
	totalAgreed: Decimal;
	totalPaid: Decimal;
	pendingAmount: Decimal;
	totalInstallments: number;
	pendingInstallments: number;
	overdueInstallments: number;
	originalDebtIncluded: Decimal;
	status: PaymentAgreementStatus;
}
```

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Validate permissions** before any database operation
3. **Record audit events** for all state changes
4. **Use Decimal** for all financial calculations
5. **Validate installment sums** before creating agreements
6. **Check for duplicate charges** to prevent conflicts
7. **Use descriptive error messages** for debugging

## Troubleshooting

### Common Issues

1. **"Sum of installments does not match agreed amount"**
   - Ensure all installment amounts sum to the agreed amount
   - Check for floating point precision issues (use Decimal)

2. **"User does not have permission"**
   - Verify user has correct role
   - Check role assignment in database

3. **"Charge already in active/draft agreement"**
   - Check if charge is already linked to another agreement
   - Use different charges or modify existing agreement

4. **"Transaction failed"**
   - Check database connection
   - Verify all foreign key constraints
   - Check for unique constraint violations

## Security Considerations

1. **Permission Checks**: All operations validate user roles
2. **Ownership Validation**: Students can only view their own agreements
3. **Audit Trail**: All actions are logged for accountability
4. **Transaction Safety**: Prevents partial data corruption
5. **Input Validation**: All inputs are validated before database operations

## Performance Notes

1. **Transactions**: Use transactions sparingly for performance
2. **Includes**: Only include necessary relations in queries
3. **Indexing**: Key fields are indexed for fast lookups
4. **Pagination**: Implement pagination for large lists (future)

## Migration Notes

No schema changes were made in Phase 2. The schema from Phase 1 is used as-is.

## Next Steps

See Phase 3 documentation for payment allocation and receipt generation.
