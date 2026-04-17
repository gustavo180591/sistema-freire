import { error } from '@sveltejs/kit';

export function hasRole(user: App.Locals['user'], allowed: string[]): boolean {
	if (!user) return false;

	return user.roles.some((role) => allowed.includes(role));
}

export function requireRole(user: App.Locals['user'], allowed: string[]) {
	if (!hasRole(user, allowed)) {
		throw error(403, 'No tienes permisos para realizar esta acción');
	}
}

export function requireOwnership(userId: string | undefined, resourceOwnerId: string) {
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
