import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';
import {
	cancelExamRegistration,
	getAvailableExamTablesForStudent,
	registerStudentForExam
} from '$lib/server/academic/exam-registration-service';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	if (!user.roles.includes('ALUMNO')) {
		throw redirect(303, '/dashboard');
	}

	await requirePermission(user, 'EVALUATION', 'read');

	const student = await getCurrentStudentForUser(user.id);

	const studentWithRelations = await prisma.student.findUnique({
		where: {
			id: student.id
		},
		include: {
			career: true,
			location: true
		}
	});

	if (!studentWithRelations) {
		throw error(404, 'No se encontraron datos del alumno');
	}

	const examTables = await getAvailableExamTablesForStudent(student.id);

	return {
		student: {
			id: studentWithRelations.id,
			fullName: `${studentWithRelations.firstName} ${studentWithRelations.lastName}`,
			status: studentWithRelations.status,
			career: studentWithRelations.career.name,
			location: studentWithRelations.location?.name ?? null
		},
		examTables
	};
};

export const actions: Actions = {
	registerExam: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		if (!user.roles.includes('ALUMNO')) {
			return fail(403, {
				error: 'Solo los alumnos pueden inscribirse a mesas de examen'
			});
		}

		await requirePermission(user, 'EVALUATION', 'read');

		const data = await request.formData();
		const evaluationId = data.get('evaluationId')?.toString();

		if (!evaluationId) {
			return fail(400, { error: 'Mesa de examen requerida' });
		}

		const student = await getCurrentStudentForUser(user.id);

		try {
			await registerStudentForExam(
				evaluationId,
				student.id,
				user.id,
				`${student.firstName} ${student.lastName}`
			);

			return {
				success: true,
				message: 'Te inscribiste correctamente a la mesa de examen'
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'No se pudo realizar la inscripción';

			return fail(400, { error: message });
		}
	},

	cancelExam: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		if (!user.roles.includes('ALUMNO')) {
			return fail(403, {
				error: 'Solo los alumnos pueden cancelar su inscripción'
			});
		}

		await requirePermission(user, 'EVALUATION', 'read');

		const data = await request.formData();
		const registrationId = data.get('registrationId')?.toString();

		if (!registrationId) {
			return fail(400, { error: 'Inscripción requerida' });
		}

		const student = await getCurrentStudentForUser(user.id);

		try {
			await cancelExamRegistration(
				registrationId,
				student.id,
				user.id,
				`${student.firstName} ${student.lastName}`
			);

			return {
				success: true,
				message: 'Inscripción a mesa cancelada correctamente'
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'No se pudo cancelar la inscripción';

			return fail(400, { error: message });
		}
	}
};
