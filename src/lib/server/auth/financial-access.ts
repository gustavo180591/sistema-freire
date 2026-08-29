import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const GLOBAL_FINANCIAL_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'];

/**
 * Autoriza el acceso de lectura al estado financiero de un alumno.
 *
 * Capacidad:
 *   STUDENT_CHARGE/read
 *
 * Scope:
 *   - autoridades institucionales: cualquier alumno
 *   - ALUMNO: únicamente su propio registro
 *
 * Las acciones que modifican datos deben exigir adicionalmente
 * el permiso granular específico de la operación.
 */
export async function requireStudentFinancialReadAccess(
	user: App.Locals['user'],
	studentId: string
): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	await requirePermission(user, 'STUDENT_CHARGE', 'read');

	// Un usuario multirol conserva el scope más amplio que posea.
	if (user.roles.some((role) => GLOBAL_FINANCIAL_ROLES.includes(role))) {
		return;
	}

	if (user.roles.includes('ALUMNO')) {
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
