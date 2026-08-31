import { prisma } from '$lib/server/db/prisma';
import { error } from '@sveltejs/kit';

/**
 * Obtiene el alumno vinculado directamente a la cuenta autenticada.
 *
 * Student.userId es la fuente de verdad para resolver ownership.
 * No se realizan asociaciones por DNI durante una petición autenticada.
 */
export async function getCurrentStudentForUser(userId: string) {
	const student = await prisma.student.findUnique({
		where: {
			userId
		}
	});

	if (!student) {
		throw error(
			404,
			'No encontramos un alumno asociado a tu usuario. Por favor acércate a Secretaría.'
		);
	}

	return student;
}

/**
 * Asegura que el usuario tenga un estudiante asociado.
 * Lanza error si no se puede resolver.
 */
export async function assertCurrentStudentForUser(userId: string) {
	return await getCurrentStudentForUser(userId);
}
