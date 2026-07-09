import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) {
		throw redirect(303, '/login');
	}

	const user = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: true,
			teacher: {
				include: {
					subjects: {
						include: {
							subject: true
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

	// Verificar permisos: SECRETARIA no puede editar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO
	const isSecretary = currentUser.roles.includes('SECRETARIA');
	const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO'];

	if (isSecretary) {
		const hasRestrictedRole = user.roles.some((ur) => restrictedRoles.includes(ur.role.code));
		if (hasRestrictedRole) {
			throw error(403, 'No tienes permiso para editar usuarios con roles administrativos');
		}
	}

	const roles = await prisma.role.findMany({
		orderBy: { name: 'asc' }
	});

	const subjects = await prisma.subject.findMany({
		where: { active: true },
		orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }]
	});

	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	return {
		user,
		currentUserRoles: currentUser.roles,
		roles,
		subjects: subjects.map((s) => ({
			...s,
			approvalThreshold: s.approvalThreshold ? Number(s.approvalThreshold) : null,
			promotionThreshold: s.promotionThreshold ? Number(s.promotionThreshold) : null
		})),
		careers,
		locations
	};
};

export const actions: Actions = {
	updateUser: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		// Obtener roles del usuario a editar
		const targetUser = await prisma.user.findUnique({
			where: { id: params.id },
			include: {
				roles: {
					include: {
						role: true
					}
				}
			}
		});

		if (!targetUser) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		// Verificar permisos: SECRETARIA no puede editar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO, FINANZAS
		const isSecretary = currentUser.roles.includes('SECRETARIA');
		const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO', 'FINANZAS'];

		if (isSecretary) {
			const hasRestrictedRole = targetUser.roles.some((ur) =>
				restrictedRoles.includes(ur.role.code)
			);
			if (hasRestrictedRole) {
				return fail(403, {
					error: 'No tienes permiso para editar usuarios con roles administrativos'
				});
			}
		}

		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString();
		const lastName = formData.get('lastName')?.toString();
		const email = formData.get('email')?.toString();
		const status = formData.get('status')?.toString();
		const phone = formData.get('phone')?.toString();
		const dni = formData.get('dni')?.toString();

		if (!firstName || !lastName || !email) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		// Validar status
		const validStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
		if (status && !validStatuses.includes(status)) {
			return fail(400, { error: 'Estado inválido' });
		}

		try {
			await prisma.user.update({
				where: { id: params.id },
				data: {
					firstName,
					lastName,
					email,
					phone: phone || null,
					status: status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
				}
			});

			// Actualizar DNI si el usuario es alumno o docente
			// Verificar si es alumno
			const student = await prisma.student.findUnique({
				where: { userId: params.id }
			});
			if (student && dni) {
				await prisma.student.update({
					where: { userId: params.id },
					data: { dni }
				});
			}

			// Verificar si es docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});
			if (teacher && dni) {
				await prisma.teacher.update({
					where: { userId: params.id },
					data: { dni }
				});
			}

			// Registrar en auditoría
			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'USER',
				entityId: params.id,
				description: `Actualización de usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar usuario' });
		}
	},

	updateRoles: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		const formData = await request.formData();
		const roleIds = formData.getAll('roleIds').map((r) => r.toString());

		try {
			// Validar que todos los roleIds existan
			if (roleIds.length > 0) {
				const roles = await prisma.role.findMany({
					where: { id: { in: roleIds } }
				});
				if (roles.length !== roleIds.length) {
					return fail(400, { error: 'Algunos roles no existen' });
				}
			}

			// Eliminar roles actuales
			await prisma.userRole.deleteMany({
				where: { userId: params.id }
			});

			// Agregar nuevos roles
			if (roleIds.length > 0) {
				await prisma.userRole.createMany({
					data: roleIds.map((roleId) => ({
						userId: params.id,
						roleId
					})),
					skipDuplicates: true
				});
			}

			// Registrar en auditoría
			const targetUser = await prisma.user.findUnique({
				where: { id: params.id }
			});
			if (targetUser) {
				await auditLog({
					userId: currentUser.id,
					action: AuditAction.UPDATE,
					entityType: 'USER_ROLES',
					entityId: params.id,
					description: `Actualización de roles del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar roles' });
		}
	},

	updateLocations: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		const formData = await request.formData();
		const locationIds = formData.getAll('locationIds').map((r) => r.toString());

		try {
			// Validar que todos los locationIds existan y estén activos
			if (locationIds.length > 0) {
				const locations = await prisma.location.findMany({
					where: {
						id: { in: locationIds },
						active: true
					}
				});
				if (locations.length !== locationIds.length) {
					return fail(400, { error: 'Algunas sedes no existen o no están activas' });
				}
			}

			// Eliminar permisos actuales
			await prisma.userLocationPermission.deleteMany({
				where: { userId: params.id }
			});

			// Agregar nuevos permisos
			if (locationIds.length > 0) {
				await prisma.userLocationPermission.createMany({
					data: locationIds.map((locationId) => ({
						userId: params.id,
						locationId
					})),
					skipDuplicates: true
				});
			}

			// Registrar en auditoría
			const targetUser = await prisma.user.findUnique({
				where: { id: params.id }
			});
			if (targetUser) {
				await auditLog({
					userId: currentUser.id,
					action: AuditAction.UPDATE,
					entityType: 'USER_LOCATIONS',
					entityId: params.id,
					description: `Actualización de sedes del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar sedes' });
		}
	},

	addSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			// Verificar que el usuario sea docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			await prisma.subjectTeacher.create({
				data: {
					subjectId,
					teacherId: teacher.id
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al agregar materia' });
		}
	},

	removeSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			// Verificar que el usuario sea docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			await prisma.subjectTeacher.deleteMany({
				where: {
					subjectId,
					teacherId: teacher.id
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al remover materia' });
		}
	},

	revokeAllSessions: async ({ params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		// Solo SUPERADMIN y DIRECTOR pueden revocar todas las sesiones
		if (!currentUser.roles.includes('SUPERADMIN') && !currentUser.roles.includes('DIRECTOR')) {
			return fail(403, { error: 'No tienes permisos para revocar sesiones' });
		}

		// Prevenir auto-revocación (un usuario no puede revocar sus propias sesiones)
		if (currentUser.id === params.id) {
			return fail(400, {
				error: 'No puedes revocar tus propias sesiones. Usa la función de logout normal.'
			});
		}

		try {
			// Obtener usuario objetivo
			const targetUser = await prisma.user.findUnique({
				where: { id: params.id }
			});

			if (!targetUser) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			// Eliminar todas las sesiones del usuario
			const deletedCount = await prisma.session.deleteMany({
				where: { userId: params.id }
			});

			// Registrar en auditoría
			await auditLog({
				userId: currentUser.id,
				action: AuditAction.DELETE,
				entityType: 'SESSION',
				entityId: params.id,
				description: `Revocación de todas las sesiones del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}). ${deletedCount.count} sesiones eliminadas.`
			});

			return { success: true, message: `${deletedCount.count} sesiones revocadas exitosamente` };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al revocar sesiones' });
		}
	}
};
