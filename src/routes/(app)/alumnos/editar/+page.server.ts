import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const userId = data.get('userId')?.toString();
		const email = data.get('email')?.toString();
		const firstName = data.get('firstName')?.toString();
		const lastName = data.get('lastName')?.toString();
		const alumnoType = data.get('alumnoType')?.toString() || 'normal';

		if (!id || !userId || !email || !firstName || !lastName) {
			return fail(400, { error: 'Por favor completá todos los campos requeridos' });
		}

		try {
			// Actualizar en transacción
			await prisma.$transaction(async (tx) => {
				// Actualizar usuario
				await tx.user.update({
					where: { id: userId },
					data: {
						email,
						firstName,
						lastName
					}
				});

				// Calcular flags según tipo
				const isBecado = alumnoType === 'becado';
				const isRecursante = alumnoType === 'recursante';

				// Actualizar alumno
				await tx.student.update({
					where: { id },
					data: {
						firstName,
						lastName,
						isBecado,
						isRecursante
					}
				});
			});

			return { success: 'Alumno actualizado exitosamente' };
		} catch (error) {
			console.error('Error al actualizar alumno:', error);
			const message = error instanceof Error ? error.message : 'Error al actualizar el alumno';
			return fail(500, { error: message });
		}
	}
};
