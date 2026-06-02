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

	// Obtener registros de asistencia recientes del docente
	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			createdByUserId: locals.user.id,
			subjectId: {
				in: subjects.map(s => s.id)
			}
		},
		include: {
			subject: true,
			entries: {
				include: {
					student: {
						include: {
							user: true
						}
					}
				}
			}
		},
		orderBy: { classDate: 'desc' },
		take: 20
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
		recentAttendance: recentAttendance.map(a => ({
			id: a.id,
			date: a.classDate,
			subject: a.subject.name,
			totalStudents: a.entries.length,
			presentStudents: a.entries.filter((e: any) => e.present).length,
			entries: a.entries.map((e: any) => ({
				studentId: e.studentId,
				studentName: `${e.student.lastName}, ${e.student.firstName}`,
				present: e.present,
				notes: e.notes
			}))
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
		const date = data.get('date')?.toString();
		const attendanceData = data.get('attendanceData')?.toString();

		if (!subjectId || !date || !attendanceData) {
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
				return { error: 'No tenés permiso para registrar asistencia en esta materia' };
			}

			// Obtener datos de la materia para auditoría
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			// Parsear datos de asistencia
			const attendance = JSON.parse(attendanceData) as Array<{ studentId: string; present: boolean; notes?: string }>;

			// Crear registro de asistencia
			const attendanceRecord = await prisma.attendanceRecord.create({
				data: {
					subjectId,
					classDate: new Date(date),
					createdByUserId: locals.user.id
				}
			});

			// Crear entradas de asistencia para cada estudiante
			const presentCount = attendance.filter(a => a.present).length;
			const absentCount = attendance.length - presentCount;

			await prisma.attendanceEntry.createMany({
				data: attendance.map(a => ({
					attendanceId: attendanceRecord.id,
					studentId: a.studentId,
					present: a.present,
					notes: a.notes || null
				}))
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE_RECORD',
				entityId: attendanceRecord.id,
				description: `Registro de asistencia: ${presentCount} presentes, ${absentCount} ausentes en ${subject?.name} el ${date}`
			});

			return { success: 'Asistencia registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar asistencia:', error);
			return { error: 'Error al registrar la asistencia' };
		}
	}
};
