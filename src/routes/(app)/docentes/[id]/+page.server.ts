import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireRole(locals.user, ['DIRECTOR', 'SECRETARIA']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const teacherId = params.id;

	// Obtener el docente
	const teacher = await prisma.teacher.findUnique({
		where: { id: teacherId },
		include: {
			user: true,
			subjects: {
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
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/docentes');
	}

	// Obtener todas las materias disponibles
	const allSubjects = await prisma.subject.findMany({
		where: { active: true },
		include: {
			careerSubjects: {
				include: {
					career: true
				}
			}
		},
		orderBy: [{ yearLevel: 'asc' }, { code: 'asc' }]
	});

	// Obtener IDs de materias ya asignadas
	const assignedSubjectIds = teacher.subjects.map((st) => st.subjectId);

	// Filtrar materias no asignadas
	const availableSubjects = allSubjects.filter((s) => !assignedSubjectIds.includes(s.id));

	return {
		teacher: {
			id: teacher.id,
			userId: teacher.userId,
			dni: teacher.dni,
			firstName: teacher.firstName,
			lastName: teacher.lastName,
			email: teacher.user.email
		},
		assignedSubjects: teacher.subjects.map((st) => ({
			subjectId: st.subjectId,
			teacherId: st.teacherId,
			...st.subject,
			careers: st.subject.careerSubjects.map((cs) => cs.career)
		})),
		availableSubjects: availableSubjects.map((s) => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map((cs) => cs.career)
		}))
	};
};

export const actions: Actions = {
	assignSubject: async ({ request, locals }) => {
		requireRole(locals.user, ['DIRECTOR', 'SECRETARIA']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const teacherId = data.get('teacherId')?.toString();
		const subjectId = data.get('subjectId')?.toString();

		if (!teacherId || !subjectId) {
			return { error: 'Datos requeridos faltantes' };
		}

		try {
			// Verificar que el docente existe
			const teacher = await prisma.teacher.findUnique({
				where: { id: teacherId }
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			// Verificar que la materia existe
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			if (!subject) {
				return { error: 'Materia no encontrada' };
			}

			// Verificar que no esté ya asignada
			const existingAssignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				}
			});

			if (existingAssignment) {
				return { error: 'La materia ya está asignada a este docente' };
			}

			// Crear asignación
			await prisma.subjectTeacher.create({
				data: {
					subjectId,
					teacherId
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'SUBJECT_TEACHER',
				entityId: teacherId,
				description: `Asignación de materia ${subject.code} - ${subject.name} al docente ${teacher.lastName}, ${teacher.firstName}`
			});

			return { success: 'Materia asignada exitosamente' };
		} catch (error) {
			console.error('Error al asignar materia:', error);
			return { error: 'Error al asignar la materia' };
		}
	},

	removeSubject: async ({ request, locals }) => {
		requireRole(locals.user, ['DIRECTOR', 'SECRETARIA']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const subjectId = data.get('subjectId')?.toString();
		const teacherId = data.get('teacherId')?.toString();

		if (!subjectId || !teacherId) {
			return { error: 'Datos requeridos faltantes' };
		}

		try {
			// Obtener la asignación para auditoría
			const assignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				},
				include: {
					subject: true,
					teacher: true
				}
			});

			if (!assignment) {
				return { error: 'Asignación no encontrada' };
			}

			// Eliminar asignación
			await prisma.subjectTeacher.delete({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.DELETE,
				entityType: 'SUBJECT_TEACHER',
				entityId: teacherId,
				description: `Eliminación de materia ${assignment.subject.code} - ${assignment.subject.name} del docente ${assignment.teacher.lastName}, ${assignment.teacher.firstName}`
			});

			return { success: 'Materia eliminada exitosamente' };
		} catch (error) {
			console.error('Error al eliminar materia:', error);
			return { error: 'Error al eliminar la materia' };
		}
	}
};
