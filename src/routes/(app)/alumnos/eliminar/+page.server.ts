import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const userId = data.get('userId')?.toString();

		if (!id || !userId) {
			return fail(400, { error: 'ID de alumno no proporcionado' });
		}

		try {
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

			return { success: 'Alumno eliminado exitosamente' };
		} catch (error) {
			console.error('Error al eliminar alumno:', error);
			const message = error instanceof Error ? error.message : 'Error al eliminar el alumno';
			return fail(500, { error: message });
		}
	}
};
