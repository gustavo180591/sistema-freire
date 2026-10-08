import type { Handle } from '@sveltejs/kit';
import type { RoleCode } from '@prisma/client';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { runWithAuditRequestContext } from '$lib/server/audit-context';
import { getAssignedRoleCodes, resolveActiveRole } from '$lib/server/auth/active-role';

const FULL_ACCESS_ROLES: RoleCode[] = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const routePermissions: Record<string, RoleCode[]> = {
	'/alumno': ['ALUMNO'],
	'/alumno/historial': ['ALUMNO'],
	'/alumnos': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/dashboard': FULL_ACCESS_ROLES,
	'/usuarios': FULL_ACCESS_ROLES,
	'/carreras': FULL_ACCESS_ROLES,
	'/materias': [...FULL_ACCESS_ROLES, 'DOCENTE'],
	'/finanzas': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/recibos': [...FULL_ACCESS_ROLES, 'DOCENTE', 'FINANZAS', 'LIQUIDADOR'],
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
	'/preceptor': ['PRECEPTOR'],
	'/docente': ['DOCENTE']
};

type LoadedUser = {
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

function toSessionUser(user: LoadedUser, activeRole: RoleCode | null): App.SessionUser {
	const assignedRoles = getAssignedRoleCodes(user);

	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,

		/*
		 * Mantener roles como contexto efectivo permite que los controles
		 * existentes user.roles.includes(...) continúen funcionando,
		 * pero únicamente bajo el rol elegido.
		 */
		roles: activeRole ? [activeRole] : [],

		assignedRoles,
		activeRole
	};
}

/**
 * Rutas que deben poder utilizarse aunque un usuario con múltiples
 * roles todavía no haya elegido su contexto de trabajo.
 */
function canAccessWithoutActiveRole(pathname: string): boolean {
	return (
		pathname === '/seleccionar-vista' ||
		pathname.startsWith('/seleccionar-vista/') ||
		pathname === '/api/session/active-role' ||
		pathname === '/logout' ||
		pathname.startsWith('/logout/') ||
		pathname === '/api/impersonation/stop'
	);
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
			activeRole: true,
			impersonatedUserId: true,
			impersonationStartedAt: true,
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

	const authenticatedAssignedRoles = getAssignedRoleCodes(session.user);

	/*
	 * Durante una impersonación, activeRole pertenece al usuario objetivo.
	 * El rol que tenía el propietario real antes de impersonar se conserva
	 * por separado.
	 */
	const authenticatedStoredRole = session.impersonatedUserId
		? session.impersonationPreviousActiveRole
		: session.activeRole;

	const authenticatedActiveRole = resolveActiveRole(
		authenticatedAssignedRoles,
		authenticatedStoredRole
	);

	const authenticatedUser = toSessionUser(session.user, authenticatedActiveRole);

	event.locals.sessionId = session.id;
	event.locals.authenticatedUser = authenticatedUser;

	let effectiveUser = authenticatedUser;

	if (session.impersonatedUserId) {
		/*
		 * La capacidad de mantener una impersonación depende de los roles
		 * reales del propietario de la sesión, no de su activeRole.
		 */
		const originalIsSuperadmin = authenticatedUser.assignedRoles.includes('SUPERADMIN');

		if (!originalIsSuperadmin) {
			await prisma.session.update({
				where: {
					id: session.id
				},
				data: {
					activeRole: authenticatedActiveRole,
					impersonatedUserId: null,
					impersonationStartedAt: null,
					impersonationPreviousActiveRole: null
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
						activeRole: authenticatedActiveRole,
						impersonatedUserId: null,
						impersonationStartedAt: null,
						impersonationPreviousActiveRole: null
					}
				});
			} else {
				const targetAssignedRoles = getAssignedRoleCodes(target);

				const targetActiveRole = resolveActiveRole(targetAssignedRoles, session.activeRole);

				effectiveUser = toSessionUser(target, targetActiveRole);

				/*
				 * Si el usuario impersonado posee un único rol, se selecciona
				 * automáticamente y se persiste en la sesión.
				 */
				if (session.activeRole !== targetActiveRole) {
					await prisma.session.update({
						where: {
							id: session.id
						},
						data: {
							activeRole: targetActiveRole
						}
					});
				}

				event.locals.impersonation = {
					active: true,
					startedAt: session.impersonationStartedAt ?? new Date(),
					originalUser: authenticatedUser
				};
			}
		}
	} else {
		/*
		 * Para usuarios con un solo rol, completamos automáticamente
		 * activeRole incluso en sesiones creadas antes de esta funcionalidad.
		 *
		 * Si el rol almacenado ya no pertenece al usuario, también se limpia.
		 */
		if (session.activeRole !== authenticatedActiveRole) {
			await prisma.session.update({
				where: {
					id: session.id
				},
				data: {
					activeRole: authenticatedActiveRole
				}
			});
		}
	}

	/*
	 * Desde este punto toda la aplicación utiliza al usuario efectivo.
	 *
	 * roles contiene únicamente el activeRole.
	 * assignedRoles conserva todos los roles reales.
	 */
	event.locals.user = effectiveUser;

	const requiresRoleSelection =
		effectiveUser.assignedRoles.length > 1 && effectiveUser.activeRole === null;

	if (requiresRoleSelection && !canAccessWithoutActiveRole(event.url.pathname)) {
		throw redirect(303, '/seleccionar-vista');
	}

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
