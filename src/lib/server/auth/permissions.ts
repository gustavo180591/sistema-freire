import { error } from '@sveltejs/kit';

export function requireRole(
    user: App.Locals['user'],
    allowed: string[]
) {
    if (!user) {
        throw error(401, 'No autenticado');
    }

    const hasAccess = user.roles.some((role) =>
        allowed.includes(role)
    );

    if (!hasAccess) {
        throw error(403, 'Sin permisos');
    }
}