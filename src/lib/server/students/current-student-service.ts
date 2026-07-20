import { prisma } from '$lib/server/db/prisma';
import { error } from '@sveltejs/kit';

/**
 * Normaliza un DNI para comparación:
 * - Trim
 * - Quita puntos
 * - Quita espacios
 * - Quita guiones
 */
export function normalizeDni(dni: string): string {
	return dni.trim().replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '');
}

/**
 * Obtiene el estudiante asociado a un usuario por DNI.
 * Busca directamente el Student por el DNI del usuario.
 */
export async function getCurrentStudentForUser(userId: string) {
	// Buscar el usuario para obtener su DNI
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { dni: true }
	});

	if (!user || !user.dni) {
		throw error(
			404,
			'Tu usuario no tiene DNI cargado. Por favor acércate a Secretaría para vincular tu cuenta.'
		);
	}

	// Normalizar DNI del usuario
	const normalizedUserDni = normalizeDni(user.dni);

	// Buscar student por DNI
	const student = await prisma.student.findFirst({
		where: { dni: normalizedUserDni }
	});

	if (!student) {
		throw error(
			404,
			'No encontramos un alumno asociado al DNI de tu usuario. Por favor acércate a Secretaría.'
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
