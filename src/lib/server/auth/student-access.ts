import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requirePreceptorStudentAccess } from '$lib/server/preceptor/preceptor-scope-service';
import { hasRole } from './authorization';

export async function requireStudentAccess(user: App.Locals['user'], studentId: string) {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// Acceso global institucional (incluye APODERADO con acceso total)
	if (hasRole(user, ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'])) {
		return;
	}

	// Preceptor: acceso únicamente a alumnos de sus sedes asignadas.
	if (hasRole(user, ['PRECEPTOR'])) {
		await requirePreceptorStudentAccess(user.id, studentId);
		return;
	}

	// Alumno solo su propio legajo
	if (hasRole(user, ['ALUMNO'])) {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { userId: true }
		});

		if (!student) {
			throw error(404, 'Alumno no encontrado');
		}

		if (student.userId !== user.id) {
			throw error(403, 'No tienes acceso a este legajo');
		}

		return;
	}

	throw error(403, 'No autorizado');
}
