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

	const subjects = subjectTeachers.map(st => st.subject);

	// Obtener evaluaciones del docente
	const evaluations = await prisma.evaluation.findMany({
		where: {
			createdBy: locals.user.id,
			subjectId: {
				in: subjects.map(s => s.id)
			}
		},
		include: {
			subject: true,
			creator: true
		},
		orderBy: { date: 'desc' },
		take: 50
	});

	return {
		subjects: subjects.map(s => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map(cs => cs.career.name)
		})),
		evaluations: evaluations.map(e => ({
			id: e.id,
			title: e.title,
			description: e.description,
			type: e.type,
			date: e.date,
			maxScore: e.maxScore,
			subject: e.subject.name,
			createdAt: e.createdAt,
			creatorName: `${e.creator.firstName} ${e.creator.lastName}`
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
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const type = data.get('type')?.toString();
		const date = data.get('date')?.toString();
		const maxScore = data.get('maxScore')?.toString();

		if (!subjectId || !title || !type) {
			return { error: 'Por favor completá todos los campos requeridos' };
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

			// Obtener datos de la materia para auditoría
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			await prisma.evaluation.create({
				data: {
					subjectId,
					title,
					description: description || null,
					type,
					date: date ? new Date(date) : null,
					maxScore: maxScore ? parseFloat(maxScore) : 10,
					createdBy: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'EVALUATION',
				entityId: subjectId,
				description: `Evaluación creada: ${type} - ${title} para ${subject?.name}`
			});

			return { success: 'Evaluación creada exitosamente' };
		} catch (error) {
			console.error('Error al crear evaluación:', error);
			return { error: 'Error al crear la evaluación' };
		}
	}
};
