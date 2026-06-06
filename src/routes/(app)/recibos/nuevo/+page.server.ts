// src/routes/(app)/recibos/nuevo/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { AuditAction } from '@prisma/client';
import { createPayslip, getActiveTeachers } from '$lib/server/services/payroll/payslip.service';
import { auditLog } from '$lib/server/audit';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	// Verificar permisos
	await requirePermission(locals.user, 'PAYSLIP', 'create');

	// Obtener docentes activos
	const teachers = await getActiveTeachers();

	// Generar años disponibles (actual y 2 años anteriores)
	const currentYear = new Date().getFullYear();
	const years = [currentYear, currentYear - 1, currentYear - 2];

	return {
		teachers,
		years
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Verificar permisos
		await requirePermission(locals.user, 'PAYSLIP', 'create');

		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const teacherId = formData.get('teacherId') as string;
		const periodMonth = formData.get('periodMonth') as string;
		const periodYear = formData.get('periodYear') as string;
		const amount = formData.get('amount') as string;
		const status = formData.get('status') as string;
		const notes = formData.get('notes') as string | null;
		const file = formData.get('file') as File;

		// Validaciones básicas
		if (!teacherId || !periodMonth || !periodYear || !amount || !status) {
			return fail(400, {
				error: 'Faltan campos obligatorios',
				teacherId,
				periodMonth,
				periodYear,
				amount,
				status,
				notes
			});
		}

		if (!file || file.size === 0) {
			return fail(400, {
				error: 'Debe seleccionar un archivo PDF',
				teacherId,
				periodMonth,
				periodYear,
				amount,
				status,
				notes
			});
		}

		try {
			// Crear recibo
			const payslip = await createPayslip(
				{
					teacherId,
					periodMonth: parseInt(periodMonth),
					periodYear: parseInt(periodYear),
					amount: parseFloat(amount),
					status: status as any,
					notes: notes || undefined
				},
				file,
				locals.user.id
			);

			// Auditoría
			try {
				await auditLog({
					action: AuditAction.CREATE,
					entityType: 'Payslip',
					entityId: payslip.id,
					description: `Carga de recibo para docente ID ${teacherId}, período ${periodMonth}/${periodYear}`,
					userId: locals.user.id
				});
			} catch (auditError) {
				// No fallar si la auditoría falla
				console.error('Error en auditoría:', auditError);
			}

			// Redirigir al listado con éxito
			throw redirect(303, '/recibos?success=created');
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al crear el recibo';

			// Si es un error de duplicado, devolver información específica
			if (errorMessage.includes('Ya existe un recibo')) {
				return fail(409, {
					error: errorMessage,
					duplicate: true,
					teacherId,
					periodMonth,
					periodYear,
					amount,
					status,
					notes
				});
			}

			return fail(500, {
				error: errorMessage,
				teacherId,
				periodMonth,
				periodYear,
				amount,
				status,
				notes
			});
		}
	}
};
