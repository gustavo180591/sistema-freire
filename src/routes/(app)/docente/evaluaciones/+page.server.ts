import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { EvaluationService } from '$lib/server/academic/evaluation-service';
import { EvaluationType } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id }
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las materias asignadas al docente
	const subjectTeachers = await prisma.subjectTeacher.findMany({
		where: { teacherId: teacher.id },
		include: {
			subject: {
				include: {
					careerSubjects: {
						include: {
							career: true
						}
					}
				}
			}
		}
	});

	const subjects = subjectTeachers.map((st) => st.subject);

	// Obtener evaluaciones del docente
	const evaluations = await prisma.evaluation.findMany({
		where: {
			createdByUserId: locals.user.id,
			subjectId: {
				in: subjects.map((s) => s.id)
			}
		},
		include: {
			subject: true,
			commission: true,
			createdByUser: true,
			parentEvaluation: {
				include: {
					subject: true
				}
			}
		},
		orderBy: { evaluationDate: 'desc' },
		take: 50
	});

	// Obtener comisiones del docente para validación
	const commissions = await prisma.subjectCommission.findMany({
		where: {
			teacherId: teacher.id,
			active: true
		},
		include: {
			subject: true,
			academicTerm: true
		}
	});

	return {
		subjects: subjects.map((s) => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map((cs) => cs.career.name)
		})),
		commissions: commissions.map((c) => ({
			id: c.id,
			code: c.code,
			subjectId: c.subjectId,
			subjectName: c.subject.name,
			academicTerm: c.academicTerm?.name || 'Sin período'
		})),
		evaluations: evaluations.map((e) => ({
			id: e.id,
			title: e.title,
			description: e.description,
			type: e.type,
			evaluationDate: e.evaluationDate,
			maxScore: e.maxScore,
			minPassingScore: e.minPassingScore,
			weight: e.weight,
			subject: e.subject.name,
			commission: e.commission?.code || null,
			isClosed: e.isClosed,
			closedAt: e.closedAt,
			createdAt: e.createdAt,
			creatorName: `${e.createdByUser.firstName} ${e.createdByUser.lastName}`,
			parentEvaluationId: e.parentEvaluationId,
			parentEvaluationTitle: e.parentEvaluation?.title || null
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const subjectId = data.get('subjectId')?.toString();
		const commissionId = data.get('commissionId')?.toString() || null;
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const type = data.get('type')?.toString();
		const evaluationDate = data.get('evaluationDate')?.toString();
		const maxScore = data.get('maxScore')?.toString();
		const minPassingScore = data.get('minPassingScore')?.toString();
		const weight = data.get('weight')?.toString();
		const parentEvaluationId = data.get('parentEvaluationId')?.toString() || null;

		if (!subjectId || !title || !type) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		// Bloquear MESA_EXAMEN temporalmente
		if (type === 'MESA_EXAMEN') {
			return { error: 'Las mesas de examen no están habilitadas en esta versión' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			const maxScoreValue = maxScore ? parseFloat(maxScore) : 10;
			const minPassingScoreValue = minPassingScore ? parseFloat(minPassingScore) : 6;
			const weightValue = weight ? parseFloat(weight) : 1;

			const evaluation = await evaluationService.createEvaluation({
				subjectId,
				commissionId: commissionId || undefined,
				title,
				description: description || undefined,
				type: type as EvaluationType,
				evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
				maxScore: maxScoreValue,
				minPassingScore: minPassingScoreValue,
				weight: weightValue,
				parentEvaluationId: parentEvaluationId || undefined,
				userId: locals.user.id
			});

			if ('error' in evaluation) {
				return { error: evaluation.error };
			}

			return { success: 'Evaluación creada exitosamente' };
		} catch (error) {
			console.error('Error al crear evaluación:', error);
			return { error: 'Error al crear la evaluación' };
		}
	},

	closeEvaluation: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const evaluationId = data.get('evaluationId')?.toString();
		const reason = data.get('reason')?.toString();

		if (!evaluationId) {
			return { error: 'ID de evaluación requerido' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			// Validar que el usuario puede cerrar la evaluación
			const validation = await evaluationService.canCloseEvaluation(evaluationId, locals.user.id);
			if (validation) {
				return validation;
			}

			await evaluationService.closeEvaluation({
				evaluationId,
				userId: locals.user.id,
				reason
			});

			return { success: 'Evaluación cerrada exitosamente' };
		} catch (error) {
			console.error('Error al cerrar evaluación:', error);
			return { error: 'Error al cerrar la evaluación' };
		}
	},

	reopenEvaluation: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const evaluationId = data.get('evaluationId')?.toString();
		const reason = data.get('reason')?.toString();

		if (!evaluationId) {
			return { error: 'ID de evaluación requerido' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			// Validar que el usuario puede reabrir la evaluación
			const validation = await evaluationService.canReopenEvaluation(evaluationId, locals.user.id);
			if (validation) {
				return validation;
			}

			await evaluationService.reopenEvaluation({
				evaluationId,
				userId: locals.user.id,
				reason
			});

			return { success: 'Evaluación reabierta exitosamente' };
		} catch (error) {
			console.error('Error al reabrir evaluación:', error);
			return { error: 'Error al reabrir la evaluación' };
		}
	}
};
