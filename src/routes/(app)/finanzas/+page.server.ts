import type { PageServerLoad } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	await requirePermission(locals.user, 'FINANCIAL_REPORT', 'read');

	// Get dashboard metrics
	const dashboardMetrics = await financialService.getFinancialDashboardMetrics();

	// Map to UI-expected format (convert Decimal to number for serialization)
	const metrics = {
		studentsWithDebt: dashboardMetrics.studentsWithDebt,
		studentsBlocked: dashboardMetrics.studentsBlocked,
		totalDebt: Number(dashboardMetrics.totalPending),
		totalBilled: Number(dashboardMetrics.totalBilled),
		overdueDebt: Number(dashboardMetrics.overdueDebt),
		paymentsToday: dashboardMetrics.paymentsToday,
		paymentsCount: dashboardMetrics.paymentsThisMonth,
		totalCollected: Number(dashboardMetrics.totalCollected),
		receiptsIssued: dashboardMetrics.receiptsIssued,
		receiptsCancelled: dashboardMetrics.receiptsCancelled
	};

	return {
		metrics
	};
};
