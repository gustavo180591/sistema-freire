import { prisma } from '$lib/server/db/prisma';
import type { Entity } from '$lib/server/auth/permissions-granular';
import type { PermissionType } from '$lib/server/auth/permissions-granular';

/**
 * Strict permission check for reports
 * Unlike the global hasPermission(), this does NOT default to allowing read
 * when no permission record exists. This prevents unauthorized access to sensitive reports.
 */

/**
 * Check if a role has explicit permission for an entity
 * Returns false if no permission record exists (no default read permission)
 */
export async function hasExplicitPermission(
	roleCode: string,
	entity: Entity,
	permission: PermissionType
): Promise<boolean> {
	// SUPERADMIN always has all permissions
	if (roleCode === 'SUPERADMIN') return true;

	const permissionRecord = await prisma.permission.findUnique({
		where: {
			roleCode_entity: {
				roleCode: roleCode as
					| 'SUPERADMIN'
					| 'DIRECTOR'
					| 'SECRETARIA'
					| 'FINANZAS'
					| 'LIQUIDADOR'
					| 'DOCENTE'
					| 'PRECEPTOR'
					| 'ALUMNO',
				entity
			}
		}
	});

	// If no permission record exists, deny access (no default read)
	if (!permissionRecord) return false;

	switch (permission) {
		case 'create':
			return permissionRecord.canCreate;
		case 'read':
			return permissionRecord.canRead;
		case 'update':
			return permissionRecord.canUpdate;
		case 'delete':
			return permissionRecord.canDelete;
		default:
			return false;
	}
}

/**
 * Check if user has explicit permission for an entity
 * Returns false if no permission record exists for any of the user's roles
 */
export async function checkExplicitPermission(
	user: App.Locals['user'],
	entity: Entity,
	permission: PermissionType
): Promise<boolean> {
	if (!user) return false;

	// Check each role of the user
	for (const role of user.roles) {
		if (await hasExplicitPermission(role, entity, permission)) {
			return true;
		}
	}

	return false;
}

/**
 * Require explicit permission (throws error if not granted)
 */
export async function requireExplicitPermission(
	user: App.Locals['user'],
	entity: Entity,
	permission: PermissionType
): Promise<void> {
	const hasAccess = await checkExplicitPermission(user, entity, permission);
	if (!hasAccess) {
		throw new Error(`Permission denied: ${permission} on ${entity}`);
	}
}

/**
 * Check if user is SUPERADMIN
 */
export function isSuperAdmin(user: App.Locals['user'] | { roles: string[] }): boolean {
	if (!user) return false;
	return user.roles.includes('SUPERADMIN');
}
