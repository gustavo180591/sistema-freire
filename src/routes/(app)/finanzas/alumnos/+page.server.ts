import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import {
	debtQueryService,
	type DebtStudentFilters
} from '$lib/server/financial/debt-query-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	await requirePermission(locals.user, 'FINANCIAL_REPORT', 'read');

	// Get filter options
	const filterOptions = await debtQueryService.getDebtStudentsFilters();

	// Parse filters from URL
	const filters: DebtStudentFilters = {
		search: url.searchParams.get('search') || undefined,
		careerId: url.searchParams.get('careerId') || undefined,
		locationId: url.searchParams.get('locationId') || undefined,
		studentType: (url.searchParams.get('studentType') as any) || undefined,
		financialStatus: (url.searchParams.get('financialStatus') as any) || undefined,
		academicStatus: (url.searchParams.get('academicStatus') as any) || undefined,
		conceptCode: url.searchParams.get('conceptCode') || undefined,
		periodFrom: url.searchParams.get('periodFrom') || undefined,
		periodTo: url.searchParams.get('periodTo') || undefined,
		minDebt: url.searchParams.get('minDebt') ? Number(url.searchParams.get('minDebt')) : undefined,
		maxDebt: url.searchParams.get('maxDebt') ? Number(url.searchParams.get('maxDebt')) : undefined,
		overdueCharges: (url.searchParams.get('overdueCharges') as any) || undefined,
		page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
		pageSize: url.searchParams.get('pageSize') ? Number(url.searchParams.get('pageSize')) : 25,
		sortBy: (url.searchParams.get('sortBy') as any) || undefined
	};

	// Get students with debt
	const result = await debtQueryService.getDebtStudents(filters);

	// Calculate summary metrics
	const totalDebt = result.students.reduce((sum, s) => sum + s.totalDebt, 0);
	const totalOverdueDebt = result.students.reduce((sum, s) => sum + s.overdueDebt, 0);

	return {
		students: result.students,
		total: result.total,
		page: result.page,
		pageSize: result.pageSize,
		totalPages: result.totalPages,
		filterOptions,
		filters,
		summary: {
			totalDebt,
			totalOverdueDebt
		}
	};
};
