import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import bcrypt from 'bcryptjs';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const userId = data.get('userId')?.toString();
		const email = data.get('email')?.toString();
		const firstName = data.get('firstName')?.toString();
		const lastName = data.get('lastName')?.toString();
		const alumnoType = data.get('alumnoType')?.toString() || 'normal';
		const newPassword = data.get('newPassword')?.toString();

		if (!id || !userId || !email || !firstName || !lastName) {
			return fail(400, { error: 'Por favor completá todos los campos requeridos' });
		}

		try {
			// Actualizar en transacción
			await prisma.$transaction(async (tx) => {
				// Preparar datos de actualización del usuario
				const userUpdateData: any = {
					email,
					firstName,
					lastName
				};

				// Si se proporcionó una nueva contraseña, hashearla y actualizarla
				if (newPassword && newPassword.trim().length > 0) {
					userUpdateData.passwordHash = await bcrypt.hash(newPassword, 10);
				}

				// Actualizar usuario
				await tx.user.update({
					where: { id: userId },
					data: userUpdateData
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

			const successMessage = newPassword && newPassword.trim().length > 0
				? 'Alumno actualizado exitosamente (incluyendo contraseña)'
				: 'Alumno actualizado exitosamente';

			return { success: successMessage };
		} catch (error) {
			console.error('Error al actualizar alumno:', error);
			const message = error instanceof Error ? error.message : 'Error al actualizar el alumno';
			return fail(500, { error: message });
		}
	}
};
