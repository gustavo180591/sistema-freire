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

	// Obtener estudiantes de las carreras de las materias del docente
	const careerIds = subjects.flatMap((s) => s.careerSubjects.map((cs) => cs.career.id));
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			careerId: {
				in: careerIds
			}
		},
		include: {
			user: true,
			career: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	// Obtener observaciones académicas recientes del docente
	const recentObservations = await prisma.studentFollowUp.findMany({
		where: {
			createdBy: locals.user.id,
			type: {
				in: ['OBSERVATION', 'NOTE', 'ACHIEVEMENT']
			},
			student: {
				careerId: {
					in: careerIds
				}
			}
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			creator: true
		},
		orderBy: { date: 'desc' },
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
		students: students.map((s) => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name,
			currentYear: s.currentYear
		})),
		recentObservations: recentObservations.map((o) => ({
			id: o.id,
			studentId: o.studentId,
			studentName: `${o.student.lastName}, ${o.student.firstName}`,
			type: o.type,
			title: o.title,
			description: o.description,
			date: o.date,
			isAlert: o.isAlert,
			isResolved: o.isResolved,
			creatorName: `${o.creator.firstName} ${o.creator.lastName}`
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
		const studentId = data.get('studentId')?.toString();
		const type = data.get('type')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const isAlert = data.get('isAlert')?.toString() === 'true';

		if (!studentId || !type || !title || !description) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que el estudiante pertenezca a las carreras de las materias del docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id }
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

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

			const careerIds = subjectTeachers.flatMap((st) =>
				st.subject.careerSubjects.map((cs) => cs.career.id)
			);
			const student = await prisma.student.findUnique({
				where: { id: studentId }
			});

			if (!student || !careerIds.includes(student.careerId)) {
				return { error: 'No tenés permiso para registrar observaciones a este estudiante' };
			}

			// Obtener datos del estudiante para auditoría
			const studentWithUser = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			await prisma.studentFollowUp.create({
				data: {
					studentId,
					type: type as any,
					title,
					description,
					createdBy: locals.user.id,
					isAlert: isAlert || false
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'STUDENT_FOLLOW_UP',
				entityId: studentId,
				description: `Observación académica: ${type} - ${title} para ${studentWithUser?.firstName} ${studentWithUser?.lastName}${isAlert ? ' (ALERTA)' : ''}`
			});

			return { success: 'Observación registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar observación:', error);
			return { error: 'Error al registrar la observación' };
		}
	}
};
