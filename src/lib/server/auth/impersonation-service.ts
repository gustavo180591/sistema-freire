import { AuditAction, type RoleCode } from '@prisma/client';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getRoleHomeRoute, resolveActiveRole } from '$lib/server/auth/active-role';

type UserWithRoles = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	status: string;
	roles: Array<{
		role: {
			code: RoleCode;
		};
	}>;
};

function toSessionUser(
	user: UserWithRoles,
	storedActiveRole: RoleCode | null = null
): App.SessionUser {
	const assignedRoles = user.roles.map(({ role }) => role.code);

	const activeRole = resolveActiveRole(assignedRoles, storedActiveRole);

	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: activeRole ? [activeRole] : [],
		assignedRoles,
		activeRole
	};
}

/**
 * Se conserva por compatibilidad con posibles consumidores existentes.
 *
 * La selección de rol activo ya no debe basarse en esta prioridad.
 */
export function getDefaultRouteForRoles(roles: readonly string[]): string {
	if (roles.some((role) => ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'].includes(role))) {
		return '/dashboard';
	}

	if (roles.includes('DOCENTE')) {
		return '/docente';
	}

	if (roles.includes('PRECEPTOR')) {
		return '/preceptor';
	}

	if (roles.includes('FINANZAS')) {
		return '/finanzas';
	}

	if (roles.includes('ALUMNO')) {
		return '/alumno';
	}

	return '/';
}

function getSessionUserRedirect(user: App.SessionUser): string {
	if (user.activeRole) {
		return getRoleHomeRoute(user.activeRole);
	}

	if (user.assignedRoles.length > 1) {
		return '/seleccionar-vista';
	}

	return '/';
}

interface StartImpersonationInput {
	sessionId: string;
	actorUserId: string;
	targetUserId: string;
	ip?: string;
	userAgent?: string;
}

export async function startImpersonation(input: StartImpersonationInput) {
	return prisma.$transaction(async (tx) => {
		const session = await tx.session.findUnique({
			where: {
				id: input.sessionId
			},
			select: {
				id: true,
				userId: true,
				expiresAt: true,
				activeRole: true,
				impersonatedUserId: true,
				impersonationPreviousActiveRole: true,
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						status: true,
						roles: {
							select: {
								role: {
									select: {
										code: true
									}
								}
							}
						}
					}
				}
			}
		});

		if (!session || session.userId !== input.actorUserId || session.expiresAt <= new Date()) {
			throw error(403, 'Sesión no autorizada');
		}

		const actorAssignedRoles = session.user.roles.map(({ role }) => role.code);

		if (session.user.status !== 'ACTIVE' || !actorAssignedRoles.includes('SUPERADMIN')) {
			throw error(403, 'Solo un SUPERADMIN autenticado puede impersonar usuarios');
		}

		/*
		 * No basta con tener SUPERADMIN asignado.
		 * Para iniciar una impersonación debe ser además el contexto activo.
		 */
		if (session.activeRole !== 'SUPERADMIN') {
			throw error(403, 'Debes trabajar con el rol SUPERADMIN para iniciar una impersonación');
		}

		if (session.impersonatedUserId) {
			throw error(409, 'Ya existe una impersonación activa');
		}

		if (input.targetUserId === session.userId) {
			throw error(400, 'No podés impersonar tu propia cuenta');
		}

		const target = await tx.user.findUnique({
			where: {
				id: input.targetUserId
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				status: true,
				roles: {
					select: {
						role: {
							select: {
								code: true
							}
						}
					}
				}
			}
		});

		if (!target) {
			throw error(404, 'Usuario no encontrado');
		}

		if (target.status !== 'ACTIVE') {
			throw error(400, 'Solo se pueden impersonar usuarios activos');
		}

		const startedAt = new Date();

		/*
		 * Si el objetivo posee un único rol, queda activo automáticamente.
		 * Si posee varios, activeRole queda en null y deberá elegir contexto.
		 */
		const targetUser = toSessionUser(target);

		await tx.session.update({
			where: {
				id: session.id
			},
			data: {
				impersonatedUserId: target.id,
				impersonationStartedAt: startedAt,

				/*
				 * Guardamos el contexto del propietario real antes de reutilizar
				 * activeRole para el usuario impersonado.
				 */
				impersonationPreviousActiveRole: session.activeRole,
				activeRole: targetUser.activeRole
			}
		});

		await tx.auditLog.create({
			data: {
				userId: session.user.id,
				action: AuditAction.UPDATE,
				entityType: 'SESSION_IMPERSONATION',
				entityId: session.id,
				description: `Inicio de impersonación: ` + `${target.firstName} ${target.lastName}`,
				metadata: {
					event: 'IMPERSONATION_STARTED',
					originalUserId: session.user.id,
					originalActiveRole: session.activeRole,
					targetUserId: target.id,
					targetEmail: target.email,
					targetAssignedRoles: targetUser.assignedRoles,
					targetActiveRole: targetUser.activeRole
				},
				ip: input.ip ?? null,
				userAgent: input.userAgent ?? null
			}
		});

		return {
			targetUser,
			startedAt,
			redirectTo: getSessionUserRedirect(targetUser)
		};
	});
}

interface StopImpersonationInput {
	sessionId: string;
	actorUserId: string;
	ip?: string;
	userAgent?: string;
}

export async function stopImpersonation(input: StopImpersonationInput) {
	return prisma.$transaction(async (tx) => {
		const session = await tx.session.findUnique({
			where: {
				id: input.sessionId
			},
			select: {
				id: true,
				userId: true,
				expiresAt: true,
				activeRole: true,
				impersonatedUserId: true,
				impersonationPreviousActiveRole: true,
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						status: true,
						roles: {
							select: {
								role: {
									select: {
										code: true
									}
								}
							}
						}
					}
				}
			}
		});

		if (!session || session.userId !== input.actorUserId || session.expiresAt <= new Date()) {
			throw error(403, 'Sesión no autorizada');
		}

		const actorAssignedRoles = session.user.roles.map(({ role }) => role.code);

		if (session.user.status !== 'ACTIVE' || !actorAssignedRoles.includes('SUPERADMIN')) {
			throw error(403, 'Solo el SUPERADMIN original puede finalizar la impersonación');
		}

		if (!session.impersonatedUserId) {
			throw error(400, 'No existe una impersonación activa');
		}

		const targetUserId = session.impersonatedUserId;

		const target = await tx.user.findUnique({
			where: {
				id: targetUserId
			},
			select: {
				firstName: true,
				lastName: true
			}
		});

		/*
		 * Compatibilidad con impersonaciones creadas antes de activeRole:
		 * esas sesiones pueden no tener impersonationPreviousActiveRole.
		 *
		 * Como históricamente solo SUPERADMIN podía impersonar, SUPERADMIN es
		 * el fallback seguro para esas sesiones si continúa asignado.
		 */
		const previousActiveRole =
			session.impersonationPreviousActiveRole ??
			(actorAssignedRoles.includes('SUPERADMIN') ? 'SUPERADMIN' : null);

		const restoredActiveRole = resolveActiveRole(actorAssignedRoles, previousActiveRole);

		const originalUser = toSessionUser(session.user, restoredActiveRole);

		await tx.session.update({
			where: {
				id: session.id
			},
			data: {
				activeRole: restoredActiveRole,
				impersonatedUserId: null,
				impersonationStartedAt: null,
				impersonationPreviousActiveRole: null
			}
		});

		await tx.auditLog.create({
			data: {
				userId: session.user.id,
				action: AuditAction.UPDATE,
				entityType: 'SESSION_IMPERSONATION',
				entityId: session.id,
				description: target
					? `Fin de impersonación: ${target.firstName} ${target.lastName}`
					: 'Fin de impersonación',
				metadata: {
					event: 'IMPERSONATION_ENDED',
					originalUserId: session.user.id,
					targetUserId,
					previousActiveRole: session.impersonationPreviousActiveRole,
					restoredActiveRole
				},
				ip: input.ip ?? null,
				userAgent: input.userAgent ?? null
			}
		});

		return {
			originalUser,
			redirectTo: getSessionUserRedirect(originalUser)
		};
	});
}
