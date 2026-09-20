import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { RoleCode } from '@prisma/client';
import { AuditAction } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireRole } from '$lib/server/auth/authorization';

const USER_MANAGEMENT_ROLES: string[] = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const SECRETARY_RESTRICTED_ROLES: RoleCode[] = [
	'SUPERADMIN',
	'SECRETARIA',
	'DIRECTOR',
	'APODERADO',
	'FINANZAS'
];

type AuthenticatedUser = NonNullable<App.Locals['user']>;

function usesSecretaryScope(user: AuthenticatedUser): boolean {
	return user.roles.includes('SECRETARIA');
}

function isSuperadmin(user: AuthenticatedUser): boolean {
	return user.roles.includes('SUPERADMIN');
}

async function getSecretaryLocationIds(userId: string): Promise<string[]> {
	const permissions = await prisma.userLocationPermission.findMany({
		where: {
			userId,
			location: {
				active: true
			}
		},
		select: {
			locationId: true
		}
	});

	return [...new Set(permissions.map((permission) => permission.locationId))];
}

async function requireSuperadminTargetAccess(
	currentUser: AuthenticatedUser,
	targetUserId: string
): Promise<void> {
	if (isSuperadmin(currentUser)) {
		return;
	}

	const target = await prisma.user.findUnique({
		where: {
			id: targetUserId
		},
		select: {
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

	if (target.roles.some(({ role }) => role.code === 'SUPERADMIN')) {
		throw error(403, 'Solo SUPERADMIN puede administrar a otro usuario SUPERADMIN');
	}
}

async function requireSecretaryTargetAccess(
	currentUser: AuthenticatedUser,
	targetUserId: string
): Promise<void> {
	if (!usesSecretaryScope(currentUser)) {
		return;
	}

	const locationIds = await getSecretaryLocationIds(currentUser.id);

	if (locationIds.length === 0) {
		throw error(403, 'No tienes sedes habilitadas para administrar usuarios');
	}

	const target = await prisma.user.findUnique({
		where: {
			id: targetUserId
		},
		select: {
			roles: {
				select: {
					role: {
						select: {
							code: true
						}
					}
				}
			},
			student: {
				select: {
					locationId: true
				}
			},
			locationPermissions: {
				select: {
					locationId: true
				}
			}
		}
	});

	if (!target) {
		throw error(404, 'Usuario no encontrado');
	}

	if (target.roles.some(({ role }) => SECRETARY_RESTRICTED_ROLES.includes(role.code))) {
		throw error(403, 'No tienes permiso para administrar usuarios con roles administrativos');
	}

	const studentInScope =
		target.student?.locationId != null && locationIds.includes(target.student.locationId);

	const staffInScope = target.locationPermissions.some((permission) =>
		locationIds.includes(permission.locationId)
	);

	if (!studentInScope && !staffInScope) {
		throw error(403, 'El usuario pertenece a otra sede');
	}
}

async function getTargetUser(userId: string) {
	return prisma.user.findUnique({
		where: {
			id: userId
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			status: true,
			roles: {
				select: {
					role: {
						select: {
							code: true,
							name: true
						}
					}
				}
			},
			student: {
				select: {
					id: true
				}
			},
			teacher: {
				select: {
					id: true
				}
			}
		}
	});
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
	await requirePermission(currentUser, 'USER', 'update');
	await requireSuperadminTargetAccess(currentUser, params.id);
	await requireSecretaryTargetAccess(currentUser, params.id);

	if (currentUser.id === params.id) {
		throw error(400, 'No puedes desactivar tu propia cuenta desde la administración');
	}

	const user = await getTargetUser(params.id);

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	return {
		user
	};
};

export const actions: Actions = {
	default: async ({ params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, {
				error: 'No autorizado'
			});
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'USER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);
		await requireSecretaryTargetAccess(currentUser, params.id);

		if (currentUser.id === params.id) {
			return fail(400, {
				error: 'No puedes desactivar tu propia cuenta desde la administración'
			});
		}

		const user = await getTargetUser(params.id);

		if (!user) {
			return fail(404, {
				error: 'Usuario no encontrado'
			});
		}

		if (user.status === 'INACTIVE') {
			return fail(400, {
				error: 'El usuario ya se encuentra inactivo'
			});
		}

		const targetIsSuperadmin = user.roles.some(({ role }) => role.code === 'SUPERADMIN');

		if (targetIsSuperadmin) {
			const activeSuperadminCount = await prisma.user.count({
				where: {
					status: 'ACTIVE',
					roles: {
						some: {
							role: {
								code: 'SUPERADMIN'
							}
						}
					}
				}
			});

			if (activeSuperadminCount <= 1) {
				return fail(400, {
					error: 'No se puede desactivar el último SUPERADMIN activo'
				});
			}
		}

		try {
			const deletedSessions = await prisma.$transaction(async (tx) => {
				await tx.user.update({
					where: {
						id: params.id
					},
					data: {
						status: 'INACTIVE'
					}
				});

				return tx.session.deleteMany({
					where: {
						userId: params.id
					}
				});
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'USER',
				entityId: params.id,
				description: `Desactivación del usuario ${user.firstName} ${user.lastName} (${user.email}). ${deletedSessions.count} sesiones revocadas.`
			});

			throw redirect(303, '/usuarios');
		} catch (caught) {
			if (
				typeof caught === 'object' &&
				caught !== null &&
				'status' in caught &&
				'location' in caught
			) {
				throw caught;
			}

			console.error('Error al desactivar usuario:', caught);

			return fail(500, {
				error: 'Error al desactivar el usuario'
			});
		}
	}
};
