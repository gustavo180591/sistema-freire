import { page } from '$app/stores';
import { derived, get } from 'svelte/store';

// Función para verificar si el usuario tiene un rol específico
export function hasRole(role: string | string[]): boolean {
	const pageData = get(page);
	const roles = pageData.data?.user?.roles || [];
	if (typeof role === 'string') {
		return roles.includes(role);
	}
	return role.some(r => roles.includes(r));
}

// Función para verificar si el usuario tiene alguno de los roles permitidos
export function hasAnyRole(roles: string[]): boolean {
	const pageData = get(page);
	const userRoles = pageData.data?.user?.roles || [];
	return roles.some(r => userRoles.includes(r));
}

// Función para verificar si el usuario tiene todos los roles requeridos
export function hasAllRoles(roles: string[]): boolean {
	const pageData = get(page);
	const userRoles = pageData.data?.user?.roles || [];
	return roles.every(r => userRoles.includes(r));
}

// Store derivado para acceso fácil a roles del usuario
export const userRoles = derived(page, ($page) => $page.data?.user?.roles || []);
export const currentUser = derived(page, ($page) => $page.data?.user || null);

// Función para verificar si el usuario es SUPERADMIN
export function isSuperAdmin(): boolean {
	return hasRole('SUPERADMIN');
}

// Función para verificar si el usuario es administrativo (SUPERADMIN, DIRECTOR, SECRETARIA)
export function isAdmin(): boolean {
	return hasAnyRole(['SUPERADMIN', 'DIRECTOR', 'SECRETARIA']);
}

// Función para verificar si el usuario puede gestionar usuarios
export function canManageUsers(): boolean {
	return hasAnyRole(['SUPERADMIN', 'DIRECTOR']);
}

// Función para verificar si el usuario puede ver auditoría
export function canViewAudit(): boolean {
	return hasAnyRole(['SUPERADMIN', 'DIRECTOR']);
}

// Función para verificar si el usuario puede gestionar permisos
export function canManagePermissions(): boolean {
	return hasRole('SUPERADMIN');
}

// Función para verificar si el usuario puede gestionar finanzas
export function canManageFinances(): boolean {
	return hasAnyRole(['SUPERADMIN', 'DIRECTOR', 'FINANZAS']);
}

// Función para verificar si el usuario es docente
export function isTeacher(): boolean {
	return hasRole('DOCENTE');
}

// Función para verificar si el usuario es alumno
export function isStudent(): boolean {
	return hasRole('ALUMNO');
}

// Función para verificar si el usuario es preceptor
export function isPreceptor(): boolean {
	return hasRole('PRECEPTOR');
}

// Función para verificar si el usuario es secretaría
export function isSecretary(): boolean {
	return hasRole('SECRETARIA');
}

// Función para verificar si el usuario puede editar el usuario objetivo
// SECRETARIA no puede editar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO, FINANZAS
export function canEditUser(targetRoles: string[]): boolean {
	if (isSuperAdmin()) return true;
	if (isSecretary()) {
		const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO', 'FINANZAS'];
		return !targetRoles.some(r => restrictedRoles.includes(r));
	}
	return isAdmin();
}

// Función para verificar si el usuario puede eliminar el usuario objetivo
export function canDeleteUser(targetRoles: string[]): boolean {
	if (isSuperAdmin()) return true;
	if (isSecretary()) {
		const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO'];
		return !targetRoles.some(r => restrictedRoles.includes(r));
	}
	return isAdmin();
}
