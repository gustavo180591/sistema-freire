import type { PageServerLoad, Actions } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { hasPermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
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
		throw new Error('No tiene permisos para ver movimientos financieros');
	}

	// Get filters from URL
	const studentId = url.searchParams.get('studentId') || undefined;
	const movementType = url.searchParams.get('movementType') || undefined;
	const startDate = url.searchParams.get('startDate')
		? new Date(url.searchParams.get('startDate') as string)
		: undefined;
	const endDate = url.searchParams.get('endDate')
		? new Date(url.searchParams.get('endDate') as string)
		: undefined;

	try {
		const history = await financialService.getFinancialMovementsHistory({
			studentId,
			movementType: movementType as any,
			startDate,
			endDate
		});
		return { history, filters: { studentId, movementType, startDate, endDate } };
	} catch (error: any) {
		throw new Error(error.message || 'Error al obtener el historial de movimientos');
	}
};

export const actions: Actions = {
	filterMovements: async ({ request, locals }) => {
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
			return fail(403, { error: 'No tiene permisos para ver movimientos financieros' });
		}

		const data = await request.formData();
		const studentId = data.get('studentId') as string | undefined;
		const movementType = data.get('movementType') as string | undefined;
		const startDate = data.get('startDate') ? new Date(data.get('startDate') as string) : undefined;
		const endDate = data.get('endDate') ? new Date(data.get('endDate') as string) : undefined;

		// Redirect to page with query params
		const params = new URLSearchParams();
		if (studentId) params.set('studentId', studentId);
		if (movementType) params.set('movementType', movementType);
		if (startDate) params.set('startDate', startDate.toISOString().split('T')[0]);
		if (endDate) params.set('endDate', endDate.toISOString().split('T')[0]);

		return { success: true, redirectUrl: `/finanzas/movimientos?${params.toString()}` };
	}
};
