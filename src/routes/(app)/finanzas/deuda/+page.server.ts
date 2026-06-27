import { error, fail, redirect } from '@sveltejs/kit';
import { financialService } from '$lib/server/financial/financial-service';
import { prisma } from '$lib/server/db/prisma';
import { hasPermission } from '$lib/server/auth/permissions-granular';

export async function load({ locals, url }: any) {
	const userId = locals.user?.id;
	if (!userId) {
		throw redirect(302, '/login');
	}

	const studentId = url.searchParams.get('studentId');

	if (studentId) {
		// Get user roles
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);

		// Check if user is a student
		const student = await prisma.student.findUnique({
			where: { userId }
		});

		// Ownership validation: students can only view their own debt
		if (student && student.id !== studentId) {
			throw error(403, 'No tiene permisos para consultar deuda de otros alumnos');
		}

		// Permission validation: non-students need financial permissions
		if (!student) {
			const canViewDebt = await hasPermission(roleCodes[0] || '', 'FINANCIAL_BLOCK', 'read');
			if (!canViewDebt) {
				throw error(403, 'No tiene permisos para consultar deuda');
			}
		}

		// Load specific student debt
		try {
			const status = await financialService.getStudentFinancialStatus(studentId);
			return { userId, studentStatus: status, isStudent: !!student };
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

		// Ownership validation
		const student = await prisma.student.findUnique({
			where: { userId }
		});
		if (student && student.id !== studentId) {
			return fail(403, { error: 'No tiene permisos para consultar deuda de otros alumnos' });
		}

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

		// Ownership validation
		const student = await prisma.student.findUnique({
			where: { userId }
		});
		if (student && student.id !== studentId) {
			return fail(403, { error: 'No tiene permisos para consultar deuda de otros alumnos' });
		}

		try {
			const status = await financialService.getStudentFinancialStatusWithAgreements(studentId);
			return { success: true, status };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al calcular deuda con convenios' });
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

		// Students cannot evaluate blocks
		const student = await prisma.student.findUnique({
			where: { userId }
		});
		if (student) {
			return fail(403, { error: 'Los alumnos no pueden evaluar bloqueos' });
		}

		// Permission validation
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);
		const canManage = await hasPermission(roleCodes[0] || '', 'FINANCIAL_BLOCK', 'update');
		if (!canManage) {
			return fail(403, { error: 'No tiene permisos para evaluar bloqueos' });
		}

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

		// Students cannot create exceptions
		const student = await prisma.student.findUnique({
			where: { userId }
		});
		if (student) {
			return fail(403, { error: 'Los alumnos no pueden crear excepciones' });
		}

		// Permission validation
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);
		const canManage = await hasPermission(roleCodes[0] || '', 'FINANCIAL_BLOCK', 'update');
		if (!canManage) {
			return fail(403, { error: 'No tiene permisos para crear excepciones' });
		}

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

		// Students cannot revoke exceptions
		const student = await prisma.student.findUnique({
			where: { userId }
		});
		if (student) {
			return fail(403, { error: 'Los alumnos no pueden revocar excepciones' });
		}

		// Permission validation
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur: any) => ur.role.code);
		const canManage = await hasPermission(roleCodes[0] || '', 'FINANCIAL_BLOCK', 'update');
		if (!canManage) {
			return fail(403, { error: 'No tiene permisos para revocar excepciones' });
		}

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
