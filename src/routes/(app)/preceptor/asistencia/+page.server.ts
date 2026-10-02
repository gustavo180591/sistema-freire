import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import {
	createPreceptorAttendance,
	PreceptorAttendanceError
} from '$lib/server/preceptor/preceptor-attendance-service';
import { getPreceptorAttendancePageData } from '$lib/server/preceptor/preceptor-attendance-query-service';

const NO_COMMISSION = '__NO_COMMISSION__';

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

	return getPreceptorAttendancePageData(currentUser.id);
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
			requirePermission(currentUser, 'SUBJECT_ENROLLMENT', 'read'),
			requirePermission(currentUser, 'SUBJECT_COMMISSION', 'read')
		]);

		const data = await request.formData();

		const subjectId = data.get('subjectId')?.toString().trim() ?? '';
		const classDate = data.get('date')?.toString().trim() ?? '';
		const commissionToken = data.get('commissionId')?.toString().trim() ?? '';
		const locationId = data.get('locationId')?.toString().trim() || null;
		const attendanceRaw = data.get('attendanceData')?.toString() ?? '';

		if (!subjectId || !classDate || !commissionToken || !attendanceRaw) {
			return fail(400, {
				error: 'Por favor completá todos los campos requeridos'
			});
		}

		const commissionId = commissionToken === NO_COMMISSION ? null : commissionToken;

		if (!commissionId && !locationId) {
			return fail(400, {
				error: 'Seleccioná la sede correspondiente a la asistencia'
			});
		}

		try {
			const result = await createPreceptorAttendance(currentUser.id, {
				subjectId,
				commissionId,
				locationId,
				classDate,
				attendanceRaw
			});

			return {
				success: 'Asistencia registrada exitosamente',
				warning: result.warning
			};
		} catch (caught) {
			if (caught instanceof PreceptorAttendanceError) {
				return fail(caught.status, {
					error: caught.message
				});
			}

			console.error('Error al registrar asistencia PRECEPTOR:', caught);

			return fail(500, {
				error: 'Error al registrar la asistencia'
			});
		}
	}
};
