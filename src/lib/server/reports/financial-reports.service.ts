import { prisma } from '$lib/server/db/prisma';
import type { FinancialReportMetrics, ReportResult, ReportFilters } from './reports.types';

/**
 * Get financial report metrics
 * Reuses existing financial service logic where possible
 */
export async function getFinancialReportMetrics(
	filters?: ReportFilters
): Promise<ReportResult<FinancialReportMetrics>> {
	const [
		totalCharges,
		totalPaid,
		totalPending,
		overdueDebt,
		studentsWithDebt,
		paymentsCount,
		totalCollected,
		receiptsIssued,
		receiptsCancelled,
		activeAgreements,
		overdueAgreements,
		defaultedAgreements
	] = await Promise.all([
		// Charges
		getTotalCharges(filters),
		getTotalPaid(filters),
		getTotalPending(filters),
		getOverdueDebt(filters),
		getStudentsWithDebt(filters),
		// Payments
		getPaymentsCount(filters),
		getTotalCollected(filters),
		// Receipts
		getReceiptsIssued(filters),
		getReceiptsCancelled(filters),
		// Payment Agreements (reusing existing module logic)
		getActiveAgreements(filters),
		getOverdueAgreements(filters),
		getDefaultedAgreements(filters)
	]);

	const metrics: FinancialReportMetrics = {
		totalCharges,
		totalPaid,
		totalPending,
		overdueDebt,
		studentsWithDebt,
		paymentsCount,
		totalCollected,
		receiptsIssued,
		receiptsCancelled,
		activeAgreements,
		overdueAgreements,
		defaultedAgreements
	};

	return {
		data: metrics,
		generatedAt: new Date(),
		recordCount: 1
	};
}

/**
 * Get total charges amount
 */
async function getTotalCharges(filters?: ReportFilters): Promise<number> {
	const where = buildChargeWhere(filters);
	const result = await prisma.studentCharge.aggregate({
		where,
		_sum: { amount: true }
	});
	return Number(result._sum.amount ?? 0);
}

/**
 * Get total paid amount
 */
async function getTotalPaid(filters?: ReportFilters): Promise<number> {
	const where = buildPaymentWhere(filters);
	const result = await prisma.payment.aggregate({
		where,
		_sum: { amount: true }
	});
	return Number(result._sum.amount ?? 0);
}

/**
 * Get total pending debt
 */
async function getTotalPending(filters?: ReportFilters): Promise<number> {
	const where = buildChargeWhere(filters);
	const charges = await prisma.studentCharge.findMany({
		where: { ...where, status: { in: ['PENDING', 'PARTIAL'] } },
		select: { amount: true, paidAmount: true }
	});

	return charges.reduce((acc, charge) => {
		return acc + Number(charge.amount) - Number(charge.paidAmount);
	}, 0);
}

/**
 * Get overdue debt
 */
async function getOverdueDebt(filters?: ReportFilters): Promise<number> {
	const where = buildChargeWhere(filters);
	const charges = await prisma.studentCharge.findMany({
		where: {
			...where,
			status: { in: ['PENDING', 'PARTIAL'] },
			dueDate: { lt: new Date() }
		},
		select: { amount: true, paidAmount: true }
	});

	return charges.reduce((acc, charge) => {
		return acc + Number(charge.amount) - Number(charge.paidAmount);
	}, 0);
}

/**
 * Get count of students with debt
 */
async function getStudentsWithDebt(filters?: ReportFilters): Promise<number> {
	const where = buildChargeWhere(filters);
	const charges = await prisma.studentCharge.findMany({
		where: { ...where, status: { in: ['PENDING', 'PARTIAL'] } },
		select: { studentId: true, amount: true, paidAmount: true }
	});

	const studentsWithDebt = new Set<string>();
	for (const charge of charges) {
		const pending = Number(charge.amount) - Number(charge.paidAmount);
		if (pending > 0) {
			studentsWithDebt.add(charge.studentId);
		}
	}

	return studentsWithDebt.size;
}

/**
 * Get count of payments
 */
async function getPaymentsCount(filters?: ReportFilters): Promise<number> {
	const where = buildPaymentWhere(filters);
	return prisma.payment.count({ where });
}

/**
 * Get total collected amount
 */
async function getTotalCollected(filters?: ReportFilters): Promise<number> {
	const where = buildPaymentWhere(filters);
	const result = await prisma.payment.aggregate({
		where,
		_sum: { amount: true }
	});
	return Number(result._sum.amount ?? 0);
}

/**
 * Get count of issued receipts
 */
async function getReceiptsIssued(filters?: ReportFilters): Promise<number> {
	const where = buildReceiptWhere(filters);
	return prisma.receipt.count({
		where: { ...where, status: 'ISSUED' }
	});
}

/**
 * Get count of cancelled receipts
 */
async function getReceiptsCancelled(filters?: ReportFilters): Promise<number> {
	const where = buildReceiptWhere(filters);
	return prisma.receipt.count({
		where: { ...where, status: 'CANCELLED' }
	});
}

/**
 * Get count of active payment agreements
 * Reuses existing PaymentAgreement module
 */
async function getActiveAgreements(filters?: ReportFilters): Promise<number> {
	const where = buildAgreementWhere(filters);
	return prisma.paymentAgreement.count({
		where: { ...where, status: 'ACTIVE' }
	});
}

/**
 * Get count of overdue payment agreements
 */
async function getOverdueAgreements(filters?: ReportFilters): Promise<number> {
	const where = buildAgreementWhere(filters);
	return prisma.paymentAgreement.count({
		where: { ...where, status: 'OVERDUE' }
	});
}

/**
 * Get count of defaulted payment agreements
 */
async function getDefaultedAgreements(filters?: ReportFilters): Promise<number> {
	const where = buildAgreementWhere(filters);
	return prisma.paymentAgreement.count({
		where: { ...where, status: 'DEFAULTED' }
	});
}

/**
 * Build where clause for charges based on filters
 */
function buildChargeWhere(filters?: ReportFilters) {
	const where: {
		studentId?: string;
		createdAt?: { gte?: Date; lte?: Date };
	} = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters?.startDate || filters?.endDate) {
		where.createdAt = {};
		if (filters.startDate) {
			where.createdAt.gte = filters.startDate;
		}
		if (filters.endDate) {
			where.createdAt.lte = filters.endDate;
		}
	}

	return where;
}

/**
 * Build where clause for payments based on filters
 */
function buildPaymentWhere(filters?: ReportFilters) {
	const where: {
		studentId?: string;
		paidAt?: { gte?: Date; lte?: Date };
	} = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters?.startDate || filters?.endDate) {
		where.paidAt = {};
		if (filters.startDate) {
			where.paidAt.gte = filters.startDate;
		}
		if (filters.endDate) {
			where.paidAt.lte = filters.endDate;
		}
	}

	return where;
}

/**
 * Build where clause for receipts based on filters
 */
function buildReceiptWhere(filters?: ReportFilters) {
	const where: {
		studentId?: string;
		issuedAt?: { gte?: Date; lte?: Date };
	} = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters?.startDate || filters?.endDate) {
		where.issuedAt = {};
		if (filters.startDate) {
			where.issuedAt.gte = filters.startDate;
		}
		if (filters.endDate) {
			where.issuedAt.lte = filters.endDate;
		}
	}

	return where;
}

/**
 * Build where clause for payment agreements based on filters
 */
function buildAgreementWhere(filters?: ReportFilters) {
	const where: {
		studentId?: string;
		createdAt?: { gte?: Date; lte?: Date };
	} = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters?.startDate || filters?.endDate) {
		where.createdAt = {};
		if (filters.startDate) {
			where.createdAt.gte = filters.startDate;
		}
		if (filters.endDate) {
			where.createdAt.lte = filters.endDate;
		}
	}

	return where;
}
