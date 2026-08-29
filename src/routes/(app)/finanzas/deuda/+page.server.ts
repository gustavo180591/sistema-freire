import { error, fail, redirect } from '@sveltejs/kit';
import { financialService } from '$lib/server/financial/financial-service';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireStudentFinancialReadAccess } from '$lib/server/auth/financial-access';

export async function load({ locals, url }: any) {
	const userId = locals.user?.id;
	if (!userId) {
		throw redirect(302, '/login');
	}

	const studentId = url.searchParams.get('studentId');

	if (studentId) {
		await requireStudentFinancialReadAccess(locals.user, studentId);

		// Load specific student debt
		try {
			const status = await financialService.getStudentFinancialStatus(studentId);
			return {
				userId,
				studentStatus: status,
				isStudent: locals.user.roles.includes('ALUMNO')
			};
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al cargar deuda del alumno' });
		}
	}

	return { userId };
}

export const actions = {
	getDebtSummary: async ({ request, locals }: any) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;

		if (!studentId) {
			return fail(400, { error: 'Falta el ID del alumno' });
		}

		await requireStudentFinancialReadAccess(locals.user, studentId);

		try {
			const summary = await financialService.calculateDebtSummary(studentId);
			return { success: true, summary };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al calcular deuda' });
		}
	},

	getDebtSummaryWithAgreements: async ({ request, locals }) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;

		if (!studentId) {
			return fail(400, { error: 'Falta el ID del alumno' });
		}

		await requireStudentFinancialReadAccess(locals.user, studentId);
		await requirePermission(locals.user, 'PAYMENT_AGREEMENT', 'read');

		try {
			const status = await financialService.getStudentFinancialStatusWithAgreements(studentId);
			return { success: true, status };
		} catch (e) {
			return fail(400, {
				error: e instanceof Error ? e.message : 'Error al calcular deuda con convenios'
			});
		}
	},

	evaluateBlocks: async ({ request, locals }: any) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;

		if (!studentId) {
			return fail(400, { error: 'Falta el ID del alumno' });
		}

		await requirePermission(locals.user, 'FINANCIAL_BLOCK', 'update');

		try {
			await financialService.evaluateFinancialBlocks(studentId, userId);
			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al evaluar bloqueos' });
		}
	},

	createException: async ({ request, locals }: any) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const blockType = formData.get('blockType') as string;
		const reason = formData.get('reason') as string;
		const expiresAt = formData.get('expiresAt') as string | null;

		if (!studentId || !blockType || !reason) {
			return fail(400, { error: 'Faltan datos requeridos' });
		}

		await requirePermission(locals.user, 'FINANCIAL_BLOCK', 'update');

		try {
			await financialService.createFinancialBlockException({
				studentId,
				blockType: blockType as any,
				reason,
				userId,
				expiresAt: expiresAt ? new Date(expiresAt) : undefined
			});
			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al crear excepción' });
		}
	},

	revokeException: async ({ request, locals }: any) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const blockType = formData.get('blockType') as string;

		if (!studentId || !blockType) {
			return fail(400, { error: 'Faltan datos requeridos' });
		}

		await requirePermission(locals.user, 'FINANCIAL_BLOCK', 'update');

		try {
			await financialService.revokeFinancialBlockException({
				studentId,
				blockType: blockType as any,
				userId
			});
			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al revocar excepción' });
		}
	}
};
