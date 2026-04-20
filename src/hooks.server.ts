import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

// Roles con acceso total al sistema institucional
const FULL_ACCESS_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const routePermissions: Record<string, string[]> = {
	'/alumno': [...FULL_ACCESS_ROLES, 'ALUMNO'], // Solo alumnos - MÁS ESPECÍFICA primero
	'/alumnos': [...FULL_ACCESS_ROLES, 'FINANZAS'], // Solo personal institucional
	'/dashboard': FULL_ACCESS_ROLES,
	'/usuarios': FULL_ACCESS_ROLES,
	'/carreras': FULL_ACCESS_ROLES,
	'/comisiones': [...FULL_ACCESS_ROLES, 'DOCENTE'],
	'/materias': [...FULL_ACCESS_ROLES, 'DOCENTE'],
	'/finanzas': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/recibos': [...FULL_ACCESS_ROLES, 'DOCENTE', 'FINANZAS'],
	'/reportes': [...FULL_ACCESS_ROLES, 'FINANZAS'],
	'/auditoria': ['SUPERADMIN', 'DIRECTOR'], // Solo admins pueden ver auditoría
	'/permisos': ['SUPERADMIN'] // Solo SUPERADMIN puede gestionar permisos
};

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('session');

    if (!token) {
        // Permitir acceso a rutas de autenticación sin sesión
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

    // Ordenar rutas por longitud descendente para evitar matching parcial
    // Ej: /alumnos debe evaluarse antes que /alumno
    const sortedRoutes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);
    
    const matchedRoute = sortedRoutes.find((route) =>
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