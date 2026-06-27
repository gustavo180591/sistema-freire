# Payment Agreements - Phase 6.4: Production Operation Checklist

## Overview

Phase 6.4 documents the operational procedures for running payment agreement batch evaluations in production before automating with a cron job. This checklist ensures safe manual operation and provides a foundation for future automation.

**Status:** Documentation phase only - no code changes, no cron implementation.

---

## 1. Current Module Status

### Completed Features
- ✅ Agreement creation (draft and activation)
- ✅ Payment registration against installments
- ✅ Manual status evaluation (mark overdue, evaluate completion/default)
- ✅ Manual block exception evaluation (apply/revoke exceptions)
- ✅ Batch status evaluation script with dry-run
- ✅ Batch block exception evaluation script with dry-run
- ✅ UI for manual operations on individual agreements
- ✅ Permission system for manual operations
- ✅ Event logging for all operations
- ✅ Audit logging for critical operations
- ✅ Integrated debt reporting
- ✅ Global audit log

### Database Schema
- 29 migrations applied
- Schema up to date
- No pending migrations

### Available Scripts
- `scripts/test-payment-agreement-batch-status.ts` - Batch status evaluation
- `scripts/test-payment-agreement-block-exception-batch.ts` - Batch block exception evaluation
- `scripts/test-payment-agreement-manual-operations.ts` - Manual operations test

---

## 2. Manual Commands Available

### 2.1 Batch Status Evaluation

**Script:** `scripts/test-payment-agreement-batch-status.ts`

**Purpose:** Evaluate all active payment agreements and update their status based on:
- Overdue installments (mark as OVERDUE)
- Completion (all installments PAID → COMPLETED)
- Default (2+ consecutive overdue or >50% overdue → DEFAULTED)

**Execution:**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-batch-status.ts
```

**What it does:**
- Iterates through all ACTIVE agreements
- Marks overdue installments
- Evaluates status changes
- Records status change events
- Updates agreement status in database

**What it modifies:**
- `PaymentAgreementInstallment.status` (marks OVERDUE)
- `PaymentAgreement.status` (if conditions met)
- `PaymentAgreementEvent` (creates status change events)

**What it does NOT modify:**
- `StudentCharge`
- `FinancialBlock`
- Block exceptions

### 2.2 Batch Block Exception Evaluation

**Script:** `scripts/test-payment-agreement-block-exception-batch.ts`

**Purpose:** Evaluate all payment agreements and apply/revoke block exceptions based on:
- ACTIVE + up-to-date → apply exception
- ACTIVE + OVERDUE → revoke exception
- COMPLETED → revoke exception
- DRAFT/CANCELLED/DEFAULTED → no action

**Execution:**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-block-exception-batch.ts
```

**What it does:**
- Iterates through all agreements
- Evaluates if exception should exist
- Applies exception if conditions met
- Revokes exception if conditions not met
- Creates BLOCK_EXCEPTION events
- Creates audit logs for exception changes

**What it modifies:**
- `FinancialBlock.exceptionGranted`
- `FinancialBlock.exceptionAgreementId`
- `FinancialBlock.exceptionReason`
- `FinancialBlock.exceptionSource`
- `FinancialBlock.exceptionAt`
- `FinancialBlock.exceptionBy`
- `PaymentAgreementEvent` (creates BLOCK_EXCEPTION events)
- `AuditLog` (creates exception change logs)

**What it does NOT modify:**
- `StudentCharge`
- New `FinancialBlock` entries
- Agreement status

### 2.3 Manual UI Operations

**UI Path:** `/finanzas/convenios/[id]`

**Available Actions:**
- "Evaluar Estado" - Evaluate single agreement status
- "Evaluar Excepción de Bloqueo" - Evaluate single agreement block exception

**What they do:**
- Same logic as batch scripts but for single agreement
- Permission checks (SUPERADMIN, DIRECTOR, FINANZAS, SECRETARIA)
- Return success/error messages to UI

---

## 3. Dry-Run Mode

### 3.1 Status Evaluation Dry-Run

**Command:**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-batch-status.ts --dry-run
```

**What it does:**
- Simulates evaluation without modifying database
- Reports what would change
- Shows agreements that would change status
- Shows installments that would be marked overdue

**What it does NOT do:**
- Modify any database records
- Create events
- Create audit logs

### 3.2 Block Exception Evaluation Dry-Run

**Command:**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-block-exception-batch.ts --dry-run
```

**What it does:**
- Simulates exception evaluation without modifying database
- Reports which agreements would get exceptions
- Reports which exceptions would be revoked
- Shows before/after state

**What it does NOT do:**
- Modify any database records
- Create events
- Create audit logs
- Modify FinancialBlock

---

## 4. Pre-Execution Checklist

### Before Running Batch Status Evaluation

- [ ] **Backup verification**: Confirm recent database backup exists (within last 24 hours)
- [ ] **Maintenance window**: Confirm this is during low-traffic period
- [ ] **Dry-run completed**: Run `--dry-run` first and review output
- [ ] **Review dry-run results**: Confirm expected changes are reasonable
- [ ] **Check for active payments**: No payments being processed currently
- [ ] **Check for active UI sessions**: No users actively editing agreements
- [ ] **Notify stakeholders**: Inform finance team of status evaluation
- [ ] **Prepare rollback plan**: Know how to revert if needed
- [ ] **Test script locally**: Run on staging/test environment first
- [ ] **Review recent changes**: Check if any recent code changes affect this
- [ ] **Check database connectivity**: Confirm database is accessible
- [ ] **Verify environment variables**: Confirm DATABASE_URL is correct
- [ ] **Review logs**: Check for any recent errors in application logs

### Before Running Batch Block Exception Evaluation

- [ ] **Backup verification**: Confirm recent database backup exists (within last 24 hours)
- [ ] **Maintenance window**: Confirm this is during low-traffic period
- [ ] **Dry-run completed**: Run `--dry-run` first and review output
- [ ] **Review dry-run results**: Confirm expected exception changes are reasonable
- [ ] **Check for active enrollments**: No enrollments being processed currently
- [ ] **Check for active blocks**: No manual block operations in progress
- [ ] **Notify stakeholders**: Inform finance team of exception evaluation
- [ ] **Prepare rollback plan**: Know how to revert if needed
- [ ] **Test script locally**: Run on staging/test environment first
- [ ] **Review recent changes**: Check if any recent code changes affect this
- [ ] **Check database connectivity**: Confirm database is accessible
- [ ] **Verify environment variables**: Confirm DATABASE_URL is correct
- [ ] **Review logs**: Check for any recent errors in application logs

---

## 5. Post-Execution Checklist

### After Running Batch Status Evaluation

- [ ] **Review script output**: Confirm no errors in execution
- [ ] **Check event logs**: Verify status change events were created correctly
- [ ] **Verify agreement counts**: Confirm expected number of agreements changed status
- [ ] **Check for unexpected COMPLETED**: Review newly completed agreements
- [ ] **Check for unexpected DEFAULTED**: Review newly defaulted agreements
- [ ] **Verify overdue count**: Confirm overdue installments marked correctly
- [ ] **Review audit logs**: Check for any audit log entries
- [ ] **Test UI access**: Confirm agreement detail pages load correctly
- [ ] **Check for orphaned records**: Verify no data inconsistencies
- [ ] **Monitor application logs**: Check for any errors in application logs
- [ ] **Notify stakeholders**: Inform finance team of completion
- [ ] **Document results**: Record number of agreements changed, any issues

### After Running Batch Block Exception Evaluation

- [ ] **Review script output**: Confirm no errors in execution
- [ ] **Check event logs**: Verify BLOCK_EXCEPTION events were created correctly
- [ ] **Check audit logs**: Verify audit logs for exception changes
- [ ] **Verify exception grants**: Confirm exceptions granted to correct agreements
- [ ] **Verify exception revokes**: Confirm exceptions revoked from correct agreements
- [ ] **Check FinancialBlock state**: Verify block exception fields updated correctly
- [ ] **Review affected students**: Check which students have block status changed
- [ ] **Test enrollment access**: Verify enrollment permissions updated correctly
- [ ] **Check for duplicate exceptions**: Verify no duplicate exceptions
- [ ] **Monitor application logs**: Check for any errors in application logs
- [ ] **Notify stakeholders**: Inform finance team of completion
- [ ] **Document results**: Record number of exceptions granted/revoked, any issues

---

## 6. Known Risks

### 6.1 Status Evaluation Risks

**Risk 1: Incorrect Status Changes**
- **Description:** Agreements may change status unexpectedly
- **Mitigation:** Run dry-run first, review results before execution
- **Impact:** Students may see incorrect agreement status in UI
- **Recovery:** Manual status correction via UI or database

**Risk 2: Overdue Marking During Payment Processing**
- **Description:** Installment marked overdue while payment is being processed
- **Mitigation:** Run during low-traffic periods, check for active payments
- **Impact:** Student may see overdue status despite payment
- **Recovery:** Payment processing will update installment status

**Risk 3: False Default Detection**
- **Description:** Agreement marked DEFAULTED incorrectly due to calculation error
- **Mitigation:** Review default logic, test with sample data
- **Impact:** Student may be blocked incorrectly
- **Recovery:** Manual status correction, revoke block exception

### 6.2 Block Exception Evaluation Risks

**Risk 1: Incorrect Exception Grants**
- **Description:** Exception granted to agreement that shouldn't have it
- **Mitigation:** Run dry-run first, review affected agreements
- **Impact:** Student with debt may be able to enroll
- **Recovery:** Revoke exception manually

**Risk 2: Incorrect Exception Revokes**
- **Description:** Exception revoked from agreement that should keep it
- **Mitigation:** Run dry-run first, review affected agreements
- **Impact:** Student may be blocked unexpectedly
- **Recovery:** Grant exception manually

**Risk 3: Race Conditions with Manual Operations**
- **Description:** Manual UI operation conflicts with batch evaluation
- **Mitigation:** Run during low-traffic periods, check for active UI sessions
- **Impact:** Unexpected state, duplicate events
- **Recovery:** Manual correction, review event logs

### 6.3 General Risks

**Risk 1: Database Connection Issues**
- **Description:** Script fails mid-execution due to database issues
- **Mitigation:** Verify database connectivity, check recent logs
- **Impact:** Partial updates, inconsistent state
- **Recovery:** Re-run script, review affected records

**Risk 2: Large Dataset Performance**
- **Description:** Script takes too long with many agreements
- **Mitigation:** Monitor execution time, consider batching
- **Impact:** Extended maintenance window
- **Recovery:** Optimize script, run during longer window

**Risk 3: Permission Issues**
- **Description:** Script runs with insufficient database permissions
- **Mitigation:** Verify database user permissions before execution
- **Impact:** Script fails, no updates applied
- **Recovery:** Fix permissions, re-run script

---

## 7. Database Review (Non-Destructive)

### 7.1 Review Agreement Status Changes

**Query to check recent status changes:**
```sql
SELECT 
    id,
    agreementNumber,
    agreementYear,
    status,
    studentId,
    studentName,
    updatedAt
FROM "PaymentAgreement"
WHERE "updatedAt" > NOW() - INTERVAL '1 hour'
ORDER BY "updatedAt" DESC;
```

**Query to check status distribution:**
```sql
SELECT 
    status,
    COUNT(*) as count
FROM "PaymentAgreement"
GROUP BY status
ORDER BY count DESC;
```

### 7.2 Review Installment Status Changes

**Query to check overdue installments:**
```sql
SELECT 
    pai.id,
    pai."agreementId",
    pai."installmentNumber",
    pai.status,
    pai."dueDate",
    pa."studentId"
FROM "PaymentAgreementInstallment" pai
JOIN "PaymentAgreement" pa ON pai."agreementId" = pa.id
WHERE pai.status = 'OVERDUE'
ORDER BY pai."dueDate" DESC;
```

### 7.3 Review Block Exception Changes

**Query to check active exceptions:**
```sql
SELECT 
    fb.id,
    fb."studentId",
    fb."exceptionGranted",
    fb."exceptionAgreementId",
    fb."exceptionReason",
    fb."exceptionAt",
    fb."exceptionBy"
FROM "FinancialBlock" fb
WHERE fb."exceptionGranted" = true
ORDER BY fb."exceptionAt" DESC;
```

**Query to check recent exception changes:**
```sql
SELECT 
    fb.id,
    fb."studentId",
    fb."exceptionGranted",
    fb."exceptionAgreementId",
    fb."exceptionAt",
    fb."exceptionBy"
FROM "FinancialBlock" fb
WHERE fb."exceptionAt" > NOW() - INTERVAL '1 hour'
ORDER BY fb."exceptionAt" DESC;
```

### 7.4 Review Event Logs

**Query to check recent status events:**
```sql
SELECT 
    id,
    "agreementId",
    "eventType",
    "previousStatus",
    "newStatus",
    "createdAt",
    "userId",
    "userName"
FROM "PaymentAgreementEvent"
WHERE "eventType" = 'STATUS_CHANGE'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
```

**Query to check recent block exception events:**
```sql
SELECT 
    id,
    "agreementId",
    "eventType",
    "description",
    "createdAt",
    "userId",
    "userName"
FROM "PaymentAgreementEvent"
WHERE "eventType" = 'BLOCK_EXCEPTION'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
```

---

## 8. Logs and Audit Review

### 8.1 Application Logs

**Location:** Application logs (typically in `/var/log/` or cloud logging service)

**What to check:**
- Errors during script execution
- Database connection issues
- Permission errors
- Unexpected exceptions

**Key log patterns to monitor:**
- `Error evaluating agreement status`
- `Error evaluating block exception`
- `Database connection failed`
- `Permission denied`

### 8.2 Event Logs

**Location:** Database table `PaymentAgreementEvent`

**What to check:**
- Status change events (eventType: 'STATUS_CHANGE')
- Block exception events (eventType: 'BLOCK_EXCEPTION')
- Payment events (eventType: 'PAYMENT_REGISTERED')
- Creation events (eventType: 'AGREEMENT_CREATED')

**Key fields to review:**
- `eventType` - Type of event
- `previousStatus` / `newStatus` - Status changes
- `description` - Event description
- `reason` - Reason for change (if applicable)
- `createdAt` - When event occurred
- `userId` / `userName` - Who performed action

### 8.3 Audit Logs

**Location:** Database table `AuditLog`

**What to check:**
- Block exception changes (action: 'GRANT_BLOCK_EXCEPTION', 'REVOKE_BLOCK_EXCEPTION')
- Agreement status changes (action: 'UPDATE_AGREEMENT_STATUS')
- Payment registrations (action: 'REGISTER_PAYMENT')

**Key fields to review:**
- `action` - Action performed
- `entityType` - Type of entity affected
- `entityId` - ID of affected entity
- `changes` - JSON of changes made
- `userId` / `userName` - Who performed action
- `createdAt` - When action occurred

---

## 9. Authorized Roles

### 9.1 Manual UI Operations

**Authorized roles for manual evaluation:**
- SUPERADMIN
- DIRECTOR
- FINANZAS
- SECRETARIA

**Unauthorized roles:**
- ALUMNO
- DOCENTE
- PRECEPTOR
- Any other role

**Permission check location:** `src/lib/server/payment-agreements/payment-agreement-permissions.ts`

**Functions:**
- `canEvaluateAgreementStatus(user)`
- `canEvaluateAgreementBlockException(user)`

### 9.2 Batch Script Execution

**Authorization model:**
- Scripts run with database credentials
- No role-based authorization at script level
- Authorization is operational (who can run the script)

**Recommended operational authorization:**
- Only DevOps/SysAdmin should execute scripts
- Scripts should be run from production server
- Execution should be logged
- Database credentials should be secured

### 9.3 Dry-Run Access

**Authorization:**
- Dry-run can be run by any authorized personnel
- Recommended for pre-production validation
- No database modifications, lower risk

---

## 10. Pre-Cron Procedure

### 10.1 Manual Operation Period

**Duration:** 2-4 weeks of manual operation before cron automation

**Objectives:**
- Validate batch scripts work correctly in production
- Identify any edge cases or issues
- Establish baseline metrics
- Train operations team
- Refine checklists based on experience

### 10.2 Recommended Schedule

**Week 1-2: Daily Manual Execution**
- Run status evaluation daily at 10:00 PM
- Run block exception evaluation daily at 10:30 PM
- Review results each morning
- Document any issues

**Week 3-4: Weekly Manual Execution**
- Run status evaluation weekly on Sunday at 10:00 PM
- Run block exception evaluation weekly on Sunday at 10:30 PM
- Review results Monday morning
- Document any issues

### 10.3 Metrics to Track

**Status Evaluation Metrics:**
- Number of agreements evaluated
- Number of status changes (ACTIVE → COMPLETED, ACTIVE → DEFAULTED)
- Number of overdue installments marked
- Execution time
- Any errors encountered

**Block Exception Metrics:**
- Number of agreements evaluated
- Number of exceptions granted
- Number of exceptions revoked
- Execution time
- Any errors encountered

**Quality Metrics:**
- Number of manual corrections needed
- Number of false positives/negatives
- User feedback on accuracy
- System stability

### 10.4 Decision Criteria for Cron

**Proceed to cron if:**
- 2+ weeks of successful manual execution
- No critical issues encountered
- Metrics are stable and predictable
- Operations team is trained
- Checklists are refined

**Delay cron if:**
- Critical issues encountered
- High rate of manual corrections needed
- Unpredictable execution times
- User feedback indicates problems

---

## 11. Future Cron Proposal (Not Implemented)

### 11.1 Proposed Schedule

**Status Evaluation Cron:**
- **Frequency:** Daily
- **Time:** 10:00 PM (low-traffic period)
- **Script:** Custom cron job calling batch evaluation script
- **Logging:** Output to application logs
- **Alerting:** Alert on failure

**Block Exception Evaluation Cron:**
- **Frequency:** Daily
- **Time:** 10:30 PM (after status evaluation)
- **Script:** Custom cron job calling batch evaluation script
- **Logging:** Output to application logs
- **Alerting:** Alert on failure

### 11.2 Proposed Implementation

**Option A: System Cron**
```bash
# Status evaluation
0 22 * * * cd /path/to/sistema-freire && DATABASE_URL="postgresql://..." npx tsx scripts/test-payment-agreement-batch-status.ts >> /var/log/payment-agreements-status.log 2>&1

# Block exception evaluation
30 22 * * * cd /path/to/sistema-freire && DATABASE_URL="postgresql://..." npx tsx scripts/test-payment-agreement-block-exception-batch.ts >> /var/log/payment-agreements-exceptions.log 2>&1
```

**Option B: Node.js Cron Scheduler**
- Create dedicated cron service
- Run within application process
- Better logging and error handling
- Easier to monitor

**Option C: Cloud Scheduler (AWS/GCP/Azure)**
- Use cloud-native scheduler
- Better integration with cloud monitoring
- Easier to manage in cloud environment

### 11.3 Proposed Monitoring

**Health Checks:**
- Script execution success/failure
- Execution time
- Number of agreements processed
- Number of changes made

**Alerting:**
- Script failure
- Execution time > threshold
- Unusual number of changes
- Database errors

**Dashboard:**
- Last execution time
- Last execution status
- Number of agreements processed
- Number of changes made
- Trend charts

### 11.4 Proposed Rollback

**Manual Rollback:**
- Disable cron temporarily
- Run manual corrections
- Re-enable cron after fix

**Automated Rollback:**
- Not recommended initially
- Consider after proven stability
- Requires complex logic

---

## 12. Rollback and Diagnostic Plan

### 12.1 Rollback Procedures

**Status Evaluation Rollback**

**Scenario 1: Incorrect Status Changes**
1. Identify affected agreements from event logs
2. Manually correct status via UI
3. Re-run status evaluation with corrected logic
4. Verify no further issues

**Scenario 2: Incorrect Overdue Marking**
1. Identify affected installments from event logs
2. Manually correct installment status via UI
3. Re-run status evaluation with corrected logic
4. Verify no further issues

**Block Exception Rollback**

**Scenario 1: Incorrect Exception Grants**
1. Identify incorrectly granted exceptions from audit logs
2. Manually revoke exceptions via UI or script
3. Re-run block exception evaluation with corrected logic
4. Verify no further issues

**Scenario 2: Incorrect Exception Revokes**
1. Identify incorrectly revoked exceptions from audit logs
2. Manually grant exceptions via UI or script
3. Re-run block exception evaluation with corrected logic
4. Verify no further issues

### 12.2 Diagnostic Procedures

**Step 1: Review Script Output**
- Check for error messages
- Review summary statistics
- Identify any anomalies

**Step 2: Review Event Logs**
- Query recent events
- Identify unexpected events
- Correlate with script output

**Step 3: Review Audit Logs**
- Query recent audit entries
- Identify unexpected changes
- Correlate with script output

**Step 4: Review Application Logs**
- Check for errors
- Identify database issues
- Identify permission issues

**Step 5: Review Database State**
- Query agreement status distribution
- Query installment status distribution
- Query block exception state
- Compare with expected state

**Step 6: Test Manual Operations**
- Test UI operations on sample agreement
- Verify manual operations work correctly
- Identify if issue is batch-specific

### 12.3 Common Issues and Solutions

**Issue: Script fails with database connection error**
- **Solution:** Verify DATABASE_URL, check database connectivity, restart script

**Issue: Script fails with permission error**
- **Solution:** Verify database user permissions, grant necessary permissions

**Issue: Script takes too long**
- **Solution:** Review number of agreements, consider batching, optimize queries

**Issue: Unexpected status changes**
- **Solution:** Review event logs, identify root cause, correct manually, fix logic

**Issue: Unexpected exception changes**
- **Solution:** Review audit logs, identify root cause, correct manually, fix logic

**Issue: Duplicate events created**
- **Solution:** Review event logs, identify duplicates, clean up, fix idempotency

---

## 13. Missing Items for Module Completion

### 13.1 Before Cron Automation

- [ ] **2-4 weeks of manual operation** - Validate scripts in production
- [ ] **Metrics baseline established** - Track execution metrics
- [ ] **Operations team trained** - Team knows how to run and troubleshoot
- [ ] **Checklists refined** - Based on manual operation experience
- [ ] **Monitoring solution implemented** - For cron execution
- [ ] **Alerting configured** - For cron failures
- [ ] **Rollback procedures tested** - Validate rollback works
- [ ] **Backup procedures verified** - Confirm backups work

### 13.2 Before Module Closure

- [ ] **Cron implemented and tested** - Automated evaluation running
- [ ] **Monitoring dashboard** - Visual monitoring of cron health
- [ ] **Documentation complete** - All procedures documented
- [ ] **Stability period** - 1-2 weeks of stable cron operation
- [ ] **User feedback collected** - No major issues reported
- [ ] **Performance optimized** - Scripts run efficiently
- [ ] **Security review completed** - No security vulnerabilities
- [ ] **Code review completed** - Code quality verified

### 13.3 Future Enhancements (Out of Scope)

- [ ] **Dry-run in UI** - Preview changes before applying
- [ ] **Bulk operations in UI** - Evaluate multiple agreements at once
- [ ] **Undo functionality** - Reverse recent operations
- [ ] **Notification system** - Alert on status changes
- [ ] **Audit log viewer** - Dedicated audit log UI
- [ ] **Advanced filtering** - Filter agreements by various criteria
- [ ] **Export functionality** - Export agreement data
- [ ] **Integration with other modules** - Better integration with enrollment, etc.

---

## 14. Quick Reference

### 14.1 Commands

**Status Evaluation (Dry-Run):**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-batch-status.ts --dry-run
```

**Status Evaluation (Live):**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-batch-status.ts
```

**Block Exception Evaluation (Dry-Run):**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-block-exception-batch.ts --dry-run
```

**Block Exception Evaluation (Live):**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-block-exception-batch.ts
```

### 14.2 Key Tables

- `PaymentAgreement` - Agreement records
- `PaymentAgreementInstallment` - Installment records
- `PaymentAgreementEvent` - Event logs
- `FinancialBlock` - Block records with exceptions
- `AuditLog` - Audit logs

### 14.3 Key Files

- `scripts/test-payment-agreement-batch-status.ts` - Status evaluation script
- `scripts/test-payment-agreement-block-exception-batch.ts` - Exception evaluation script
- `src/lib/server/payment-agreements/payment-agreement-service.ts` - Service layer
- `src/lib/server/payment-agreements/payment-agreement-permissions.ts` - Permission helpers
- `src/routes/(app)/finanzas/convenios/[id]/+page.server.ts` - UI server actions

### 14.4 Contact Points

**For script issues:** DevOps team
**For business logic issues:** Finance team
**For permission issues:** System administrator
**For data issues:** Database administrator

---

## Appendix A: Test Script Execution

**Manual Operations Test:**
```bash
DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" \
npx tsx scripts/test-payment-agreement-manual-operations.ts
```

**Expected result:** 9/9 tests passed

---

## Appendix B: Schema Validation

**Prisma validation:**
```bash
npx prisma validate
```

**Expected result:** Schema is valid

**Migration status:**
```bash
npx prisma migrate status
```

**Expected result:** 29 migrations found, schema up to date

---

## Appendix C: Build Validation

**TypeScript check:**
```bash
npm run check
```

**Expected result:** 0 errors

**Build:**
```bash
npm run build
```

**Expected result:** Build successful

---

## Document History

- **Created:** June 27, 2026
- **Phase:** 6.4 - Production Operation Checklist
- **Status:** Documentation phase only
- **Next Phase:** Cron automation (after manual operation period)
