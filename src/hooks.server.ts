import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { runWithAuditRequestContext } from '$lib/server/audit-context';

const FULL_ACCESS_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const routePermissions: Record<string, string[]> = {
	'/alumno': [...FULL_ACCESS_ROLES, 'ALUMNO'],
	'/alumno/historial': [...FULL_ACCESS_ROLES, 'ALUMNO'],
	'/alumnos': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/dashboard': FULL_ACCESS_ROLES,
	'/usuarios': FULL_ACCESS_ROLES,
	'/carreras': FULL_ACCESS_ROLES,
	'/materias': [...FULL_ACCESS_ROLES, 'DOCENTE'],
	'/finanzas': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/recibos': [...FULL_ACCESS_ROLES, 'DOCENTE', 'FINANZAS'],
	'/reportes': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/auditoria': ['SUPERADMIN', 'DIRECTOR'],
	'/permisos': ['SUPERADMIN'],
	'/impersonar': ['SUPERADMIN'],
	'/configuracion': FULL_ACCESS_ROLES,
	'/docentes': FULL_ACCESS_ROLES,
	'/preceptores': FULL_ACCESS_ROLES,
	'/secretarios': FULL_ACCESS_ROLES,
	'/directores': FULL_ACCESS_ROLES,
	'/comisiones': FULL_ACCESS_ROLES,
	'/correlatividades': FULL_ACCESS_ROLES,
	'/asistencia': FULL_ACCESS_ROLES,
	'/inscripciones': FULL_ACCESS_ROLES,
	'/preceptor': [...FULL_ACCESS_ROLES, 'PRECEPTOR'],
	'/docente': [...FULL_ACCESS_ROLES, 'DOCENTE']
};

type LoadedUser = {
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

function toSessionUser(user: LoadedUser): App.SessionUser {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: user.roles.map(({ role }) => role.code)
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');

	if (!token) {
		if (event.url.pathname.startsWith('/login') || event.url.pathname.startsWith('/verify-2fa')) {
			return resolve(event);
		}

		throw redirect(303, '/login');
	}

	const session = await prisma.session.findFirst({
		where: {
			tokenHash: token,
			expiresAt: {
				gt: new Date()
			}
		},
		select: {
			id: true,
			userId: true,
			impersonatedUserId: true,
			impersonationStartedAt: true,
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

	if (!session) {
		event.cookies.delete('session', {
			path: '/'
		});

		throw redirect(303, '/login');
	}

	if (session.user.status !== 'ACTIVE') {
		await prisma.session.deleteMany({
			where: {
				id: session.id
			}
		});

		event.cookies.delete('session', {
			path: '/'
		});

		throw redirect(303, '/login');
	}

	const authenticatedUser = toSessionUser(session.user);

	event.locals.sessionId = session.id;
	event.locals.authenticatedUser = authenticatedUser;

	let effectiveUser = authenticatedUser;

	if (session.impersonatedUserId) {
		const originalIsSuperadmin = authenticatedUser.roles.includes('SUPERADMIN');

		if (!originalIsSuperadmin) {
			await prisma.session.update({
				where: {
					id: session.id
				},
				data: {
					impersonatedUserId: null,
					impersonationStartedAt: null
				}
			});
		} else {
			const target = await prisma.user.findUnique({
				where: {
					id: session.impersonatedUserId
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

			if (!target || target.status !== 'ACTIVE') {
				await prisma.session.update({
					where: {
						id: session.id
					},
					data: {
						impersonatedUserId: null,
						impersonationStartedAt: null
					}
				});
			} else {
				effectiveUser = toSessionUser(target);

				event.locals.impersonation = {
					active: true,
					startedAt: session.impersonationStartedAt ?? new Date(),
					originalUser: authenticatedUser
				};
			}
		}
	}

	/*
	 * Desde este punto toda la aplicación utiliza
	 * al usuario efectivo.
	 *
	 * Durante una impersonación, roles, permisos,
	 * ownership y scopes pertenecen al usuario objetivo.
	 */
	event.locals.user = effectiveUser;

	const sortedRoutes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);

	const matchedRoute = sortedRoutes.find((route) => event.url.pathname.startsWith(route));

	if (matchedRoute) {
		const allowedRoles = routePermissions[matchedRoute];

		const hasAccess = effectiveUser.roles.some((role) => allowedRoles.includes(role));

		if (!hasAccess) {
			throw redirect(303, '/');
		}
	}

	return runWithAuditRequestContext(
		{
			sessionId: session.id,
			authenticatedUserId: authenticatedUser.id,
			effectiveUserId: effectiveUser.id,
			impersonation: event.locals.impersonation
				? {
						originalUserId: authenticatedUser.id,
						effectiveUserId: effectiveUser.id,
						startedAt: event.locals.impersonation.startedAt.toISOString()
					}
				: undefined
		},
		() => resolve(event)
	);
};
