import {
	hasPermission,
	checkPermission,
	requirePermission,
	type Entity,
	type PermissionType
} from '$lib/server/auth/permissions-granular';

/**
 * Compatibilidad con el módulo de reportes.
 *
 * La fuente de verdad es permissions-granular.ts:
 * - SUPERADMIN conserva bypass.
 * - permiso explícito true = permitido.
 * - permiso explícito false = denegado.
 * - permiso inexistente = denegado.
 */

export async function hasExplicitPermission(
	roleCode: string,
	entity: Entity,
	permission: PermissionType
): Promise<boolean> {
	return hasPermission(roleCode, entity, permission);
}

export async function checkExplicitPermission(
	user: App.Locals['user'],
	entity: Entity,
	permission: PermissionType
): Promise<boolean> {
	return checkPermission(user, entity, permission);
}

export async function requireExplicitPermission(
	user: App.Locals['user'],
	entity: Entity,
	permission: PermissionType
): Promise<void> {
	await requirePermission(user, entity, permission);
}

export function isSuperAdmin(user: App.Locals['user'] | { roles: string[] } | null): boolean {
	if (!user) return false;
	return user.roles.includes('SUPERADMIN');
}
