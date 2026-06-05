import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';

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
								locations: {
									some: {
										locationId: { in: allowedLocationIds }
									}
								}
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

	// Obtener calificaciones recientes del docente
	const recentGrades = await prisma.grade.findMany({
		where: {
			createdByUserId: locals.user.id,
			subjectId: {
				in: subjects.map(s => s.id)
			}
		},
		include: {
			subject: true,
			student: true
		},
		orderBy: { gradedAt: 'desc' },
		take: 10
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
			entries: true
		},
		orderBy: { classDate: 'desc' },
		take: 10
	});

	return {
		teacher: {
			id: teacher.id,
			firstName: teacher.firstName,
			lastName: teacher.lastName,
			dni: teacher.dni
		},
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
		recentGrades: recentGrades.map(g => ({
			id: g.id,
			studentId: g.studentId,
			studentName: `${g.student.lastName}, ${g.student.firstName}`,
			subject: g.subject.name,
			value: g.value,
			gradeType: g.gradeType,
			gradedAt: g.gradedAt
		})),
		recentAttendance: recentAttendance.map(a => ({
			id: a.id,
			date: a.classDate,
			subject: a.subject.name,
			totalStudents: a.entries.length,
			presentStudents: a.entries.filter((e: any) => e.present).length
		}))
	};
};
