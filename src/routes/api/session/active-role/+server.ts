import { AuditAction } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { getRoleHomeRoute } from '$lib/server/auth/active-role';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.sessionId) {
		throw error(401, 'No autenticado');
	}

	const formData = await request.formData();
	const requestedRole = formData.get('role')?.toString();

	if (!requestedRole) {
		throw error(400, 'Debes seleccionar un rol');
	}

	const role = locals.user.assignedRoles.find((assignedRole) => assignedRole === requestedRole);

	if (!role) {
		throw error(403, 'No tienes asignado el rol seleccionado');
	}

	if (locals.user.activeRole === role) {
		throw redirect(303, getRoleHomeRoute(role));
	}

	const previousActiveRole = locals.user.activeRole;
	const actorUserId = locals.authenticatedUser?.id ?? locals.user.id;

	await prisma.$transaction([
		prisma.session.update({
			where: {
				id: locals.sessionId
			},
			data: {
				activeRole: role
			}
		}),

		prisma.auditLog.create({
			data: {
				userId: actorUserId,
				action: AuditAction.UPDATE,
				entityType: 'SESSION_ACTIVE_ROLE',
				entityId: locals.sessionId,
				description: `Cambio de rol activo: ${previousActiveRole ?? 'sin seleccionar'} → ${role}`,
				metadata: {
					event: 'ACTIVE_ROLE_CHANGED',
					effectiveUserId: locals.user.id,
					previousActiveRole,
					activeRole: role,
					impersonationActive: Boolean(locals.impersonation)
				}
			}
		})
	]);

	throw redirect(303, getRoleHomeRoute(role));
};
