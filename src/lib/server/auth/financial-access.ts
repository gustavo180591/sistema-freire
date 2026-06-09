import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { hasRole } from './authorization';

export async function requireFinancialAccess(user: App.Locals['user'], studentId?: string) {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// Acceso global institucional
	if (hasRole(user, ['SUPERADMIN', 'DIRECTOR', 'FINANZAS'])) {
		return;
	}

	// Alumno: solo su propio estado financiero
	if (studentId && hasRole(user, ['ALUMNO'])) {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { userId: true }
		});

		if (!student) {
			throw error(404, 'Alumno no encontrado');
		}

		if (student.userId !== user.id) {
			throw error(403, 'No tienes acceso a este estado financiero');
		}

		return;
	}

	throw error(403, 'No autorizado');
}
