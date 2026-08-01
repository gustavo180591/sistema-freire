import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { TeacherStatus } from '@prisma/client';

export const load: PageServerLoad = async () => {
	const teacherUsers = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					role: {
						code: 'DOCENTE'
					}
				}
			}
		},
		include: {
			roles: {
				include: {
					role: true
				}
			},
			locationPermissions: {
				include: {
					location: true
				}
			},
			teacher: {
				include: {
					subjects: {
						include: {
							subject: true
						}
					}
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	return {
		teachers: teacherUsers.map((user) => {
			const locations = new Set<string>();

			user.locationPermissions.forEach((locationPermission) => {
				locations.add(locationPermission.location.name);
			});

			const teacherProfile = user.teacher;

			return {
				id: teacherProfile?.id ?? user.id,
				teacherId: teacherProfile?.id ?? null,
				userId: user.id,
				dni: user.dni ?? teacherProfile?.dni ?? '',
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				userStatus: String(user.status),
				hasTeacherProfile: Boolean(teacherProfile),
				createdAt: user.createdAt.toISOString(),
				roles: user.roles
					.map((userRole) => String(userRole.role.code))
					.sort((a, b) => a.localeCompare(b)),
				locations: Array.from(locations),
				subjects:
					teacherProfile?.subjects.map((subjectTeacher) => ({
						id: subjectTeacher.subject.id,
						code: subjectTeacher.subject.code,
						name: subjectTeacher.subject.name,
						yearLevel: subjectTeacher.subject.yearLevel,
						active: subjectTeacher.subject.active,
						approvalThreshold: subjectTeacher.subject.approvalThreshold
							? Number(subjectTeacher.subject.approvalThreshold)
							: null,
						promotionThreshold: subjectTeacher.subject.promotionThreshold
							? Number(subjectTeacher.subject.promotionThreshold)
							: null
					})) ?? []
			};
		})
	};
};

export const actions: Actions = {
	regularizeTeacher: async ({ request, locals }) => {
		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!locals.user) {
			return fail(401, { error: 'No autenticado' });
		}

		if (!userId) {
			return fail(400, { error: 'Usuario requerido' });
		}

		try {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					roles: {
						include: {
							role: true
						}
					},
					teacher: true
				}
			});

			if (!user) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			const hasTeacherRole = user.roles.some((userRole) => userRole.role.code === 'DOCENTE');

			if (!hasTeacherRole) {
				return fail(400, { error: 'El usuario no tiene rol docente' });
			}

			if (user.teacher) {
				throw redirect(303, `/docentes/${user.teacher.id}`);
			}

			const dni = user.dni?.trim();

			if (!dni) {
				return fail(400, {
					error: 'El usuario docente debe tener DNI cargado antes de asignar materias'
				});
			}

			const existingTeacherWithDni = await prisma.teacher.findFirst({
				where: {
					dni
				},
				select: {
					id: true,
					userId: true
				}
			});

			if (existingTeacherWithDni) {
				if (existingTeacherWithDni.userId === user.id) {
					throw redirect(303, `/docentes/${existingTeacherWithDni.id}`);
				}

				return fail(400, {
					error: 'Ya existe otro perfil docente con el mismo DNI'
				});
			}

			const teacher = await prisma.teacher.create({
				data: {
					userId: user.id,
					dni,
					firstName: user.firstName,
					lastName: user.lastName,
					status: TeacherStatus.ACTIVE,
					observations: 'Perfil docente creado automáticamente desde el listado de docentes'
				}
			});

			const { auditLog } = await import('$lib/server/audit');
			const { AuditAction } = await import('@prisma/client');

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'TEACHER',
				entityId: teacher.id,
				description: `Creación automática de perfil docente: ${teacher.lastName}, ${teacher.firstName} (DNI: ${teacher.dni})`
			});

			throw redirect(303, `/docentes/${teacher.id}`);
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
				throw e;
			}

			console.error(e);
			return fail(500, { error: 'Error al crear el perfil docente' });
		}
	},

	deleteTeacher: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: { id },
				include: { user: true }
			});

			if (!teacher) {
				return fail(404, { error: 'El perfil docente no existe' });
			}

			await prisma.teacher.delete({
				where: { id }
			});

			if (locals.user) {
				const { auditLog } = await import('$lib/server/audit');
				const { AuditAction } = await import('@prisma/client');

				await auditLog({
					userId: locals.user.id,
					action: AuditAction.DELETE,
					entityType: 'TEACHER',
					entityId: id,
					description: `Eliminación de perfil docente: ${teacher.lastName}, ${teacher.firstName} (DNI: ${teacher.dni})`
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al eliminar perfil docente' });
		}
	}
};
