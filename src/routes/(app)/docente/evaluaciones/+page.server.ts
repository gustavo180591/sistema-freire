import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds, requireRole } from '$lib/server/auth/authorization';
import { EvaluationService } from '$lib/server/academic/evaluation-service';
import { EvaluationType, GradingMode } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

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
						where: {
							career: {
								locations: { some: { locationId: { in: allowedLocationIds } } }
							}
						},
						include: {
							career: true
						}
					}
				}
			}
		}
	});

	const subjects = subjectTeachers.map((st) => st.subject);
	const commissions = await prisma.subjectCommission.findMany({
		where: {
			teacherId: teacher.id,
			active: true,
			locationId: { in: allowedLocationIds }
		},
		include: {
			subject: true,
			academicTerm: true,
			career: true,
			location: true
		}
	});
	const commissionIds = commissions.map((commission) => commission.id);

	// Obtener evaluaciones del docente
	const evaluations = await prisma.evaluation.findMany({
		where: {
			OR: [
				{ commissionId: { in: commissionIds } },
				{
					commissionId: null,
					createdByUserId: locals.user.id,
					subjectId: { in: subjects.map((subject) => subject.id) }
				}
			]
		},
		include: {
			subject: true,
			commission: true,
			createdByUser: true,
			_count: { select: { grades: true } },
			parentEvaluation: {
				include: {
					subject: true
				}
			},
			recoveryEvaluations: { select: { id: true } }
		},
		orderBy: { evaluationDate: 'desc' },
		take: 50
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
			academicTerm: c.academicTerm?.name || 'Sin período',
			career: c.career?.name || 'Sin carrera',
			location: c.location?.name || 'Sin sede'
		})),
		evaluations: evaluations.map((e) => ({
			id: e.id,
			title: e.title,
			description: e.description,
			type: e.type,
			evaluationDate: e.evaluationDate,
			maxScore: Number(e.maxScore),
			minPassingScore: Number(e.minPassingScore),
			gradingMode: e.gradingMode,
			participatesInAverage: e.participatesInAverage,
			mandatory: e.mandatory,
			subject: e.subject.name,
			subjectId: e.subjectId,
			commissionId: e.commissionId,
			commission: e.commission?.code || null,
			isClosed: e.isClosed,
			closedAt: e.closedAt,
			createdAt: e.createdAt,
			creatorName: `${e.createdByUser.firstName} ${e.createdByUser.lastName}`,
			parentEvaluationId: e.parentEvaluationId,
			parentEvaluationTitle: e.parentEvaluation?.title || null,
			hasRecovery: e.recoveryEvaluations.length > 0,
			gradeCount: e._count.grades,
			canDelete: !e.isClosed && e._count.grades === 0 && e.recoveryEvaluations.length === 0
		}))
	};
};

export const actions: Actions = {
	createEvaluation: async ({ request, locals }) => {
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
		const gradingMode = data.get('gradingMode')?.toString() || GradingMode.NUMERIC;
		const participatesInAverage = data.get('participatesInAverage') === 'on';
		const mandatory = data.get('mandatory') === 'on';
		const parentEvaluationId = data.get('parentEvaluationId')?.toString() || null;

		if (!subjectId || !title || !Object.values(EvaluationType).includes(type as EvaluationType)) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}
		if (!Object.values(GradingMode).includes(gradingMode as GradingMode)) {
			return { error: 'La modalidad de calificación no es válida' };
		}

		// Bloquear MESA_EXAMEN temporalmente
		if (type === 'MESA_EXAMEN') {
			return { error: 'Las mesas de examen no están habilitadas en esta versión' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);
			if (commissionId) {
				const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);
				const commission = await prisma.subjectCommission.findUnique({
					where: { id: commissionId },
					select: { locationId: true }
				});
				if (
					!commission ||
					(commission.locationId && !allowedLocationIds.includes(commission.locationId))
				) {
					return { error: 'No tenés permiso para crear evaluaciones en esta sede' };
				}
			}

			const maxScoreValue = maxScore ? parseFloat(maxScore) : 10;
			const minPassingScoreValue = minPassingScore ? parseFloat(minPassingScore) : 6;
			if (
				!Number.isFinite(maxScoreValue) ||
				maxScoreValue <= 0 ||
				!Number.isFinite(minPassingScoreValue) ||
				minPassingScoreValue < 0 ||
				minPassingScoreValue > maxScoreValue
			) {
				return { error: 'Revisá el puntaje máximo y la nota mínima de aprobación' };
			}

			const evaluation = await evaluationService.createEvaluation({
				subjectId,
				commissionId: commissionId || undefined,
				title,
				description: description || undefined,
				type: type as EvaluationType,
				evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
				maxScore: maxScoreValue,
				minPassingScore: minPassingScoreValue,
				gradingMode: gradingMode as GradingMode,
				participatesInAverage,
				mandatory,
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

	updateEvaluation: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) return { error: 'No autenticado' };

		const data = await request.formData();
		const evaluationId = data.get('evaluationId')?.toString();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString();
		const evaluationDate = data.get('evaluationDate')?.toString();
		const maxScore = Number(data.get('maxScore'));
		const minPassingScore = Number(data.get('minPassingScore'));
		const participatesInAverage = data.get('participatesInAverage') === 'on';
		const mandatory = data.get('mandatory') === 'on';

		if (!evaluationId || !title || !evaluationDate) {
			return { error: 'Completá el título y la fecha de la evaluación' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);
			const result = await evaluationService.updateEvaluation({
				evaluationId,
				title,
				description: description || undefined,
				evaluationDate: new Date(`${evaluationDate}T12:00:00`),
				maxScore,
				minPassingScore,
				participatesInAverage,
				mandatory,
				userId: locals.user.id
			});

			if ('error' in result) return result;
			return { success: 'Evaluación actualizada exitosamente' };
		} catch (error) {
			console.error('Error al actualizar evaluación:', error);
			return { error: 'Error al actualizar la evaluación' };
		}
	},

	deleteEvaluation: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) return { error: 'No autenticado' };

		const data = await request.formData();
		const evaluationId = data.get('evaluationId')?.toString();

		if (!evaluationId) return { error: 'ID de evaluación requerido' };

		try {
			const evaluationService = new EvaluationService(prisma);
			const result = await evaluationService.deleteEvaluation({
				evaluationId,
				userId: locals.user.id
			});

			if ('error' in result) return result;
			return { success: 'Evaluación eliminada exitosamente' };
		} catch (error) {
			console.error('Error al eliminar evaluación:', error);
			return { error: 'Error al eliminar la evaluación' };
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
