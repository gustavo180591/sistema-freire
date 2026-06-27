# Payment Agreements - Phase 5.4: Integrated Financial Reports

## Overview

Phase 5.4 integrates payment agreement logic into financial reports to avoid debt duplication when students have payment agreements. The implementation provides clear distinction between original debt, agreement-covered debt, and effective enforceable debt.

## Scope

This phase implements:

- `getStudentIntegratedDebtReport()`: Generate integrated debt report for a single student
- `getAggregatedFinancialReport()`: Generate aggregated financial report for multiple students
- `getDebtorStudentsWithAgreements()`: Get debtor students with integrated debt information

**What is NOT implemented in this phase:**

- No modification of `StudentCharge`
- No modification of `FinancialBlock`
- No modification of `financial-report.service.ts` (existing reports remain unchanged)
- No modification of `/finanzas` UI routes
- No schema changes
- No migrations
- No dashboard UI integration (methods are service-level only)
- No automated report generation
- No cron jobs

**Note**: This phase provides service-level methods for integrated reports. Integration with existing `financial-report.service.ts` or UI routes is deferred to a future phase.

## Business Rules

### Debt Calculation Rules

1. **Original Debt**: Total debt from `StudentCharge` before considering agreements
2. **DRAFT/CANCELLED Agreements**: Do not exclude original debt
3. **ACTIVE Agreements**: Exclude original debt covered by the agreement
4. **COMPLETED Agreements**: Do not add pending debt (already paid)
5. **DEFAULTED Agreements**: Show as separate defaulted debt
6. **Uncovered Charges**: Remain as enforceable original debt
7. **Effective Debt**: Uncovered debt + agreement installment pending debt
8. **No Duplication**: Original debt and agreement debt are never double-counted

### Agreement Status Impact on Reports

| Status | Original Debt Covered? | Agreement Debt Added? | Notes |
|--------|----------------------|-----------------------|-------|
| `DRAFT` | No | No | Original debt remains fully enforceable |
| `ACTIVE` | Yes (covered amount) | Yes (pending installments) | Covered debt excluded, installments added |
| `COMPLETED` | Yes | No | Covered debt excluded, no pending debt |
| `DEFAULTED` | Yes | Yes (as defaulted) | Shown separately as defaulted debt |
| `CANCELLED` | No | No | Original debt remains fully enforceable |

## Implemented Methods

### 1. getStudentIntegratedDebtReport()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Generate integrated debt report for a single student

**Parameters**:
- `studentId`: ID of the student

**Returns**: `StudentIntegratedDebtReport`

```typescript
type StudentIntegratedDebtReport = {
	studentId: string;
	studentName: string;
	studentDni?: string;
	careerName?: string;
	originalDebtTotal: Decimal;
	originalDebtCoveredByActiveAgreements: Decimal;
	originalDebtStillEnforceable: Decimal;
	agreementPendingDebt: Decimal;
	agreementOverdueDebt: Decimal;
	agreementDefaultedDebt: Decimal;
	effectiveTotalDebt: Decimal;
	activeAgreementsCount: number;
	defaultedAgreementsCount: number;
	completedAgreementsCount: number;
	agreementDetails: Array<{
		agreementId: string;
		agreementNumber: number;
		agreementYear: number;
		status: PaymentAgreementStatusType;
		originalDebt: Decimal;
		paidAmount: Decimal;
		pendingAmount: Decimal;
		installmentPending: Decimal;
		installmentOverdue: Decimal;
	}>;
};
```

**Algorithm**:

1. Fetch student with career
2. Calculate debt summary with agreements (Phase 5.2 method)
3. Fetch all agreements for the student with installments
4. Count agreements by status (ACTIVE, DEFAULTED, COMPLETED)
5. Build agreement details with installment debt
6. Calculate agreement debt by status:
   - `agreementPendingDebt`: Sum of pending installments from ACTIVE agreements
   - `agreementOverdueDebt`: Sum of overdue installments from ACTIVE agreements
   - `agreementDefaultedDebt`: Sum of pending amounts from DEFAULTED agreements
7. Calculate effective total debt: `uncoveredDebt + agreementInstallmentPending`
8. Return comprehensive report

**Key Points**:

- Reuses Phase 5.2 debt calculation logic
- Provides detailed breakdown by agreement
- Shows both original and effective debt
- Separates defaulted debt from active debt
- Includes agreement counts by status

### 2. getAggregatedFinancialReport()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Generate aggregated financial report for multiple students

**Parameters**:
- `studentIds`?: Optional array of student IDs. If not provided, automatically finds students with debt or agreements.

**Returns**: `AggregatedFinancialReport`

```typescript
type AggregatedFinancialReport = {
	totalStudents: number;
	totalOriginalDebt: Decimal;
	totalOriginalDebtCoveredByAgreements: Decimal;
	totalOriginalDebtStillEnforceable: Decimal;
	totalAgreementPendingDebt: Decimal;
	totalAgreementOverdueDebt: Decimal;
	totalAgreementDefaultedDebt: Decimal;
	totalEffectiveDebt: Decimal;
	totalActiveAgreements: number;
	totalDefaultedAgreements: number;
	totalCompletedAgreements: number;
	studentReports: StudentIntegratedDebtReport[];
};
```

**Algorithm**:

1. If no student IDs provided:
   - Find students with pending charges
   - Find students with ACTIVE or DEFAULTED agreements
   - Combine and deduplicate student IDs
2. Generate individual reports for each student
3. Calculate aggregates:
   - Sum all original debt values
   - Sum all agreement debt values
   - Count agreements by status
4. Return aggregated report with individual student reports

**Key Points**:

- Automatically finds relevant students if not specified
- Provides both aggregate totals and individual details
- Useful for dashboard and summary views
- Handles errors gracefully (skips students that cannot be found)

### 3. getDebtorStudentsWithAgreements()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Get debtor students with integrated debt information, sorted by effective debt

**Parameters**: None

**Returns**: `StudentIntegratedDebtReport[]`

**Algorithm**:

1. Get aggregated financial report (auto-finds students)
2. Filter students with effective debt > 0
3. Sort by effective debt descending
4. Return sorted debtor list

**Key Points**:

- Returns only students with actual debt
- Sorted by debt amount (highest first)
- Useful for debt collection prioritization
- Includes full agreement details

## Integration with Existing Reports

### Current Financial Report Service

The existing `financial-report.service.ts` provides:

```typescript
type FinancialReportRow = {
	id: string;
	student: string;
	career: string;
	periodLabel: string;
	concept: string;
	pending: number;
};

type FinancialReportResult = {
	rows: FinancialReportRow[];
	metrics: {
		studentsWithDebt: number;
		totalDebt: number;
		paymentsCount: number;
		totalCollected: number;
	};
};
```

**Limitations of current report**:
- Does not consider payment agreements
- May double-count debt (original + agreement)
- Shows raw `StudentCharge` data without context

### Phase 5.4 Integration

The new methods in `PaymentAgreementService` provide:

- Agreement-aware debt calculation
- No debt duplication
- Clear distinction between original and effective debt
- Agreement status breakdown
- Defaulted debt separation

**Integration Strategy**:

The new methods are **additive** and do not replace existing reports. They can be used alongside existing reports to provide a more complete picture:

- Use existing reports for detailed charge-level data
- Use new methods for agreement-aware summaries
- UI can choose which report to display based on context

## Usage Examples

### Example 1: Get integrated debt report for a student

```typescript
import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';

const report = await paymentAgreementService.getStudentIntegratedDebtReport(studentId);

console.log(`Original debt: ${report.originalDebtTotal}`);
console.log(`Covered by agreements: ${report.originalDebtCoveredByActiveAgreements}`);
console.log(`Still enforceable: ${report.originalDebtStillEnforceable}`);
console.log(`Agreement pending: ${report.agreementPendingDebt}`);
console.log(`Effective total: ${report.effectiveTotalDebt}`);
```

### Example 2: Get aggregated report for all students with debt

```typescript
const report = await paymentAgreementService.getAggregatedFinancialReport();

console.log(`Total students: ${report.totalStudents}`);
console.log(`Total original debt: ${report.totalOriginalDebt}`);
console.log(`Total effective debt: ${report.totalEffectiveDebt}`);
console.log(`Total active agreements: ${report.totalActiveAgreements}`);
```

### Example 3: Get debtor students sorted by debt

```typescript
const debtors = await paymentAgreementService.getDebtorStudentsWithAgreements();

for (const debtor of debtors) {
	console.log(`${debtor.studentName}: ${debtor.effectiveTotalDebt}`);
}
```

## Data Integrity

### No Schema Changes

This phase does not require any schema changes or migrations. All operations use existing data structures.

### No StudentCharge Modification

`StudentCharge` is never modified by this phase. The methods are read-only and only calculate debt based on existing data.

### No FinancialBlock Modification

`FinancialBlock` is never modified by this phase. This is a reporting-only phase.

### Decimal Precision

All monetary calculations use `Decimal` for precise financial arithmetic, avoiding floating-point precision issues.

## Performance Considerations

### Query Optimization

The implementation uses Prisma includes to fetch related data efficiently:

- Agreements with installments
- Students with career

### Aggregation Strategy

For aggregated reports, the implementation:

- Fetches only relevant students (with debt or agreements)
- Processes students sequentially to avoid memory issues
- Uses efficient reduce operations for aggregations

### Caching Opportunities

Future improvements could add:

- Caching of debt summaries
- Incremental updates when agreements change
- Materialized views for frequent reports

## Error Handling

### Validation Errors

The implementation validates:

- Student exists
- Student has career information

### Graceful Degradation

In aggregated reports:

- Students that cannot be found are skipped with a warning
- Partial results are returned even if some students fail

## Security Considerations

### Access Control

The methods do not include permission checks. These should be added at the API layer if needed.

### Data Privacy

The methods return financial and agreement data. Ensure proper access control at the API layer.

## Limitations

### Current Limitations

1. **Manual Trigger**: Reports must be called manually
2. **No Automation**: No scheduled report generation
3. **No Dashboard Integration**: UI integration not implemented in this phase
4. **No Real-time Updates**: Reports reflect data at query time
5. **Single Database**: Assumes single database instance

### Future Phases

The following features are planned for future phases:

- **Phase 5.5**: Automated report generation and scheduling
- **Phase 5.6**: Dashboard integration for report visualization
- **Phase 5.7**: Export to various formats (PDF, Excel, CSV)
- **Phase 5.8**: Historical debt tracking and trends

## Testing

### Test Script

`scripts/test-payment-agreement-integrated-reports.ts` includes comprehensive tests:

1. **Student without agreement**: Appears with normal original debt
2. **DRAFT agreement**: Does not exclude original debt
3. **ACTIVE agreement**: Excludes original debt covered
4. **ACTIVE agreement**: Adds installment pending debt
5. **COMPLETED agreement**: Does not add pending debt
6. **DEFAULTED agreement**: Appears as defaulted debt
7. **Uncovered charges**: Remain as enforceable debt
8. **No debt duplication**: Effective debt calculation verified
9. **Aggregated reports**: Sum correctly across multiple students
10. **No StudentCharge modification**: Verified

### Running Tests

```bash
npx tsx scripts/test-payment-agreement-integrated-reports.ts
```

## Debt Calculation Examples

### Example 1: Student with no agreement

```
Original debt: 10,000
Covered by agreements: 0
Still enforceable: 10,000
Agreement pending: 0
Effective total: 10,000
```

### Example 2: Student with ACTIVE agreement covering all debt

```
Original debt: 10,000
Covered by agreements: 10,000
Still enforceable: 0
Agreement pending: 10,000
Effective total: 10,000
```

### Example 3: Student with ACTIVE agreement covering partial debt

```
Original debt: 10,000
Covered by agreements: 7,000
Still enforceable: 3,000
Agreement pending: 7,000
Effective total: 10,000
```

### Example 4: Student with DEFAULTED agreement

```
Original debt: 10,000
Covered by agreements: 10,000
Still enforceable: 0
Agreement pending: 0
Agreement defaulted: 10,000
Effective total: 0 (or 10,000 depending on policy)
```

## Conclusion

Phase 5.4 successfully integrates payment agreement logic into financial reports. The implementation:

- Provides clear distinction between original and effective debt
- Avoids debt duplication
- Handles all agreement statuses correctly
- Separates defaulted debt
- Provides both individual and aggregated reports
- Does not modify `StudentCharge` or `FinancialBlock`
- Includes comprehensive tests

This foundation enables future phases to integrate with dashboards, automation, and export features.
