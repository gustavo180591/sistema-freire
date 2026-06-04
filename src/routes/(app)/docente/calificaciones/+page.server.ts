import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener localidades permitidas para el docente
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id }
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las materias asignadas al docente, filtrando por localidades permitidas
	const subjectTeachers = await prisma.subjectTeacher.findMany({
		where: { teacherId: teacher.id },
		include: {
			subject: {
				include: {
					careerSubjects: {
						where: {
							career: {
								locationId: { in: allowedLocationIds }
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

	const subjects = subjectTeachers.map(st => st.subject);

	// Obtener estudiantes de las carreras de las materias del docente
	const careerIds = subjects.flatMap(s => s.careerSubjects.map(cs => cs.career.id));
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
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	// Obtener calificaciones existentes del docente
	const existingGrades = await prisma.grade.findMany({
		where: {
			createdByUserId: locals.user.id,
			subjectId: {
				in: subjects.map(s => s.id)
			}
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			subject: true
		},
		orderBy: { gradedAt: 'desc' },
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
		students: students.map(s => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name,
			currentYear: s.currentYear
		})),
		existingGrades: existingGrades.map(g => ({
			id: g.id,
			studentId: g.studentId,
			studentName: `${g.student.lastName}, ${g.student.firstName}`,
			subject: g.subject.name,
			subjectId: g.subjectId,
			value: g.value,
			gradeType: g.gradeType,
			gradedAt: g.gradedAt
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
		const subjectId = data.get('subjectId')?.toString();
		const grade = data.get('grade')?.toString();
		const evaluationType = data.get('evaluationType')?.toString();
		const notes = data.get('notes')?.toString();

		if (!studentId || !subjectId || !grade) {
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
				return { error: 'No tenés permiso para cargar calificaciones en esta materia' };
			}

			// Obtener datos del estudiante para auditoría
			const student = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			await prisma.grade.create({
				data: {
					studentId,
					subjectId,
					value: parseFloat(grade),
					gradeType: evaluationType || 'PARCIAL',
					createdByUserId: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'GRADE',
				entityId: studentId,
				description: `Carga de calificación: ${grade} para ${student?.firstName} ${student?.lastName} en ${subject?.name} (${evaluationType || 'PARCIAL'})`
			});

			return { success: 'Calificación registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar calificación:', error);
			return { error: 'Error al registrar la calificación' };
		}
	}
};
