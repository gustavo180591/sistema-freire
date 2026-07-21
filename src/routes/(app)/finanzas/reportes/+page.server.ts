import type { PageServerLoad } from './$types';
import { hasPermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import { error } from '@sveltejs/kit';
import {
	getFinancialReportFilters,
	getPaymentsReport,
	getDebtReport,
	getMovementsReport,
	getReceiptsReport,
	getDiscountsReport,
	getScholarshipsReport,
	type ReportType,
	type ReportFilters
} from '$lib/server/financial/report-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Usuario no autenticado');
	}

	// Get user roles
	const userRoles = await prisma.userRole.findMany({
		where: { userId: locals.user.id },
		include: { role: true }
	});
	const roleCodes = userRoles.map((ur) => ur.role.code);

	// Check if user has permission to view financial reports
	const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

	if (!canViewReports) {
		throw error(403, 'No tiene permisos para ver reportes financieros');
	}

	// Obtener filtros disponibles
	const filters = await getFinancialReportFilters();

	// Obtener tipo de reporte desde query params
	const reportType = (url.searchParams.get('type') as ReportType) || 'payments';

	// Construir filtros desde query params
	const reportFilters: ReportFilters = {
		startDate: url.searchParams.get('startDate')
			? new Date(url.searchParams.get('startDate') as string)
			: undefined,
		endDate: url.searchParams.get('endDate')
			? new Date(url.searchParams.get('endDate') as string)
			: undefined,
		studentId: url.searchParams.get('studentId') || undefined,
		studentSearch: url.searchParams.get('studentSearch') || undefined,
		careerId: url.searchParams.get('careerId') || undefined,
		locationId: url.searchParams.get('locationId') || undefined,
		currentYear: url.searchParams.get('currentYear')
			? parseInt(url.searchParams.get('currentYear') as string)
			: undefined,
		studentStatus: url.searchParams.get('studentStatus') || undefined,
		studentType: url.searchParams.get('studentType') as
			| 'NORMAL'
			| 'BECADO'
			| 'RECURSANTE'
			| undefined,
		conceptCode: url.searchParams.get('conceptCode') || undefined,
		chargeStatus: url.searchParams.get('chargeStatus') as
			| 'PENDING'
			| 'PARTIAL'
			| 'PAID'
			| 'CANCELLED'
			| undefined,
		paymentMethod: url.searchParams.get('paymentMethod') || undefined,
		movementType: url.searchParams.get('movementType') || undefined,
		onlyOverdue: url.searchParams.get('onlyOverdue') === 'true',
		onlyBlocked: url.searchParams.get('onlyBlocked') === 'true',
		onlyCancelled: url.searchParams.get('onlyCancelled') === 'true',
		page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page') as string) : 1,
		pageSize: url.searchParams.get('pageSize')
			? parseInt(url.searchParams.get('pageSize') as string)
			: 25
	};

	// Obtener datos del reporte según tipo
	let reportData: any = null;

	try {
		switch (reportType) {
			case 'payments':
				reportData = await getPaymentsReport(reportFilters);
				break;
			case 'debt':
				reportData = await getDebtReport(reportFilters);
				break;
			case 'overdue_debt':
				reportData = await getDebtReport({ ...reportFilters, onlyOverdue: true });
				break;
			case 'movements':
				reportData = await getMovementsReport(reportFilters);
				break;
			case 'receipts':
				reportData = await getReceiptsReport(reportFilters);
				break;
			case 'discounts':
				reportData = await getDiscountsReport(reportFilters);
				break;
			case 'scholarships':
				reportData = await getScholarshipsReport(reportFilters);
				break;
			default:
				reportData = await getPaymentsReport(reportFilters);
		}
	} catch (err) {
		console.error('Error loading report:', err);
		// No lanzar error, devolver datos vacíos
		reportData = {
			data: [],
			total: 0,
			page: 1,
			pageSize: 25,
			totalPages: 0,
			metrics: {}
		};
	}

	return {
		filters,
		reportType,
		reportData,
		currentFilters: reportFilters
	};
};
