import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const userId = data.get('userId')?.toString();
		const dischargeReason = data.get('dischargeReason')?.toString();
		const dischargeNotes = data.get('dischargeNotes')?.toString();

		if (!id || !userId) {
			return fail(400, { error: 'ID de alumno no proporcionado' });
		}

		if (!dischargeReason) {
			return fail(400, { error: 'Debe seleccionar un motivo de baja' });
		}

		try {
			// Obtener datos del alumno antes de dar de baja para auditoría
			const student = await prisma.student.findUnique({
				where: { id },
				include: { user: true }
			});

			if (!student) {
				return fail(404, { error: 'Alumno no encontrado' });
			}

			// Realizar baja lógica manteniendo registros financieros y académicos
			await prisma.$transaction(async (tx) => {
				// Actualizar alumno con información de baja
				await tx.student.update({
					where: { id },
					data: {
						status: 'INACTIVE',
						dischargeReason: dischargeReason as
							| 'VOLUNTARY_WITHDRAWAL'
							| 'ACADEMIC_DISMISSAL'
							| 'FINANCIAL_DISMISSAL'
							| 'DISCIPLINARY_DISMISSAL'
							| 'TRANSFER'
							| 'DECEASED'
							| 'OTHER',
						dischargeDate: new Date(),
						dischargeNotes: dischargeNotes || null,
						dischargedBy: locals.user?.id || null
					}
				});

				// Actualizar usuario a inactivo (no eliminar)
				await tx.user.update({
					where: { id: userId },
					data: {
						status: 'INACTIVE'
					}
				});
			});

			// Registrar en auditoría
			await auditLog({
				userId,
				action: AuditAction.DELETE,
				entityType: 'STUDENT',
				entityId: id,
				description: `Baja lógica de alumno: ${student.firstName} ${student.lastName} (${student.user.email}) - Motivo: ${dischargeReason}`
			});

			return { success: 'Alumno dado de baja exitosamente' };
		} catch (error) {
			console.error('Error al dar de baja alumno:', error);

			// Manejar error de restricción de clave foránea (P2003)
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
				return fail(400, {
					error:
						'No se puede eliminar físicamente el alumno porque tiene registros financieros o académicos. Se debe realizar una baja lógica.'
				});
			}

			const message = error instanceof Error ? error.message : 'Error al dar de baja el alumno';
			return fail(500, { error: message });
		}
	}
};
