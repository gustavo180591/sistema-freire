# Payment Agreements - Phase 4: Receipts

## Overview

Phase 4 integrates payment agreement installment payments with the existing institutional receipt system. This allows generating formal receipts for agreement installment payments without creating a parallel receipt system.

## Implementation

### Schema Changes

**No schema migrations required.** The existing `Receipt` model already includes fields for payment agreements:

```prisma
model Receipt {
  // ... existing fields ...

  // Fields for Payment Agreements
  agreementId       String?
  agreementNumber   Int?
  installmentNumber Int?

  // ... existing relations ...
  agreement PaymentAgreement? @relation(fields: [agreementId], references: [id], onDelete: SetNull)
}
```

### FinancialService Modifications

The `issueReceipt` method in `FinancialService` was modified to:

1. **Include installment relation in allocations query:**
   ```ts
   allocations: {
     include: {
       charge: {
         include: { concept: true }
       },
       installment: {
         include: {
           agreement: true
         }
       }
     }
   }
   ```

2. **Handle agreement installment allocations:**
   - Previously: Skipped allocations without `chargeId`
   - Now: Creates receipt items for installment allocations with:
     - `chargeId: null`
     - `concept: "Cuota {n} - Convenio #{number}"`
     - `periodLabel: "Vencimiento: {date}"`
     - `baseAmount: installment.amount`
     - `lateFeeAmount: 0`
     - `discountAmount: 0`
     - `finalAmount: allocation.amount`

3. **Set agreement fields in receipt:**
   - `agreementId`: ID of the payment agreement
   - `agreementNumber`: Agreement number
   - `installmentNumber`: Installment number

### PaymentAgreementService Integration

**No new methods created.** The existing `registerInstallmentPayment` method creates payments with `PaymentAllocation` records that have:
- `chargeId: null`
- `installmentId: <installment-id>`

These allocations are now properly handled by the modified `issueReceipt` method.

### UI Changes

Added a "Pagos y Recibos" section to the agreement detail page (`src/routes/(app)/finanzas/convenios/[id]/+page.svelte`):

**Server-side (`+page.server.ts`):**
- Query payments with receipts for the agreement
- Include receipt information and installment details
- Map to simplified interface for frontend

**Client-side (`+page.svelte`):**
- Display list of payments with their receipts
- Show receipt number, date, and amount
- Link to existing receipt viewing route (`/recibos/{id}`)
- Display "Sin recibo" for payments without receipts

## Flow

### Receipt Generation Flow

1. User registers installment payment via `registerInstallmentPayment()`
2. Payment is created with `PaymentAllocation` (chargeId: null, installmentId: set)
3. User (or system) calls `financialService.issueReceipt({ paymentIds: [...] })`
4. `issueReceipt`:
   - Validates payments exist and are not cancelled
   - Checks for existing active receipts
   - Generates receipt items for both charge and installment allocations
   - Sets agreement fields if installment allocations are present
   - Creates receipt, items, and financial movement
   - Links payments to receipt
   - Logs audit entry

### Receipt Item Generation

**For charge allocations (original debt payments):**
- `chargeId`: charge.id
- `concept`: charge.concept.name
- `periodLabel`: charge.periodLabel
- `baseAmount`: charge.amount
- `lateFeeAmount`: charge.lateFeeApplied
- `discountAmount`: charge.discountApplied + charge.scholarshipApplied
- `finalAmount`: allocation.amount

**For installment allocations (agreement payments):**
- `chargeId`: null
- `concept`: "Cuota {n} - Convenio #{number}"
- `periodLabel`: "Vencimiento: {date}"
- `baseAmount`: installment.amount
- `lateFeeAmount`: 0
- `discountAmount`: 0
- `finalAmount`: allocation.amount

## Relationships

### Payment → Receipt
- One-to-one via `Payment.receiptId`
- Receipt can have multiple payments (for combined receipts)

### PaymentAllocation → Installment
- One-to-one via `PaymentAllocation.installmentId`
- Installment can have multiple allocations (partial payments)

### Receipt → Agreement
- One-to-one via `Receipt.agreementId`
- Agreement can have multiple receipts (one per payment)

### ReceiptItem → Charge
- Optional via `ReceiptItem.chargeId`
- Null for agreement installment items

## Validations

### Existing Validations (Preserved)
- Payments must exist and not be cancelled
- All payments must belong to same student
- Payments cannot have active receipts already
- User must have RECEIPT.create permission

### New Behavior
- Receipts can include both charge and installment allocations
- Receipt items can have `chargeId: null` for installment allocations
- Agreement fields are set only if installment allocations are present

## Audit Logging

### Events Logged
- Receipt creation: `CREATE` on `Receipt` entity
- Description includes receipt number, student, and payment details
- Metadata includes receipt number, year, student info, total amount, payment IDs, payment method, observations

### Agreement Events
- No new agreement events added in this phase
- Existing `INSTALLMENT_PAID` event is still used for payment registration

## Limitations

### Current Limitations
- Receipt generation is manual (not automatic after payment)
- No automatic receipt generation for installment payments
- No receipt template customization for agreements
- No separate receipt numbering for agreements

### Future Enhancements (Not in Phase 4)
- Automatic receipt generation option
- Receipt templates specific to agreements
- Separate receipt numbering sequences
- Batch receipt generation for multiple installments
- Receipt cancellation handling for agreements

## Testing

### Test Script

`scripts/test-payment-agreement-receipts.ts` tests:

1. **Payment of installment generates receipt**
   - Register installment payment
   - Generate receipt
   - Verify receipt created

2. **Receipt is linked to payment**
   - Verify `Payment.receiptId` is set
   - Verify correct receipt ID

3. **Receipt is linked to agreement**
   - Verify `Receipt.agreementId` matches agreement
   - Verify `Receipt.agreementNumber` matches
   - Verify `Receipt.installmentNumber` matches

4. **Receipt reflects correct amount**
   - Verify total amount matches payment amount

5. **Receipt reflects correct student**
   - Verify student ID matches
   - Verify student name matches

6. **Receipt reflects payment method**
   - Verify payment method matches

7. **Partial payment generates receipt for partial amount**
   - Register partial payment
   - Generate receipt
   - Verify receipt amount is partial

8. **Total payment generates receipt for total amount**
   - Register total payment
   - Generate receipt
   - Verify receipt amount is total

9. **No duplicate receipts for same payment**
   - Attempt to generate second receipt
   - Verify error is thrown

10. **Audit log registered**
    - Verify audit log entry exists
    - Verify correct action and entity

11. **Rollback on generation failure**
    - Attempt receipt with invalid payment
    - Verify transaction rolls back

12. **Cleanup in finally block**
    - Delete test receipts
    - Delete test payments
    - Delete test agreement

## Files Modified

### Backend
- `src/lib/server/financial/financial-service.ts`
  - Modified `issueReceipt` to include installment relation
  - Added handling for installment allocations
  - Added agreement field setting

### Frontend
- `src/routes/(app)/finanzas/convenios/[id]/+page.server.ts`
  - Added query for payments with receipts
  - Added mapping to simplified interface

- `src/routes/(app)/finanzas/convenios/[id]/+page.svelte`
  - Added PaymentWithReceipt interface
  - Added "Pagos y Recibos" section
  - Added receipt display and linking

### Test
- `scripts/test-payment-agreement-receipts.ts` (new)
  - Comprehensive test suite for receipt functionality

### Documentation
- `docs/PAYMENT_AGREEMENTS_PHASE_4_RECEIPTS.md` (new)
  - This document

## Integration with Existing Financial Module

### Reused Components
- `FinancialService.issueReceipt` - Modified, not duplicated
- `Receipt` model - Extended usage, no schema changes
- `ReceiptItem` model - Extended usage, no schema changes
- `Payment` model - Existing relation preserved
- `PaymentAllocation` model - Existing relation preserved

### No Breaking Changes
- Existing receipt generation for charge payments unchanged
- Existing receipt viewing unchanged
- Existing receipt templates unchanged
- Existing financial movements unchanged

## Technical Debt

### Known Issues
- None identified in this phase

### Future Considerations
- Consider automatic receipt generation option
- Consider receipt template customization
- Consider separate receipt numbering for different payment types
- Consider batch receipt operations

## Validation Checklist

- [x] No schema migrations required
- [x] No breaking changes to existing receipt functionality
- [x] Receipt generation works for both charge and installment payments
- [x] Receipt items correctly identify installment payments
- [x] Agreement fields correctly set in receipts
- [x] UI displays receipt information
- [x] UI links to existing receipt viewing
- [x] Audit logging works correctly
- [x] Test script covers all requirements
- [x] No use of `$queryRaw`, `$executeRaw`, `any`, `as any`, `@ts-ignore`, `@ts-expect-error`
