import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuditAction } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const PRECEPTOR_MANAGEMENT_ROLES: string[] = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'];

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	requireRole(user, [...PRECEPTOR_MANAGEMENT_ROLES]);
	await requirePermission(user, 'USER', 'read');

	const preceptors = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					role: {
						code: 'PRECEPTOR'
					}
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	return {
		preceptors: preceptors.map((preceptor) => ({
			id: preceptor.id,
			dni: preceptor.dni ?? '',
			firstName: preceptor.firstName,
			lastName: preceptor.lastName,
			email: preceptor.email,
			status: preceptor.status,
			createdAt: preceptor.createdAt
		}))
	};
};

export const actions: Actions = {
	deletePreceptor: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		requireRole(user, [...PRECEPTOR_MANAGEMENT_ROLES]);
		await requirePermission(user, 'USER', 'update');

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Preceptor requerido' });
		}

		const target = await prisma.user.findUnique({
			where: {
				id
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
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
			return fail(404, { error: 'Usuario no encontrado' });
		}

		if (!target.roles.some(({ role }) => role.code === 'PRECEPTOR')) {
			return fail(400, { error: 'El usuario ya no posee el rol PRECEPTOR' });
		}

		const deleted = await prisma.userRole.deleteMany({
			where: {
				userId: id,
				role: {
					code: 'PRECEPTOR'
				}
			}
		});

		if (deleted.count !== 1) {
			return fail(409, {
				error: 'No se pudo actualizar el rol del preceptor'
			});
		}

		await auditLog({
			userId: user.id,
			action: AuditAction.UPDATE,
			entityType: 'USER_ROLE',
			entityId: id,
			description: `Se removió el rol PRECEPTOR de ${target.firstName} ${target.lastName}`
		});

		return {
			success: true,
			message: 'Rol de preceptor eliminado correctamente'
		};
	}
};
