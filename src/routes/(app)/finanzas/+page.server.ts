import type { PageServerLoad } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { hasPermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	// Get user roles
	const userRoles = await prisma.userRole.findMany({
		where: { userId: locals.user.id },
		include: { role: true }
	});
	const roleCodes = userRoles.map((ur: any) => ur.role.code);

	// Check if user has permission to view financial reports
	const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

	if (!canViewReports) {
		throw new Error('No tiene permisos para ver reportes financieros');
	}

	// Get dashboard metrics
	const dashboardMetrics = await financialService.getFinancialDashboardMetrics();

	// Map to UI-expected format (convert Decimal to number for serialization)
	const metrics = {
		studentsWithDebt: dashboardMetrics.studentsWithDebt,
		totalDebt: Number(dashboardMetrics.totalPending),
		paymentsCount: dashboardMetrics.paymentsThisMonth,
		totalCollected: Number(dashboardMetrics.totalCollected)
	};

	return {
		metrics
	};
};
