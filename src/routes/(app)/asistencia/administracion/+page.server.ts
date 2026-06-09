import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkPermission } from '$lib/server/auth/permissions-granular';

/**
 * Panel administrativo del Módulo de Asistencia
 * Solo accesible para usuarios con permiso ATTENDANCE (read) explícito
 */
export const load: PageServerLoad = async ({ locals }) => {
	// Verificar autenticación
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Verificar permiso ATTENDANCE (read)
	const hasAttendanceRead = await checkPermission(locals.user, 'ATTENDANCE', 'read');

	if (!hasAttendanceRead) {
		throw error(403, 'No tienes permisos para acceder al panel administrativo de asistencia');
	}

	// Retornar permisos granulares para la vista
	return {
		user: locals.user,
		roles: locals.user.roles,
		permissions: {
			canViewCommissions: await checkPermission(locals.user, 'SUBJECT_COMMISSION', 'read'),
			canViewReports: await checkPermission(locals.user, 'STUDENT', 'read'),
			canViewStudents: await checkPermission(locals.user, 'STUDENT', 'read'),
			canViewSubjects: await checkPermission(locals.user, 'SUBJECT', 'read'),
			canViewTeachers: await checkPermission(locals.user, 'TEACHER', 'read'),
			canViewPreceptors: await checkPermission(locals.user, 'TEACHER', 'read')
		}
	};
};
