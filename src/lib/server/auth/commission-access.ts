import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { hasRole } from './authorization';

export async function requireCommissionAccess(user: App.Locals['user'], commissionId: string) {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// roles con acceso global
	if (hasRole(user, ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'])) {
		return;
	}

	// docente: validar ownership por asignación
	if (hasRole(user, ['DOCENTE'])) {
		const assignment = await prisma.commissionTeacher.findFirst({
			where: {
				commissionId,
				teacher: {
					userId: user.id
				}
			}
		});

		if (!assignment) {
			throw error(403, 'No tienes acceso a esta comisión');
		}

		return;
	}

	throw error(403, 'No autorizado');
}
