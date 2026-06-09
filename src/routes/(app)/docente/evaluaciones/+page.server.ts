import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

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
			// Verificar que la materia pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id }
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const subjectTeacher = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId: teacher.id
					}
				}
			});

			if (!subjectTeacher) {
				return { error: 'No tenés permiso para crear evaluaciones en esta materia' };
			}

			// Validar comisión según tipo de evaluación
			const requiresCommission = ['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'].includes(type);
			if (requiresCommission && !commissionId) {
				return { error: `El tipo ${type} requiere seleccionar una comisión` };
			}

			// Si se proporciona comisión, validar que pertenezca a la materia
			if (commissionId) {
				const commission = await prisma.subjectCommission.findUnique({
					where: { id: commissionId }
				});
				if (!commission || commission.subjectId !== subjectId) {
					return { error: 'La comisión seleccionada no pertenece a esta materia' };
				}
				// Validar que el docente esté asignado a la comisión
				if (commission.teacherId !== teacher.id) {
					return { error: 'No estás asignado a esta comisión' };
				}
			}

			// Validar recuperatorio
			if (type === 'RECUPERATORIO') {
				if (!parentEvaluationId) {
					return { error: 'Un recuperatorio debe referenciar una evaluación original' };
				}
				const parentEvaluation = await prisma.evaluation.findUnique({
					where: { id: parentEvaluationId },
					include: { subject: true, commission: true }
				});
				if (!parentEvaluation) {
					return { error: 'Evaluación original no encontrada' };
				}
				if (parentEvaluation.subjectId !== subjectId) {
					return {
						error: 'El recuperatorio debe ser de la misma materia que la evaluación original'
					};
				}
				if (commissionId && parentEvaluation.commissionId !== commissionId) {
					return {
						error: 'El recuperatorio debe ser de la misma comisión que la evaluación original'
					};
				}
			}

			// Obtener datos de la materia para auditoría
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			// Convertir valores a Decimal
			const maxScoreValue = maxScore ? parseFloat(maxScore) : 10;
			const minPassingScoreValue = minPassingScore ? parseFloat(minPassingScore) : 6;
			const weightValue = weight ? parseFloat(weight) : 1;

			const evaluation = await prisma.evaluation.create({
				data: {
					subjectId,
					commissionId: commissionId || null,
					title,
					description: description || null,
					type: type as any, // Type cast until Prisma Client is regenerated
					evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
					maxScore: maxScoreValue,
					minPassingScore: minPassingScoreValue,
					weight: weightValue,
					parentEvaluationId: parentEvaluationId || null,
					createdByUserId: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'EVALUATION',
				entityId: evaluation.id,
				description: `Evaluación creada: ${type} - ${title} para ${subject?.name}${commissionId ? ' (comisión)' : ''}`
			});

			return { success: 'Evaluación creada exitosamente' };
		} catch (error) {
			console.error('Error al crear evaluación:', error);
			return { error: 'Error al crear la evaluación' };
		}
	}
};
