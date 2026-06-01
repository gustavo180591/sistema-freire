import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const userId = data.get('userId')?.toString();

		if (!id || !userId) {
			return fail(400, { error: 'ID de alumno no proporcionado' });
		}

		try {
			// Obtener datos del alumno antes de eliminar para auditoría
			const student = await prisma.student.findUnique({
				where: { id },
				include: { user: true }
			});

			if (!student) {
				return fail(404, { error: 'Alumno no encontrado' });
			}

			// Eliminar en transacción para mantener integridad referencial
			await prisma.$transaction(async (tx) => {
				// Eliminar alumno (esto eliminará en cascada las relaciones)
				await tx.student.delete({
					where: { id }
				});

				// Eliminar usuario
				await tx.user.delete({
					where: { id: userId }
				});
			});

			// Registrar en auditoría
			await auditLog({
				userId,
				action: AuditAction.DELETE,
				entityType: 'STUDENT',
				entityId: id,
				description: `Eliminación de alumno: ${student.firstName} ${student.lastName} (${student.user.email})`
			});

			return { success: 'Alumno eliminado exitosamente' };
		} catch (error) {
			console.error('Error al eliminar alumno:', error);
			const message = error instanceof Error ? error.message : 'Error al eliminar el alumno';
			return fail(500, { error: message });
		}
	}
};
