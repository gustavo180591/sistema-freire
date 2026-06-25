# Payment Agreements - Phase 5.2: Effective Debt Calculation

## Overview

Phase 5.2 implements methods to calculate the student's effective debt while considering payment agreements. This phase focuses on read-only operations that distinguish between original debt, agreement-covered debt, and installment debt, ensuring no debt duplication.

## Scope

This phase implements:

- `getStudentEffectiveDebt()`: Calculates effective debt summary considering payment agreements
- `getStudentAgreementDebtSummary()`: Provides detailed debt breakdown for each agreement
- `calculateDebtSummaryWithAgreements()`: Unified interface combining original and effective debt

**What is NOT implemented in this phase:**

- No modification of `StudentCharge`
- No modification of `FinancialBlock`
- No changes to global reports
- No dashboard integration
- No cron jobs
- No automation
- No schema changes
- No migrations

## Business Rules

### Debt Calculation Rules

1. **Original Debt**: Total debt from `StudentCharge` before considering agreements
2. **Agreement-Covered Debt**: Debt covered by `ACTIVE` agreements only
3. **Uncovered Debt**: Debt NOT covered by active agreements (still payable as original charges)
4. **Agreement Installment Debt**: Debt represented by pending agreement installments
5. **Effective Debt**: Sum of uncovered debt + agreement installment debt (no duplication)

### Agreement Status Handling

| Status | Covers Original Debt? | Counts as Installment Debt? | Notes |
|--------|----------------------|----------------------------|-------|
| `DRAFT` | No | No | Does not exclude original debt |
| `ACTIVE` | Yes | Yes | Excludes covered original debt, counts installment debt |
| `COMPLETED` | Yes | No | Has 0 installment debt |
| `DEFAULTED` | Yes | Yes | Counts as defaulted debt |
| `CANCELLED` | No | No | Does not exclude original debt |

### Installment Status Handling

| Status | Counts as Pending Debt? | Counts as Overdue Debt? |
|--------|------------------------|------------------------|
| `PENDING` | Yes | No (unless overdue) |
| `PARTIAL` | Yes | No (unless overdue) |
| `PAID` | No | No |
| `OVERDUE` | Yes | Yes |
| `CANCELLED` | No | No |
| `WAIVED` | No | No |

## Implemented Methods

### 1. getStudentEffectiveDebt()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Calculate effective debt summary considering payment agreements

**Returns**: `EffectiveDebtSummary`

```typescript
type EffectiveDebtSummary = {
	// Original debt from StudentCharge (before considering agreements)
	originalTotalDebt: Decimal;
	originalOverdueDebt: Decimal;
	originalPendingDebt: Decimal;

	// Debt covered by active agreements
	agreementCoveredDebt: Decimal;
	agreementCoveredOverdueDebt: Decimal;

	// Debt NOT covered by agreements (still payable as original charges)
	uncoveredDebt: Decimal;
	uncoveredOverdueDebt: Decimal;

	// Agreement installment debt (what the student owes through agreements)
	agreementInstallmentPending: Decimal;
	agreementInstallmentOverdue: Decimal;
	agreementInstallmentTotal: Decimal;

	// Defaulted agreement debt (agreements that are DEFAULTED)
	defaultedAgreementDebt: Decimal;

	// Total effective debt (uncovered + agreement installments)
	effectiveTotalDebt: Decimal;
	effectiveOverdueDebt: Decimal;

	// Agreement counts
	activeAgreements: number;
	completedAgreements: number;
	defaultedAgreements: number;
	cancelledAgreements: number;
	draftAgreements: number;
};
```

**Algorithm**:

1. Fetch all student charges with agreement relations
2. Fetch all payment agreements with installments and charge relations
3. Calculate original debt (excluding CANCELLED and PAID charges)
4. Calculate agreement-covered debt (only ACTIVE agreements)
5. Calculate uncovered debt (charges not covered by active agreements)
6. Calculate agreement installment debt (ACTIVE and DEFAULTED agreements only)
7. Calculate defaulted agreement debt
8. Calculate effective debt (uncovered + agreement installments)
9. Count agreements by status

**Key Points**:

- Only `ACTIVE` agreements cover original debt
- `DRAFT` and `CANCELLED` agreements do not exclude original debt
- `COMPLETED` agreements have 0 installment debt
- `DEFAULTED` agreements count as defaulted debt
- No debt duplication: effective debt = uncovered + agreement installments

### 2. getStudentAgreementDebtSummary()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Get detailed debt summary for each agreement

**Returns**: `AgreementDebtDetail[]`

```typescript
type AgreementDebtDetail = {
	agreementId: string;
	agreementNumber: number;
	agreementYear: number;
	status: PaymentAgreementStatusType;
	originalDebt: Decimal;
	agreedAmount: Decimal;
	paidAmount: Decimal;
	pendingAmount: Decimal;
	installmentPending: Decimal;
	installmentOverdue: Decimal;
	coveredCharges: Array<{
		chargeId: string;
		originalAmount: Decimal;
		includedAmount: Decimal;
	}>;
};
```

**Algorithm**:

1. Fetch all agreements with installments and charge relations
2. For each agreement:
   - Calculate installment pending debt
   - Calculate installment overdue debt
   - Build covered charges details
3. Return array of agreement details sorted by year and number

**Key Points**:

- Includes all agreements regardless of status
- Shows which charges are covered by each agreement
- Calculates installment debt per agreement

### 3. calculateDebtSummaryWithAgreements()

**Location**: `src/lib/server/payment-agreements/payment-agreement-service.ts`

**Purpose**: Unified interface combining original and effective debt

**Returns**: Combined summary with original debt, effective debt, and agreement details

```typescript
{
	originalDebt: {
		totalDebt: Decimal;
		overdueDebt: Decimal;
		pendingBalance: Decimal;
		pendingCharges: number;
		overdueCharges: number;
		partialCharges: number;
		paidCharges: number;
		cancelledCharges: number;
	};
	effectiveDebt: EffectiveDebtSummary;
	agreementDetails: AgreementDebtDetail[];
}
```

**Algorithm**:

1. Calculate original debt summary (mimicking `FinancialService.calculateDebtSummary`)
2. Get effective debt summary using `getStudentEffectiveDebt()`
3. Get agreement details using `getStudentAgreementDebtSummary()`
4. Return combined summary

**Key Points**:

- Provides compatibility with existing `FinancialService.calculateDebtSummary`
- Allows gradual migration to agreement-aware debt calculation
- Returns both original and effective debt for comparison

## Debt Duplication Prevention

The implementation prevents debt duplication through the following mechanism:

1. **Original Debt Calculation**: Calculates debt from all `StudentCharge` records
2. **Agreement Coverage Tracking**: Uses a `Set` to track charge IDs covered by active agreements
3. **Uncovered Debt Calculation**: Excludes covered charges from uncovered debt
4. **Effective Debt Calculation**: Sums uncovered debt + agreement installment debt

**Formula**:
```
effectiveTotalDebt = uncoveredDebt + agreementInstallmentTotal
```

This ensures that:
- Original debt is not double-counted when covered by agreements
- Agreement installment debt represents the actual debt the student owes through agreements
- Uncovered charges remain as payable debt

## Limitations

### Current Limitations

1. **Read-Only**: Methods only read data, do not modify `StudentCharge` or `FinancialBlock`
2. **No Blocking**: Does not create or revoke financial blocks
3. **No Reports**: Does not modify global financial reports
4. **No Automation**: Does not include cron jobs or automated evaluation
5. **Manual Evaluation**: Debt calculation must be called manually

### Future Phases

The following features are planned for future phases:

- **Phase 5.3**: Block exceptions based on active agreements
- **Phase 5.4**: Integration with global financial reports
- **Phase 5.5**: Automated debt evaluation and blocking

## Testing

### Test Script

`scripts/test-payment-agreement-effective-debt.ts` includes comprehensive tests:

1. **Student without agreements**: Verifies original debt equals effective debt
2. **DRAFT agreement**: Verifies DRAFT agreements do not exclude original debt
3. **ACTIVE agreement**: Verifies ACTIVE agreements exclude covered debt
4. **Installment debt**: Verifies installments sum as agreement debt
5. **Paid installments**: Verifies paid installments do not sum as pending
6. **COMPLETED agreement**: Verifies COMPLETED agreements have 0 debt
7. **DEFAULTED agreement**: Verifies DEFAULTED agreements appear as defaulted
8. **Uncovered charges**: Verifies uncovered charges remain as payable
9. **No StudentCharge modification**: Verifies `StudentCharge` is not modified
10. **No FinancialBlock modification**: Verifies `FinancialBlock` is not modified
11. **No debt duplication**: Verifies no debt duplication occurs

### Running Tests

```bash
npx tsx scripts/test-payment-agreement-effective-debt.ts
```

## Usage Examples

### Example 1: Get Effective Debt for a Student

```typescript
import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';

const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(studentId);

console.log(`Original debt: ${effectiveDebt.originalTotalDebt}`);
console.log(`Effective debt: ${effectiveDebt.effectiveTotalDebt}`);
console.log(`Agreement covered: ${effectiveDebt.agreementCoveredDebt}`);
console.log(`Uncovered: ${effectiveDebt.uncoveredDebt}`);
console.log(`Installment debt: ${effectiveDebt.agreementInstallmentTotal}`);
```

### Example 2: Get Agreement Details

```typescript
const agreementDetails = await paymentAgreementService.getStudentAgreementDebtSummary(studentId);

for (const detail of agreementDetails) {
	console.log(`Agreement ${detail.agreementNumber}/${detail.agreementYear}:`);
	console.log(`  Status: ${detail.status}`);
	console.log(`  Installment pending: ${detail.installmentPending}`);
	console.log(`  Installment overdue: ${detail.installmentOverdue}`);
}
```

### Example 3: Get Combined Summary

```typescript
const summary = await paymentAgreementService.calculateDebtSummaryWithAgreements(studentId);

console.log('Original debt:', summary.originalDebt.totalDebt);
console.log('Effective debt:', summary.effectiveDebt.effectiveTotalDebt);
console.log('Agreements:', summary.agreementDetails.length);
```

## Integration Points

### With FinancialService

The `calculateDebtSummaryWithAgreements()` method provides a bridge between the existing `FinancialService.calculateDebtSummary()` and the new agreement-aware debt calculation. This allows:

- Gradual migration to agreement-aware debt calculation
- Comparison between original and effective debt
- Backward compatibility with existing code

### Future Integration

Future phases will integrate with:

- **FinancialBlock**: Create block exceptions based on active agreements
- **Financial Reports**: Modify global reports to use effective debt
- **Dashboard**: Display effective debt in student dashboard
- **Automation**: Automated debt evaluation and blocking

## Data Integrity

### No Schema Changes

This phase does not require any schema changes or migrations. All calculations use existing data structures:

- `StudentCharge`: Original debt source
- `PaymentAgreement`: Agreement metadata
- `PaymentAgreementChargeRelation`: Charge-agreement relationships
- `PaymentAgreementInstallment`: Installment debt

### No Data Modification

All methods are read-only and do not modify:

- `StudentCharge.status`
- `StudentCharge.paidAmount`
- `FinancialBlock` records
- Any other financial data

## Performance Considerations

### Query Optimization

The implementation uses Prisma includes to fetch related data efficiently:

- Charges with agreement relations
- Agreements with installments and charge relations

### Caching

Future phases may implement caching for frequently accessed debt calculations.

## Error Handling

### Missing Data

The implementation handles missing data gracefully:

- Missing charges are skipped
- Missing agreements are skipped
- Missing relations are skipped

### Invalid States

The implementation handles invalid states:

- CANCELLED charges are excluded
- PAID charges are excluded
- Invalid agreement statuses are handled

## Security Considerations

### Access Control

The methods do not include permission checks. These should be added at the API layer if needed.

### Data Privacy

The methods return financial data. Ensure proper access control at the API layer.

## Conclusion

Phase 5.2 successfully implements effective debt calculation considering payment agreements. The implementation:

- Prevents debt duplication
- Handles all agreement statuses correctly
- Provides detailed debt breakdowns
- Does not modify existing data
- Includes comprehensive tests

This foundation enables future phases to integrate with blocking, reporting, and automation features.
