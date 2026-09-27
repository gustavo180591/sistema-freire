import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import {
	createPreceptorAttendanceEvent,
	getPreceptorAttendanceEventPageData,
	PreceptorAttendanceEventError
} from '$lib/server/preceptor/preceptor-attendance-event-service';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, ['PRECEPTOR']);

	await Promise.all([
		requirePermission(currentUser, 'ATTENDANCE', 'read'),
		requirePermission(currentUser, 'STUDENT', 'read'),
		requirePermission(currentUser, 'SUBJECT', 'read'),
		requirePermission(currentUser, 'SUBJECT_ENROLLMENT', 'read'),
		requirePermission(currentUser, 'SUBJECT_COMMISSION', 'read')
	]);

	return getPreceptorAttendanceEventPageData(currentUser.id);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, {
				error: 'No autorizado'
			});
		}

		requireRole(currentUser, ['PRECEPTOR']);

		await Promise.all([
			requirePermission(currentUser, 'ATTENDANCE', 'create'),
			requirePermission(currentUser, 'STUDENT', 'read'),
			requirePermission(currentUser, 'SUBJECT', 'read'),
			requirePermission(currentUser, 'SUBJECT_ENROLLMENT', 'read')
		]);

		const data = await request.formData();

		const subjectEnrollmentId = data.get('subjectEnrollmentId')?.toString().trim() ?? '';

		const type = data.get('type')?.toString().trim() ?? '';
		const eventDate = data.get('date')?.toString().trim() ?? '';
		const eventTime = data.get('time')?.toString().trim() ?? '';
		const notes = data.get('notes')?.toString() ?? '';

		if (!subjectEnrollmentId || !type || !eventDate || !eventTime) {
			return fail(400, {
				error: 'Por favor completá todos los campos requeridos'
			});
		}

		try {
			const result = await createPreceptorAttendanceEvent(currentUser.id, {
				subjectEnrollmentId,
				type,
				eventDate,
				eventTime,
				notes
			});

			return {
				success: 'Evento registrado correctamente',
				warning: result.warning
			};
		} catch (caught) {
			if (caught instanceof PreceptorAttendanceEventError) {
				return fail(caught.status, {
					error: caught.message
				});
			}

			console.error('Error al registrar evento de preceptoría:', caught);

			return fail(500, {
				error: 'No se pudo registrar el evento'
			});
		}
	}
};
