import type { PageServerLoad, Actions } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	await requirePermission(locals.user, 'FINANCIAL_REPORT', 'read');

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

		await requirePermission(locals.user, 'FINANCIAL_REPORT', 'read');

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
