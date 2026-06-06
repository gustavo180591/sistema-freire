// src/routes/(app)/recibos/[id]/editar/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { AuditAction } from '@prisma/client';
import { getPayslipById, updatePayslip, replacePayslipFile, deletePayslip } from '$lib/server/services/payroll/payslip.service';
import { auditLog } from '$lib/server/audit';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Verificar permisos
	await requirePermission(locals.user, 'PAYSLIP', 'update');

	const payslip = await getPayslipById(params.id);

	if (!payslip) {
		throw error(404, 'Recibo no encontrado');
	}

	if (payslip.deletedAt) {
		throw error(404, 'Recibo no encontrado');
	}

	return {
		payslip
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		// Verificar permisos
		await requirePermission(locals.user, 'PAYSLIP', 'update');

		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const amount = formData.get('amount') as string;
		const status = formData.get('status') as string;
		const notes = formData.get('notes') as string | null;

		// Validaciones básicas
		if (!amount || !status) {
			return fail(400, {
				error: 'Faltan campos obligatorios',
				amount,
				status,
				notes
			});
		}

		try {
			const updated = await updatePayslip(params.id, {
				amount: parseFloat(amount),
				status: status as any,
				notes: notes || undefined
			});

			// Auditoría
			try {
				await auditLog({
					action: AuditAction.UPDATE,
					entityType: 'Payslip',
					entityId: params.id,
					description: `Actualización de recibo ID ${params.id}`,
					userId: locals.user.id
				});
			} catch (auditError) {
				console.error('Error en auditoría:', auditError);
			}

			return { success: true, message: 'Recibo actualizado correctamente' };
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el recibo';
			return fail(500, {
				error: errorMessage,
				amount,
				status,
				notes
			});
		}
	},

	replaceFile: async ({ request, params, locals }) => {
		// Verificar permisos
		await requirePermission(locals.user, 'PAYSLIP', 'update');

		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, {
				error: 'Debe seleccionar un archivo PDF'
			});
		}

		try {
			const updated = await replacePayslipFile(params.id, file, locals.user.id);

			// Auditoría
			try {
				await auditLog({
					action: AuditAction.UPDATE,
					entityType: 'Payslip',
					entityId: params.id,
					description: `Reemplazo de archivo PDF en recibo ID ${params.id}`,
					userId: locals.user.id
				});
			} catch (auditError) {
				console.error('Error en auditoría:', auditError);
			}

			return { success: true, message: 'Archivo reemplazado correctamente' };
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al reemplazar el archivo';
			return fail(500, {
				error: errorMessage
			});
		}
	},

	delete: async ({ params, locals }) => {
		// Verificar permisos
		await requirePermission(locals.user, 'PAYSLIP', 'delete');

		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		try {
			await deletePayslip(params.id, locals.user.id);

			// Auditoría
			try {
				await auditLog({
					action: AuditAction.DELETE,
					entityType: 'Payslip',
					entityId: params.id,
					description: `Eliminación lógica de recibo ID ${params.id}`,
					userId: locals.user.id
				});
			} catch (auditError) {
				console.error('Error en auditoría:', auditError);
			}

			throw redirect(303, '/recibos?success=deleted');
		} catch (err) {
			if (err instanceof Error && err.message.includes('redirect')) {
				throw err;
			}
			const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el recibo';
			return fail(500, {
				error: errorMessage
			});
		}
	}
};
