import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';
import {
	getExamRegistrationEligibility,
	registerStudentForExam
} from '$lib/server/academic/exam-registration-service';
import { auditLog } from '$lib/server/audit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	if (!user.roles.includes('ALUMNO')) {
		throw redirect(303, '/dashboard');
	}

	const student = await getCurrentStudentForUser(user.id);

	const eligibility = await getExamRegistrationEligibility({
		studentId: student.id,
		evaluationId: params.id
	});

	if (!eligibility.evaluation) {
		throw error(404, 'Mesa de examen no encontrada');
	}

	return {
		evaluation: {
			id: eligibility.evaluation.id,
			title: eligibility.evaluation.title,
			subject: eligibility.evaluation.subject.name,
			career: eligibility.evaluation.career?.name ?? 'Sin carrera',
			location: eligibility.evaluation.location?.name ?? 'Sin sede',
			evaluationDate: eligibility.evaluation.evaluationDate,
			registrationOpensAt:
				eligibility.evaluation.registrationOpensAt ?? eligibility.evaluation.createdAt,
			registrationClosesAt:
				eligibility.evaluation.registrationClosesAt ??
				new Date(eligibility.evaluation.createdAt.getTime() + 72 * 60 * 60 * 1000)
		},
		canRegister: eligibility.canRegister,
		reason: eligibility.reason,
		registration: eligibility.existingRegistration
			? {
					id: eligibility.existingRegistration.id,
					status: eligibility.existingRegistration.status,
					registeredAt: eligibility.existingRegistration.registeredAt
				}
			: null
	};
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		if (!user.roles.includes('ALUMNO')) {
			return fail(403, { error: 'Solo alumnos pueden inscribirse a mesas de examen' });
		}

		const student = await getCurrentStudentForUser(user.id);

		const result = await registerStudentForExam({
			studentId: student.id,
			evaluationId: params.id,
			userId: user.id,
			userName: `${user.firstName} ${user.lastName}`
		});

		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		await auditLog({
			userId: user.id,
			action: 'CREATE',
			entityType: 'ExamRegistration',
			entityId: result.registration.id,
			description: `Alumno ${student.lastName} ${student.firstName} se inscribió a la mesa "${result.evaluation.title}"`
		});

		return {
			success: true,
			message: 'Inscripción a mesa de examen realizada correctamente'
		};
	}
};
