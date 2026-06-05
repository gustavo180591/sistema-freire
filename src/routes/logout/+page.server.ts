import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		const userId = locals.user?.id;
		const token = cookies.get('session');
		
		// Eliminar la sesión de la base de datos
		if (token) {
			await prisma.session.deleteMany({
				where: {
					tokenHash: token
				}
			});
		}

		// Eliminar la cookie de sesión
		cookies.delete('session', { path: '/' });

		// Registrar logout en auditoría
		if (userId) {
			await auditLog({
				userId,
				action: AuditAction.LOGOUT,
				entityType: 'SESSION',
				description: 'Cierre de sesión del usuario'
			});
		}

		// Redirigir al login
		throw redirect(303, '/login');
	}
};
