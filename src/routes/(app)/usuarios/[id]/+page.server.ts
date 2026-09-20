import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { RoleCode } from '@prisma/client';
import { AuditAction } from '@prisma/client';
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

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
	await requirePermission(currentUser, 'USER', 'read');
	await requireSuperadminTargetAccess(currentUser, params.id);
	await requireSecretaryTargetAccess(currentUser, params.id);

	const user = await prisma.user.findUnique({
		where: {
			id: params.id
		},
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: {
				include: {
					career: {
						include: {
							locations: {
								include: {
									location: true
								}
							}
						}
					},
					location: true
				}
			},
			teacher: {
				include: {
					subjects: {
						include: {
							subject: {
								include: {
									careerSubjects: {
										include: {
											career: {
												include: {
													locations: {
														include: {
															location: true
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			},
			locationPermissions: {
				include: {
					location: true
				}
			}
		}
	});

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	let teacherCareer: {
		id: string;
		name: string;
		code: string;
		locations: string[];
	} | null = null;

	if (user.teacher && user.teacher.subjects.length > 0) {
		const firstSubject = user.teacher.subjects[0];

		if (firstSubject.subject.careerSubjects.length > 0) {
			const careerSubject = firstSubject.subject.careerSubjects[0];

			const locations = user.locationPermissions.map((permission) => permission.location.name);

			teacherCareer = {
				id: careerSubject.career.id,
				name: careerSubject.career.name,
				code: careerSubject.career.code,
				locations
			};
		}
	}

	/*
	 * IMPORTANTE:
	 * Construimos explícitamente el objeto que viaja al navegador.
	 * No serializamos passwordHash, totpSecret ni datos internos
	 * del mecanismo de bloqueo de autenticación.
	 */
	const serializedUser = {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		status: user.status,
		phone: user.phone,
		dni: user.dni,
		cuil: user.cuil,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		totpEnabled: user.totpEnabled,
		totpVerified: user.totpVerified,
		roles: user.roles,
		student: user.student,
		locationPermissions: user.locationPermissions,
		teacher: user.teacher
			? {
					...user.teacher,
					subjects: user.teacher.subjects.map((subjectTeacher) => ({
						...subjectTeacher,
						subject: {
							...subjectTeacher.subject,
							approvalThreshold:
								subjectTeacher.subject.approvalThreshold != null
									? Number(subjectTeacher.subject.approvalThreshold)
									: null,
							promotionThreshold:
								subjectTeacher.subject.promotionThreshold != null
									? Number(subjectTeacher.subject.promotionThreshold)
									: null,
							careerSubjects: subjectTeacher.subject.careerSubjects.map((careerSubject) => ({
								...careerSubject,
								career: {
									...careerSubject.career,
									locations: careerSubject.career.locations.map((careerLocation) => ({
										...careerLocation,
										location: careerLocation.location
									}))
								}
							}))
						}
					}))
				}
			: null
	};

	const targetIsSuperadmin = user.roles.some(({ role }) => role.code === 'SUPERADMIN');

	const hasResetRole = currentUser.roles.some((role) => USER_MANAGEMENT_ROLES.includes(role));

	const canResetPassword =
		hasResetRole &&
		currentUser.id !== user.id &&
		(isSuperadmin(currentUser) || !targetIsSuperadmin);

	/*
	 * En el detalle del usuario mostramos únicamente las
	 * evaluaciones creadas por ese usuario.
	 *
	 * Que el usuario objetivo sea administrativo no debe convertir
	 * esta pantalla en una vista global de todas las evaluaciones.
	 */
	const evaluations = await prisma.evaluation.findMany({
		where: {
			createdByUserId: user.id
		},
		include: {
			subject: true,
			createdByUser: {
				select: {
					firstName: true,
					lastName: true
				}
			}
		},
		orderBy: {
			evaluationDate: 'desc'
		}
	});

	return {
		user: serializedUser,
		teacherCareer,
		canResetPassword,
		evaluations: evaluations.map((evaluation) => ({
			id: evaluation.id,
			title: evaluation.title,
			type: evaluation.type,
			date: evaluation.evaluationDate,
			subject: evaluation.subject.name,
			subjectCode: evaluation.subject.code,
			creator: `${evaluation.createdByUser.firstName} ${evaluation.createdByUser.lastName}`
		}))
	};
};

export const actions: Actions = {
	resetPassword: async ({ params, locals }) => {
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
				error: 'No puedes restablecer tu propia contraseña desde la administración'
			});
		}

		const user = await prisma.user.findUnique({
			where: {
				id: params.id
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true
			}
		});

		if (!user) {
			return fail(404, {
				error: 'Usuario no encontrado'
			});
		}

		/*
		 * Contraseña temporal aleatoria.
		 * Se muestra una única vez en la respuesta de la acción.
		 */
		const temporaryPassword = randomBytes(12).toString('base64url');
		const passwordHash = await bcrypt.hash(temporaryPassword, 10);

		try {
			const deletedSessions = await prisma.$transaction(async (tx) => {
				await tx.user.update({
					where: {
						id: params.id
					},
					data: {
						passwordHash,
						failedLoginAttempts: 0,
						lockedUntil: null,
						lastFailedAttempt: null
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
				description: `Restablecimiento administrativo de contraseña para ${user.firstName} ${user.lastName} (${user.email}). ${deletedSessions.count} sesiones revocadas.`
			});

			return {
				success: true,
				message: `Contraseña temporal para ${user.firstName} ${user.lastName}: ${temporaryPassword}`
			};
		} catch (error) {
			console.error('Error al restablecer contraseña:', error);

			return fail(500, {
				error: 'Error al restablecer la contraseña'
			});
		}
	}
};
