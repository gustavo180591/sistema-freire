import { AuditAction } from '@prisma/client';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

type UserWithRoles = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	status: string;
	roles: Array<{
		role: {
			code: string;
		};
	}>;
};

function toSessionUser(user: UserWithRoles): App.SessionUser {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: user.roles.map(({ role }) => role.code)
	};
}

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
				impersonatedUserId: true,
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

		if (
			session.user.status !== 'ACTIVE' ||
			!session.user.roles.some(({ role }) => role.code === 'SUPERADMIN')
		) {
			throw error(403, 'Solo un SUPERADMIN autenticado puede impersonar usuarios');
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
		const targetUser = toSessionUser(target);

		await tx.session.update({
			where: {
				id: session.id
			},
			data: {
				impersonatedUserId: target.id,
				impersonationStartedAt: startedAt
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
					targetUserId: target.id,
					targetEmail: target.email,
					targetRoles: targetUser.roles
				},
				ip: input.ip ?? null,
				userAgent: input.userAgent ?? null
			}
		});

		return {
			targetUser,
			startedAt,
			redirectTo: getDefaultRouteForRoles(targetUser.roles)
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
				impersonatedUserId: true,
				user: {
					select: {
						id: true,
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

		if (!session || session.userId !== input.actorUserId) {
			throw error(403, 'Sesión no autorizada');
		}

		if (
			session.user.status !== 'ACTIVE' ||
			!session.user.roles.some(({ role }) => role.code === 'SUPERADMIN')
		) {
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

		await tx.session.update({
			where: {
				id: session.id
			},
			data: {
				impersonatedUserId: null,
				impersonationStartedAt: null
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
					targetUserId
				},
				ip: input.ip ?? null,
				userAgent: input.userAgent ?? null
			}
		});

		return {
			redirectTo: '/dashboard'
		};
	});
}
