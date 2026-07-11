# PAYMENT AGREEMENTS - PHASE 6.2: BLOCK EXCEPTION BATCH EVALUATION

**Date:** 2026-06-27
**Scope:** Automated batch evaluation of agreement block exceptions
**Objective:** Create safe, idempotent batch evaluation for block exception management

---

## Overview

Phase 6.2 introduces automated batch evaluation of block exceptions for payment agreements. This phase focuses on creating a safe, idempotent batch operation that can be executed manually or scheduled via cron jobs, building on the Phase 6.1 batch evaluation foundation.

**Key Principle:** Apply or revoke block exceptions based on agreement status and payment behavior, without creating new blocks or modifying core financial data.

---

## What This Phase Does

### Batch Evaluation Method

Added `evaluateAllAgreementBlockExceptions()` to `PaymentAgreementService`:

```typescript
async evaluateAllAgreementBlockExceptions(options: {
  dryRun?: boolean;
  systemUserId?: string;
  systemUserName?: string;
}): Promise<{
  totalEvaluated: number;
  exceptionsApplied: number;
  exceptionsRevoked: number;
  agreementsUnchanged: number;
  agreementsSkipped: number;
  errors: Array<{
    agreementId: string;
    agreementNumber: number;
    agreementYear: number;
    error: string;
  }>;
}>
```

### Evaluation Logic

For each relevant agreement (ACTIVE, DEFAULTED, COMPLETED):

1. **Evaluate if Exception Should Exist**
   - Uses existing `evaluateAgreementBlockException()` logic
   - Considers agreement status, overdue installments, payment history

2. **Check Current Exception Status**
   - Uses existing `getActiveAgreementBlockException()` logic
   - Identifies if an exception already exists for this agreement

3. **Apply Exception if Needed**
   - If should have exception but doesn't: apply it
   - Uses existing `applyAgreementBlockException()` logic
   - Only applies to ACTIVE agreements with no overdue installments

4. **Revoke Exception if Needed**
   - If should not have exception but has one: revoke it
   - Uses existing `revokeAgreementBlockException()` logic
   - Revokes for overdue, defaulted, or completed agreements

5. **Error Handling**
   - Errors in individual agreements don't stop the batch
   - Errors are logged and returned in the summary

### Dry Run Mode

The method supports `dryRun: true` to simulate evaluation without making changes:

- Fetches all relevant agreements
- Simulates the evaluation logic
- Returns predicted results
- **Does not modify FinancialBlock, events, or audit logs**

---

## Manual Execution

### Script Location

```
scripts/evaluate-payment-agreement-block-exceptions.ts
```

### Usage

**Normal execution (with changes):**

```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" npx tsx scripts/evaluate-payment-agreement-block-exceptions.ts
```

**Dry run (no changes):**

```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" npx tsx scripts/evaluate-payment-agreement-block-exceptions.ts --dry-run
```

### Output Example

```
🔄 Payment Agreement Block Exception Batch Evaluation

🚀 EXECUTION MODE - Changes will be applied

📊 Results Summary:
═══════════════════════════════════════════════════════════
Total agreements evaluated: 15
Exceptions applied: 3
Exceptions revoked: 2
Agreements unchanged: 10
Agreements skipped: 0
Errors encountered: 0
Execution time: 1.87s
═══════════════════════════════════════════════════════════

✅ Completed successfully
```

---

## Agreements Evaluated

### Agreements Included in Evaluation

**ACTIVE Agreements**

- Evaluated for exception application or revocation
- Apply exception if up-to-date (no overdue installments)
- Revoke exception if overdue installments exist

**DEFAULTED Agreements**

- Evaluated for exception revocation only
- Revoke exception if exists (defaulted agreements should not have exceptions)

**COMPLETED Agreements**

- Evaluated for exception revocation only
- Revoke exception if exists (completed agreements don't need exceptions)

### Agreements Excluded from Evaluation

**DRAFT Agreements**

- Not evaluated (not yet activated)
- Exception application is not relevant
- **Rule:** DRAFT agreements never apply exceptions
- **Orphan Exception Handling:** If a DRAFT agreement has an active exception, it is NOT revoked in this phase. This is reserved for future phases (Phase 6.3: Orphan Exception Cleanup).

**CANCELLED Agreements**

- Not evaluated (manually cancelled)
- Exception application is not relevant
- **Rule:** CANCELLED agreements never apply exceptions
- **Orphan Exception Handling:** If a CANCELLED agreement has an active exception, it is NOT revoked in this phase. This is reserved for future phases (Phase 6.3: Orphan Exception Cleanup).

**Design Decision:** The batch evaluation explicitly excludes DRAFT and CANCELLED agreements from evaluation. This is intentional to avoid edge cases and to allow for a dedicated orphan exception cleanup phase that can handle these scenarios with proper validation and user notification.

---

## When Exceptions Are Applied

### Conditions for Application

An exception is applied when:

1. **Agreement Status:** ACTIVE
2. **No Overdue Installments:** All installments are PENDING or PAID
3. **No Existing Exception:** No active exception exists for this agreement
4. **Financial Block Exists:** A financial block exists for the student

### Side Effects

- Sets `exceptionGranted = true` on FinancialBlock
- Sets `exceptionSource = 'PAYMENT_AGREEMENT'`
- Sets `exceptionAgreementId` to the agreement ID
- Sets `exceptionAt` timestamp
- Creates `BLOCK_EXCEPTION` event
- Creates audit log

---

## When Exceptions Are Revoked

### Conditions for Revocation

An exception is revoked when:

1. **Agreement Status is ACTIVE with Overdue Installments**
   - Exception exists for this agreement
   - Agreement has overdue installments
   - **Critical:** This prevents students with overdue agreements from maintaining block exceptions

2. **Agreement Status is DEFAULTED**
   - Exception exists for this agreement
   - Agreement is in DEFAULTED status

3. **Agreement Status is COMPLETED**
   - Exception exists for this agreement
   - Agreement is in COMPLETED status

### Side Effects

- Sets `exceptionGranted = false` on FinancialBlock
- Clears `exceptionSource`
- Clears `exceptionAgreementId`
- Creates `BLOCK_EXCEPTION` event
- Creates audit log

---

## What This Phase Does NOT Do

### No New Financial Blocks

- Does not create new financial blocks
- Only updates existing blocks when applying/revoking exceptions
- Block creation is reserved for other processes

### No StudentCharge Modifications

- Original charges are not modified
- Charge relations are snapshots, not destructive
- `newStatus` field in charge relations is NOT updated

### No Global Report Changes

- Financial reports are not modified
- Dashboard metrics are not recalculated
- This is reserved for future phases

### No Orphan Exception Cleanup

- Does not clean up exceptions for DRAFT or CANCELLED agreements
- This is reserved for future phases

### No Cron Job Creation

- No cron job is created in this phase
- The script is prepared for cron but not deployed
- This requires understanding the production environment

---

## Idempotency

### Execution Repeated

Running the batch evaluation multiple times is safe:

1. **First execution:**
   - Applies exceptions where needed
   - Revokes exceptions where needed
   - Creates events and audit logs

2. **Second execution:**
   - Skips agreements that already have correct exception status
   - No duplicate exceptions applied
   - No duplicate events or audit logs

### Exception Duplication Prevention

- `applyAgreementBlockException` checks for existing exceptions
- Already granted exceptions are skipped
- Revoked exceptions are not re-applied unless conditions change
- Events are only created on actual state changes

---

## Error Handling

### Individual Agreement Errors

If an agreement fails to evaluate:

- Error is logged in the results summary
- Batch continues processing other agreements
- Error includes agreement ID, number, year, and message

### Example Error Output

```
❌ Errors:
═══════════════════════════════════════════════════════════
  Agreement 123/2026 (abc123):
    Agreement not found
  Agreement 456/2026 (def456):
    Financial block not found
═══════════════════════════════════════════════════════════
```

### Exit Codes

- `0`: Success (no errors)
- `1`: Errors encountered (but batch completed)

---

## Connecting to Cron (Future)

### Production Environment Considerations

Before deploying to cron, verify:

1. **Database Access**
   - Script can connect to production database
   - DATABASE_URL is properly configured
   - Network/firewall rules allow access

2. **User Permissions**
   - System user has necessary permissions
   - Audit logs are properly attributed
   - User ID 'SYSTEM' exists or is created

3. **Logging**
   - Output is captured (e.g., syslog, file)
   - Errors are monitored
   - Success/failure notifications are configured

4. **Execution Time**
   - Batch completes within acceptable time window
   - No performance impact on production
   - Database load is acceptable

### Example Cron Configuration (Future)

```cron
# Daily evaluation at 2:30 AM (after status evaluation)
30 2 * * * cd /path/to/sistema-freire && DATABASE_URL="postgresql://..." npx tsx scripts/evaluate-payment-agreement-block-exceptions.ts >> /var/log/payment-agreement-exceptions.log 2>&1
```

### Recommended Schedule

- **Daily:** Evaluate all relevant agreements after status evaluation
- **Time:** Low-traffic period (e.g., 2:30 AM, 30 minutes after status evaluation)
- **Order:** Run status evaluation first, then exception evaluation
- **Monitoring:** Log aggregation and alerting

---

## Limitations

### Current Limitations

1. **No Orphan Exception Cleanup**
   - DRAFT and CANCELLED agreements with exceptions are not cleaned up
   - Future phases may add orphan exception cleanup

2. **No New Block Creation**
   - Only updates existing blocks
   - Does not create new blocks for students without blocks
   - This is by design (block creation is separate process)

3. **No Period Filtering**
   - Batch evaluates all relevant agreements regardless of creation date
   - Future phases may add date range filtering

4. **No Notification**
   - No email or notification when exceptions change
   - Future phases may add notification hooks

### Known Safe Limitations

These limitations are intentional and safe:

- **Idempotency:** Repeated execution is safe
- **No Destructive Changes:** Original charges and core data are not modified
- **Error Isolation:** Individual agreement errors don't stop the batch
- **Audit Trail:** All changes are logged

---

## Testing

### Test Script

```
scripts/test-payment-agreement-block-exception-batch.ts
```

### Test Coverage

The test script validates:

1. **Dry Run Mode**
   - Evaluates without making changes
   - Returns predicted results
   - No FinancialBlock modification
   - No events created
   - No audit logs created

2. **Actual Evaluation**
   - Applies exceptions for up-to-date ACTIVE agreements
   - Revokes exceptions for overdue ACTIVE agreements
   - Revokes exceptions for DEFAULTED agreements
   - Revokes exceptions for COMPLETED agreements
   - Leaves unchanged agreements unchanged

3. **Idempotency**
   - Second execution doesn't duplicate exceptions
   - No duplicate events
   - No duplicate audit logs

4. **Error Handling**
   - Errors in individual agreements don't stop batch
   - Errors are properly logged
   - Batch continues processing

5. **Non-Destructive**
   - StudentCharge records are not modified
   - Only FinancialBlock is updated (existing blocks only)

6. **Audit Trail**
   - Events are created for exception changes
   - Audit logs are created
   - System user is properly attributed

### Running Tests

```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" npx tsx scripts/test-payment-agreement-block-exception-batch.ts
```

---

## What's Next: Phase 6.3

Phase 6.3 may add:

1. **Orphan Exception Cleanup**
   - Clean up exceptions for DRAFT agreements
   - Clean up exceptions for CANCELLED agreements
   - Ensure data consistency

2. **Enhanced Scheduling**
   - Period filtering for evaluation
   - Configurable evaluation rules
   - Notification hooks

3. **Production Deployment**
   - Cron job configuration
   - Monitoring and alerting
   - Rollback procedures

---

## Files Changed

### Service Layer

```
src/lib/server/payment-agreements/payment-agreement-service.ts
- Added method: evaluateAllAgreementBlockExceptions()
- Lines added: ~115
```

### Scripts

```
scripts/evaluate-payment-agreement-block-exceptions.ts
- New file: Block exception batch evaluation script
- Lines: ~85

scripts/test-payment-agreement-block-exception-batch.ts
- New file: Comprehensive test script
- Lines: ~550
```

### Documentation

```
docs/PAYMENT_AGREEMENTS_PHASE_6_2_BLOCK_EXCEPTION_BATCH.md
- New file: This document
```

---

## Validation Checklist

Before deploying to production:

- [x] Dry run mode works correctly
- [x] Actual evaluation works correctly
- [x] Idempotency verified
- [x] Error handling verified
- [x] StudentCharge not modified
- [x] Only existing FinancialBlock updated
- [x] No new FinancialBlock created
- [x] Events and audit logs created
- [x] No forbidden patterns (`any`, `@ts-ignore`, etc.)
- [x] No raw SQL (`$queryRaw`, `$executeRaw`)
- [x] Schema unchanged
- [x] No migrations created
- [x] `npm run check` passes
- [x] `npm run build` passes
- [x] Test script passes

---

## Summary

Phase 6.2 successfully implements safe, idempotent batch evaluation of agreement block exceptions. The implementation:

- ✅ Evaluates ACTIVE, DEFAULTED, and COMPLETED agreements
- ✅ Applies exceptions for up-to-date ACTIVE agreements
- ✅ Revokes exceptions for overdue, defaulted, or completed agreements
- ✅ Supports dry-run mode
- ✅ Is idempotent (safe to run repeatedly)
- ✅ Handles errors gracefully
- ✅ Creates comprehensive audit trail
- ✅ Does not modify StudentCharge
- ✅ Does not create new FinancialBlock
- ✅ Does not create cron jobs
- ✅ Is ready for manual execution
- ✅ Is prepared for future cron deployment

**Status:** ✅ **READY FOR MANUAL EXECUTION**

**Next Step:** Phase 6.3 (Orphan Exception Cleanup and Enhanced Scheduling)
