import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { hasRole } from '$lib/server/auth/authorization';

/**
 * Punto de entrada central al Módulo de Asistencia
 * Redirige al usuario según su rol (enrutador por rol)
 *
 * PRIORIDAD DE ROLES (cuando un usuario tiene múltiples roles):
 * 1. DOCENTE -> /docente/asistencia (carga y gestión de asistencia)
 * 2. PRECEPTOR -> /preceptor/asistencia (carga y gestión de asistencia)
 * 3. ALUMNO -> /alumno/asistencia (visualización de asistencia personal)
 *
 * NOTA: Para acceso administrativo, usar /asistencia/administracion
 * - Requiere permiso ATTENDANCE (read) explícito
 * - Permite acceso a roles administrativos con permiso
 * - Evita bucles de redirección para usuarios con múltiples roles
 */
export const load: PageServerLoad = async ({ locals }) => {
	// Verificar autenticación
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Prioridad 1: DOCENTE
	if (hasRole(locals.user, ['DOCENTE'])) {
		throw redirect(303, '/docente/asistencia');
	}

	// Prioridad 2: PRECEPTOR
	if (hasRole(locals.user, ['PRECEPTOR'])) {
		throw redirect(303, '/preceptor/asistencia');
	}

	// Prioridad 3: ALUMNO
	if (hasRole(locals.user, ['ALUMNO'])) {
		throw redirect(303, '/alumno/asistencia');
	}

	// Si el usuario no tiene roles operativos, redirigir a panel administrativo
	// o a dashboard si no tiene permiso de asistencia
	throw redirect(303, '/asistencia/administracion');
};
