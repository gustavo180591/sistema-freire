import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }: { params: { id: string }; locals: any }) => {
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
			teacher: true
		}
	});

	if (!user) {
		throw fail(404, { error: 'Usuario no encontrado' });
	}

	// Verificar permisos: SECRETARIA no puede eliminar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO
	const isSecretary = currentUser.roles.includes('SECRETARIA');
	const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO'];

	if (isSecretary) {
		const hasRestrictedRole = user.roles.some(ur => restrictedRoles.includes(ur.role.code));
		if (hasRestrictedRole) {
			throw fail(403, { error: 'No tienes permiso para eliminar usuarios con roles administrativos' });
		}
	}

	return { user };
};

export const actions: Actions = {
	default: async ({ params, locals }: { params: { id: string }; locals: any }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		try {
			const user = await prisma.user.findUnique({
				where: { id: params.id },
				include: {
					roles: {
						include: {
							role: true
						}
					},
					student: true,
					teacher: true
				}
			});

			if (!user) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			// Verificar permisos: SECRETARIA no puede eliminar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO
			const isSecretary = currentUser.roles.includes('SECRETARIA');
			const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO'];

			if (isSecretary) {
				const hasRestrictedRole = user.roles.some(ur => restrictedRoles.includes(ur.role.code));
				if (hasRestrictedRole) {
					return fail(403, { error: 'No tienes permiso para eliminar usuarios con roles administrativos' });
				}
			}

			// No permitir eliminar al último SUPERADMIN
			const superadminCount = await prisma.user.count({
				where: {
					roles: {
						some: {
							role: {
								code: 'SUPERADMIN'
							}
						}
					}
				}
			});

			const isSuperadmin = user.roles.some((ur) => ur.role.code === 'SUPERADMIN');
			if (isSuperadmin && superadminCount <= 1) {
				return fail(400, { error: 'No se puede eliminar el último SUPERADMIN' });
			}

			// Eliminar en transacción para mantener integridad
			await prisma.$transaction(async (tx) => {
				// Eliminar roles del usuario
				await tx.userRole.deleteMany({
					where: { userId: params.id }
				});

				// Eliminar permisos de localidad
				await tx.userLocationPermission.deleteMany({
					where: { userId: params.id }
				});

				// Eliminar registro de estudiante si existe
				if (user.student) {
					await tx.student.delete({
						where: { id: user.student.id }
					});
				}

				// Eliminar registro de docente si existe
				if (user.teacher) {
					await tx.teacher.delete({
						where: { id: user.teacher.id }
					});
				}

				// Eliminar el usuario
				await tx.user.delete({
					where: { id: params.id }
				});
			});

			// Registrar en auditoría
			await auditLog({
				userId: params.id,
				action: AuditAction.DELETE,
				entityType: 'USER',
				entityId: params.id,
				description: `Eliminación de usuario: ${user.firstName} ${user.lastName} (${user.email})`
			});

			throw redirect(302, '/usuarios');
		} catch (error) {
			if (error instanceof Error && error.message.includes('redirect')) {
				throw error;
			}
			console.error('Error al eliminar usuario:', error);
			return fail(500, { error: 'Error al eliminar el usuario' });
		}
	}
};
