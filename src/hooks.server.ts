import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

const routePermissions: Record<string, string[]> = {
	'/dashboard': ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'],
	'/usuarios': ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'],
	'/carreras': ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'],
	'/comisiones': ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'DOCENTE'],
	'/materias': ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'DOCENTE'],
	'/finanzas': ['SUPERADMIN', 'FINANZAS', 'DIRECTOR'],
	'/recibos': ['SUPERADMIN', 'DOCENTE', 'FINANZAS', 'DIRECTOR'],
	'/reportes': ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS']
};

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');

	if (!token) {
		if (event.url.pathname.startsWith('/login')) {
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
		include: {
			user: {
				include: {
					roles: {
						include: {
							role: true
						}
					}
				}
			}
		}
	});

	if (!session) {
		event.cookies.delete('session', { path: '/' });
		throw redirect(303, '/login');
	}

	const roles = session.user.roles.map((r) => r.role.code);

	event.locals.user = {
		id: session.user.id,
		email: session.user.email,
		firstName: session.user.firstName,
		lastName: session.user.lastName,
		roles
	};

	const matchedRoute = Object.keys(routePermissions).find((route) =>
		event.url.pathname.startsWith(route)
	);

	if (matchedRoute) {
		const allowedRoles = routePermissions[matchedRoute];
		const hasAccess = roles.some((role) => allowedRoles.includes(role));

		if (!hasAccess) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};
