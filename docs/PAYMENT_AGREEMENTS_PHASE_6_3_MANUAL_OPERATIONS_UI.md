# Payment Agreements - Phase 6.3: Manual Operations UI

## Overview

Phase 6.3 adds visual tools and safe manual actions for operating the payment agreements module from the interface, before creating a production cron job. This allows authorized users to:

- View the complete status of an agreement
- View installments, payments, receipts, events, and relevant audit logs
- Execute manual evaluation of agreement status
- Execute manual evaluation of block exceptions
- View evaluation results
- Avoid dangerous or duplicate actions

## Screens Modified

### 1. Agreement Detail View

**Path:** `src/routes/(app)/finanzas/convenios/[id]/+page.svelte`

**Changes:**

- Added status card with color-coded status badge
- Added block exception status card (when active)
- Added manual actions section with evaluation buttons
- Enhanced installments table with color-coded status badges
- Added events section showing recent agreement events
- Improved visual hierarchy and information display

### 2. Agreement Detail Server Actions

**Path:** `src/routes/(app)/finanzas/convenios/[id]/+page.server.ts`

**Changes:**

- Added `evaluateStatus` action for manual status evaluation
- Added `evaluateBlockException` action for manual block exception evaluation
- Enhanced load function to include active exception data
- Enhanced load function to include recent events
- Added permission checks for manual evaluation actions

## Manual Actions Added

### 1. Evaluate Status

**Button:** "Evaluar Estado"
**Action:** `?/evaluateStatus`
**Server Method:** `paymentAgreementService.evaluateAgreementFinancialStatus()`

**What it does:**

- Marks overdue installments
- Evaluates if agreement should change status (ACTIVE → DEFAULTED, ACTIVE → COMPLETED)
- Records status change events
- Updates agreement status in database

**What it modifies:**

- PaymentAgreementInstallment.status (marks OVERDUE)
- PaymentAgreement.status (if conditions met)
- PaymentAgreementEvent (creates status change events)

**What it does NOT modify:**

- StudentCharge
- FinancialBlock
- Block exceptions

**Permissions required:**

- SUPERADMIN
- DIRECTOR
- FINANZAS
- SECRETARIA

### 2. Evaluate Block Exception

**Button:** "Evaluar Excepción de Bloqueo"
**Action:** `?/evaluateBlockException`
**Server Method:** `paymentAgreementService.evaluateAgreementBlockStatus()`

**What it does:**

- Evaluates if agreement should have a block exception
- Applies exception if agreement is ACTIVE and up-to-date
- Revokes exception if agreement is ACTIVE with OVERDUE installments
- Revokes exception if agreement is COMPLETED
- Creates BLOCK_EXCEPTION events
- Creates audit logs for exception changes

**What it modifies:**

- FinancialBlock.exceptionGranted
- FinancialBlock.exceptionAgreementId
- FinancialBlock.exceptionReason
- FinancialBlock.exceptionSource
- FinancialBlock.exceptionAt
- FinancialBlock.exceptionBy
- PaymentAgreementEvent (creates BLOCK_EXCEPTION events)
- AuditLog (creates exception change logs)

**What it does NOT modify:**

- StudentCharge
- New FinancialBlock entries
- Agreement status

**Permissions required:**

- SUPERADMIN
- DIRECTOR
- FINANZAS
- SECRETARIA

## UI Components Added

### Status Card

Shows agreement status with color-coded badge:

- **ACTIVE:** Green badge
- **COMPLETED:** Blue badge
- **DEFAULTED:** Red badge
- **DRAFT:** Gray badge
- **CANCELLED:** Orange badge

Displays:

- Creation date
- Original debt amount
- Agreed amount
- Paid amount
- Pending amount
- Reason
- Observations (if any)

### Block Exception Status Card

Shows when an active block exception exists for the agreement:

- Exception granted by
- Exception date
- Exception reason
- Exception source

### Installments Table

Shows all installments with color-coded status badges:

- **PAID:** Green badge
- **OVERDUE:** Red badge
- **PENDING:** Yellow badge
- **WAIVED:** Purple badge
- **CANCELLED:** Gray badge

Each installment shows:

- Installment number
- Due date
- Amount
- Paid amount
- Pending amount
- Status
- Payment form (for ACTIVE agreements with unpaid installments)

### Events Section

Shows recent agreement events (last 20):

- Event type
- Description
- Status changes (previous → new)
- Reason (if applicable)
- Date and time
- User who performed the action

## Data Loaded

The detail view now loads:

1. **Agreement data:** Full agreement details with installments
2. **Summary:** Installment counts and debt summary
3. **Payments with receipts:** Payment history linked to installments
4. **Active exception:** Current block exception (if any)
5. **Events:** Recent agreement events (last 20)

## How to Interpret Results

### Status Evaluation Result

When you click "Evaluar Estado", the page will reload and show:

- Updated agreement status (if changed)
- Updated installment statuses (overdue marked)
- New events in the events section

### Block Exception Evaluation Result

When you click "Evaluar Excepción de Bloqueo", the page will reload and show:

- Updated block exception status card (if changed)
- New BLOCK_EXCEPTION events in the events section
- Updated audit logs

**Scenarios:**

- **ACTIVE + up-to-date:** Exception applied (green card appears)
- **ACTIVE + OVERDUE:** Exception revoked (card disappears)
- **COMPLETED:** Exception revoked (card disappears)
- **DRAFT/CANCELLED:** No exception action taken

## Limitations

1. **No dry-run mode:** Manual actions execute immediately (unlike the batch script)
2. **No confirmation dialog:** Actions execute on button click
3. **No result preview:** Results shown after page reload
4. **Single agreement:** Actions only affect the viewed agreement
5. **No bulk operations:** Each agreement must be evaluated individually
6. **No undo function:** Actions must be reversed manually if needed

## What Remains Before Production Cron

1. **Automated scheduling:** Create cron job to run evaluations periodically
2. **Batch processing:** Use `evaluateAllAgreementBlockExceptions` for all agreements
3. **Dry-run capability:** Add dry-run mode to UI for preview
4. **Confirmation dialogs:** Add confirmation before executing actions
5. **Bulk operations:** Add ability to evaluate multiple agreements at once
6. **Undo functionality:** Add ability to reverse recent actions
7. **Notification system:** Add alerts for status changes
8. **Audit trail review:** Add dedicated audit log viewer

## Safety Features

1. **Permission checks:** Only authorized roles can execute manual actions
2. **Idempotency:** Repeated evaluations don't create duplicate events
3. **Validation:** Service methods validate before applying changes
4. **Event logging:** All changes are logged in PaymentAgreementEvent
5. **Audit logging:** Exception changes are logged in AuditLog
6. **No StudentCharge modification:** Manual actions don't affect charges
7. **No new FinancialBlock:** Manual actions only modify existing blocks

## Testing

### Test Script

**Path:** `scripts/test-payment-agreement-manual-operations.ts`

**Test Coverage:**

1. Manual status evaluation
2. Manual block exception evaluation
3. ACTIVE up-to-date applies exception
4. ACTIVE + OVERDUE revokes exception
5. COMPLETED revokes unnecessary exception
6. No StudentCharge modification
7. No new FinancialBlock created
8. No duplicate events on repeated execution
9. Permissions validation

**Run tests:**

```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" npx tsx scripts/test-payment-agreement-manual-operations.ts
```

**Expected result:** 9/9 tests passed

## Files Modified

1. `src/routes/(app)/finanzas/convenios/[id]/+page.server.ts` - Added actions and data loading
2. `src/routes/(app)/finanzas/convenios/[id]/+page.svelte` - Enhanced UI with manual actions
3. `scripts/test-payment-agreement-manual-operations.ts` - New test script

## Files Created

1. `docs/PAYMENT_AGREEMENTS_PHASE_6_3_MANUAL_OPERATIONS_UI.md` - This documentation

## Next Steps

After Phase 6.3, the next phase should focus on:

1. Creating the production cron job
2. Adding dry-run capability to the UI
3. Adding confirmation dialogs
4. Implementing bulk operations
5. Adding notification system
6. Creating audit log viewer
