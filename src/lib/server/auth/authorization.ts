import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

export function hasRole(
    user: App.Locals['user'],
    allowed: string[]
): boolean {
    if (!user) return false;

    return user.roles.some((role) => allowed.includes(role));
}

export function requireRole(
    user: App.Locals['user'],
    allowed: string[]
) {
    if (!hasRole(user, allowed)) {
        throw error(403, 'No tienes permisos para realizar esta acción');
    }
}

export function requireOwnership(
    userId: string | undefined,
    resourceOwnerId: string
) {
    if (!userId || userId !== resourceOwnerId) {
        throw error(403, 'No tienes permisos sobre este recurso');
    }
}

export function requireRoleOrOwnership(
    user: App.Locals['user'],
    allowed: string[],
    resourceOwnerId: string
) {
    const byRole = hasRole(user, allowed);
    const byOwner = user?.id === resourceOwnerId;

    if (!byRole && !byOwner) {
        throw error(403, 'No autorizado');
    }
}

/**
 * Obtiene los IDs de localidades permitidos para un usuario
 * Roles con acceso global a todas las localidades: SUPERADMIN, DIRECTOR, SECRETARIA, FINANZAS, APODERADO
 * Otros roles (DOCENTE, PRECEPTOR, ALUMNO) solo ven sus localidades asignadas
 */
export async function getUserAllowedLocationIds(userId: string): Promise<string[]> {
    // Verificar roles del usuario
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    });

    if (!user) return [];

    // Roles con acceso global a todas las localidades
    const globalAccessRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'];
    const hasGlobalAccess = user.roles.some(r => globalAccessRoles.includes(r.role.code));

    if (hasGlobalAccess) {
        // Retornar todas las localidades activas
        const locations = await prisma.location.findMany({
            where: { active: true },
            select: { id: true }
        });
        return locations.map(l => l.id);
    }

    // Retornar localidades específicas asignadas
    const permissions = await prisma.userLocationPermission.findMany({
        where: { userId },
        include: {
            location: {
                select: { id: true, active: true }
            }
        }
    });

    return permissions
        .filter(p => p.location.active)
        .map(p => p.location.id);
}

/**
 * Verifica si un usuario tiene acceso a una localidad específica
 */
export async function hasLocationAccess(userId: string, locationId: string): Promise<boolean> {
    const allowedIds = await getUserAllowedLocationIds(userId);
    return allowedIds.includes(locationId);
}

/**
 * Requiere que el usuario tenga acceso a la localidad especificada
 */
export async function requireLocationAccess(userId: string, locationId: string) {
    const hasAccess = await hasLocationAccess(userId, locationId);
    if (!hasAccess) {
        throw error(403, 'No tienes permisos para acceder a datos de esta localidad');
    }
}