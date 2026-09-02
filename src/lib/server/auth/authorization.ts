import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

/**
 * Roles que pueden asignar materias a docentes
 */
export const CAN_ASSIGN_SUBJECTS_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

export function hasRole(user: App.Locals['user'], allowed: string[]): boolean {
	if (!user) return false;

	return user.roles.some((role) => allowed.includes(role));
}

export function requireRole(user: App.Locals['user'], allowed: string[]) {
	if (!hasRole(user, allowed)) {
		throw error(403, 'No tienes permisos para realizar esta acción');
	}
}

/**
 * Requiere que el usuario tenga permisos para asignar materias
 */
export function requireCanAssignSubjects(user: App.Locals['user']) {
	if (!hasRole(user, CAN_ASSIGN_SUBJECTS_ROLES)) {
		throw error(403, 'No tienes permisos para asignar materias');
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

/**
 * Obtiene el estudiante asociado a un usuario
 */
export async function getCurrentStudentFromUser(userId: string) {
	const student = await prisma.student.findUnique({
		where: { userId },
		select: {
			id: true,
			dni: true,
			firstName: true,
			lastName: true,
			careerId: true,
			locationId: true,
			currentYear: true,
			status: true,
			financialBlocked: true
		}
	});

	return student;
}

/**
 * Verifica que el usuario es propietario del recurso estudiante
 * Permite acceso si el usuario tiene rol administrativo o es el propio alumno
 */
export async function assertStudentOwnsResource(
	user: App.Locals['user'],
	studentId: string
): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// Roles con acceso global a datos de estudiantes
	const adminRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'];
	if (hasRole(user, adminRoles)) {
		return;
	}

	// Alumno solo puede acceder a sus propios datos
	if (hasRole(user, ['ALUMNO'])) {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { userId: true }
		});

		if (!student) {
			throw error(404, 'Estudiante no encontrado');
		}

		if (student.userId !== user.id) {
			throw error(403, 'No tienes permisos para acceder a este recurso');
		}

		return;
	}

	throw error(403, 'No autorizado');
}

/**
 * Verifica que el usuario puede acceder a sus propios datos de estudiante
 */
export async function assertCanAccessOwnStudentData(user: App.Locals['user']): Promise<string> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	if (!hasRole(user, ['ALUMNO'])) {
		throw error(403, 'Solo los alumnos pueden acceder a esta función');
	}

	const student = await getCurrentStudentFromUser(user.id);

	if (!student) {
		throw error(404, 'No se encontró el registro de estudiante asociado');
	}

	return student.id;
}

export type LocationAccessOptions = {
	globalAccessRoles?: readonly string[];
};

const DEFAULT_GLOBAL_LOCATION_ACCESS_ROLES: readonly string[] = [
	'SUPERADMIN',
	'DIRECTOR',
	'FINANZAS',
	'APODERADO'
];

/**
 * Obtiene los IDs de localidades permitidos para un usuario.
 *
 * Por defecto algunos roles poseen alcance global institucional.
 * Cada módulo puede limitar qué roles otorgan alcance global mediante options.
 */
export async function getUserAllowedLocationIds(
	userId: string,
	options: LocationAccessOptions = {}
): Promise<string[]> {
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

	const globalAccessRoles = options.globalAccessRoles ?? DEFAULT_GLOBAL_LOCATION_ACCESS_ROLES;

	const hasGlobalAccess = user.roles.some((r) => globalAccessRoles.includes(r.role.code));

	if (hasGlobalAccess) {
		// Retornar todas las localidades activas
		const locations = await prisma.location.findMany({
			where: { active: true },
			select: { id: true }
		});
		return locations.map((l) => l.id);
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

	return permissions.filter((p) => p.location.active).map((p) => p.location.id);
}

/**
 * Verifica si un usuario tiene acceso a una localidad específica
 */
export async function hasLocationAccess(
	userId: string,
	locationId: string,
	options: LocationAccessOptions = {}
): Promise<boolean> {
	const allowedIds = await getUserAllowedLocationIds(userId, options);
	return allowedIds.includes(locationId);
}

/**
 * Requiere que el usuario tenga acceso a la localidad especificada
 */
export async function requireLocationAccess(
	userId: string,
	locationId: string,
	options: LocationAccessOptions = {}
) {
	const hasAccess = await hasLocationAccess(userId, locationId, options);

	if (!hasAccess) {
		throw error(403, 'No tienes permisos para acceder a datos de esta localidad');
	}
}
