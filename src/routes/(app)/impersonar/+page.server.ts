import { Prisma, RoleCode } from '@prisma/client';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRole } from '$lib/server/auth/authorization';
import { startImpersonation } from '$lib/server/auth/impersonation-service';
import { prisma } from '$lib/server/db/prisma';

function isRoleCode(value: string): value is RoleCode {
	return Object.values(RoleCode).includes(value as RoleCode);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const authenticatedUser = locals.authenticatedUser;

	if (!authenticatedUser) {
		throw redirect(303, '/login');
	}

	requireRole(authenticatedUser, ['SUPERADMIN']);

	if (locals.impersonation) {
		throw redirect(303, '/');
	}

	const query = url.searchParams.get('q')?.trim() ?? '';

	const requestedRole = url.searchParams.get('role')?.trim() ?? '';

	const role = requestedRole && isRoleCode(requestedRole) ? requestedRole : '';

	const where: Prisma.UserWhereInput = {
		status: 'ACTIVE',
		id: {
			not: authenticatedUser.id
		}
	};

	if (query) {
		where.OR = [
			{
				firstName: {
					contains: query,
					mode: 'insensitive'
				}
			},
			{
				lastName: {
					contains: query,
					mode: 'insensitive'
				}
			},
			{
				email: {
					contains: query,
					mode: 'insensitive'
				}
			},
			{
				dni: {
					contains: query,
					mode: 'insensitive'
				}
			}
		];
	}

	if (role) {
		where.roles = {
			some: {
				role: {
					code: role
				}
			}
		};
	}

	const users = await prisma.user.findMany({
		where,
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
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
			locationPermissions: {
				where: {
					location: {
						active: true
					}
				},
				select: {
					location: {
						select: {
							id: true,
							name: true
						}
					}
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
		take: 100
	});

	return {
		query,
		selectedRole: role,
		roleOptions: Object.values(RoleCode),
		users: users.map((user) => ({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			roles: user.roles.map(({ role }) => ({
				code: role.code,
				name: role.name
			})),
			locations: user.locationPermissions.map(({ location }) => location)
		}))
	};
};

export const actions: Actions = {
	impersonate: async ({ request, locals, getClientAddress }) => {
		const authenticatedUser = locals.authenticatedUser;

		if (!authenticatedUser || !locals.sessionId) {
			return fail(401, {
				error: 'Sesión inválida'
			});
		}

		requireRole(authenticatedUser, ['SUPERADMIN']);

		if (locals.impersonation) {
			return fail(409, {
				error: 'Ya existe una impersonación activa'
			});
		}

		const data = await request.formData();

		const targetUserId = data.get('targetUserId')?.toString().trim() ?? '';

		if (!targetUserId) {
			return fail(400, {
				error: 'Seleccioná un usuario para impersonar'
			});
		}

		let ip: string | undefined;

		try {
			ip = getClientAddress();
		} catch {
			ip = undefined;
		}

		const result = await startImpersonation({
			sessionId: locals.sessionId,
			actorUserId: authenticatedUser.id,
			targetUserId,
			ip,
			userAgent: request.headers.get('user-agent') ?? undefined
		});

		throw redirect(303, result.redirectTo);
	}
};
