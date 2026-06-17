import type { PageServerLoad, Actions } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { hasPermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import { fail } from '@sveltejs/kit';

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

	return {};
};

export const actions: Actions = {
	getPeriodReport: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const userRoles = await prisma.userRole.findMany({
			where: { userId: locals.user.id },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);

		const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

		if (!canViewReports) {
			return fail(403, { error: 'No tiene permisos para ver reportes financieros' });
		}

		const data = await request.formData();
		const startDate = data.get('startDate') ? new Date(data.get('startDate') as string) : undefined;
		const endDate = data.get('endDate') ? new Date(data.get('endDate') as string) : undefined;

		try {
			const report = await financialService.getPeriodFinancialReport({ startDate, endDate });
			return { success: true, report };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	getMovementsHistory: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const userRoles = await prisma.userRole.findMany({
			where: { userId: locals.user.id },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);

		const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

		if (!canViewReports) {
			return fail(403, { error: 'No tiene permisos para ver reportes financieros' });
		}

		const data = await request.formData();
		const studentId = data.get('studentId') as string | undefined;
		const movementType = data.get('movementType') as string | undefined;
		const startDate = data.get('startDate') ? new Date(data.get('startDate') as string) : undefined;
		const endDate = data.get('endDate') ? new Date(data.get('endDate') as string) : undefined;

		try {
			const history = await financialService.getFinancialMovementsHistory({
				studentId,
				movementType: movementType as any,
				startDate,
				endDate
			});
			return { success: true, history };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	exportPeriodReportCSV: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const userRoles = await prisma.userRole.findMany({
			where: { userId: locals.user.id },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);

		const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

		if (!canViewReports) {
			return fail(403, { error: 'No tiene permisos para exportar reportes financieros' });
		}

		const data = await request.formData();
		const startDate = data.get('startDate') ? new Date(data.get('startDate') as string) : undefined;
		const endDate = data.get('endDate') ? new Date(data.get('endDate') as string) : undefined;

		try {
			const { csv, filename, recordCount } = await financialService.exportPeriodReportToCSV(
				{ startDate, endDate },
				locals.user.id,
				getClientAddress(),
				request.headers.get('user-agent') || undefined
			);
			return { success: true, csv, filename, recordCount };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	exportMovementsCSV: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const userRoles = await prisma.userRole.findMany({
			where: { userId: locals.user.id },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);

		const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

		if (!canViewReports) {
			return fail(403, { error: 'No tiene permisos para exportar reportes financieros' });
		}

		const data = await request.formData();
		const studentId = data.get('studentId') as string | undefined;
		const movementType = data.get('movementType') as string | undefined;
		const startDate = data.get('startDate') ? new Date(data.get('startDate') as string) : undefined;
		const endDate = data.get('endDate') ? new Date(data.get('endDate') as string) : undefined;

		try {
			const { csv, filename, recordCount } = await financialService.exportMovementsToCSV(
				{
					studentId,
					movementType: movementType as any,
					startDate,
					endDate
				},
				locals.user.id,
				getClientAddress(),
				request.headers.get('user-agent') || undefined
			);
			return { success: true, csv, filename, recordCount };
		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	}
};
