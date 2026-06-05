import { json } from '@sveltejs/kit';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const POST = async ({ cookies, locals }: RequestEvent) => {
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

	// Devolver respuesta exitosa (el cliente manejará la redirección)
	return json({ success: true });
};
