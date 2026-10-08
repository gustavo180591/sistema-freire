import type { RoleCode } from '@prisma/client';

export const ROLE_LABELS: Record<RoleCode, string> = {
	SUPERADMIN: 'Superadministrador',
	DIRECTOR: 'Director',
	SECRETARIA: 'Secretaría',
	DOCENTE: 'Docente',
	ALUMNO: 'Alumno',
	FINANZAS: 'Finanzas',
	APODERADO: 'Apoderado',
	PRECEPTOR: 'Preceptor',
	LIQUIDADOR: 'Liquidador',
	SIN_TIPO: 'Sin tipo'
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
	SUPERADMIN: 'Administración técnica completa del sistema.',
	DIRECTOR: 'Gestión institucional, académica y administrativa.',
	SECRETARIA: 'Gestión administrativa, académica y de alumnos.',
	DOCENTE: 'Clases, asistencia, evaluaciones, calificaciones y materiales.',
	ALUMNO: 'Materias, asistencia, calificaciones, exámenes y situación académica.',
	FINANZAS: 'Pagos, cuotas, deuda, recibos y gestión financiera.',
	APODERADO: 'Gestión institucional con alcance operativo autorizado.',
	PRECEPTOR: 'Asistencia, seguimiento, incidencias y acompañamiento de alumnos.',
	LIQUIDADOR: 'Gestión de recibos y liquidaciones de docentes.',
	SIN_TIPO: 'Acceso básico sin una función institucional específica.'
};

export const ROLE_HOME_ROUTES: Record<RoleCode, string> = {
	SUPERADMIN: '/dashboard',
	DIRECTOR: '/dashboard',
	SECRETARIA: '/dashboard',
	DOCENTE: '/docente',
	ALUMNO: '/alumno',
	FINANZAS: '/finanzas',
	APODERADO: '/dashboard',
	PRECEPTOR: '/preceptor',
	LIQUIDADOR: '/recibos',
	SIN_TIPO: '/'
};

export function getAssignedRoleCodes(user: {
	roles: Array<{
		role: {
			code: RoleCode;
		};
	}>;
}): RoleCode[] {
	return user.roles.map(({ role }) => role.code);
}

export function resolveActiveRole(
	assignedRoles: readonly RoleCode[],
	storedActiveRole: RoleCode | null | undefined
): RoleCode | null {
	if (storedActiveRole && assignedRoles.includes(storedActiveRole)) {
		return storedActiveRole;
	}

	if (assignedRoles.length === 1) {
		return assignedRoles[0] ?? null;
	}

	return null;
}

export function canUseRole(assignedRoles: readonly RoleCode[], role: RoleCode): boolean {
	return assignedRoles.includes(role);
}

export function getRoleHomeRoute(role: RoleCode | null | undefined): string {
	if (!role) {
		return '/';
	}

	return ROLE_HOME_ROUTES[role];
}

/**
 * Define el destino inicial de una sesión autenticada.
 *
 * - un único rol: ingresa directamente a su interfaz;
 * - múltiples roles sin selección: debe elegir contexto;
 * - sin roles: permanece en la raíz segura.
 */
export function getSessionEntryRoute(
	assignedRoles: readonly RoleCode[],
	activeRole: RoleCode | null
): string {
	if (activeRole) {
		return getRoleHomeRoute(activeRole);
	}

	if (assignedRoles.length > 1) {
		return '/seleccionar-vista';
	}

	return '/';
}
