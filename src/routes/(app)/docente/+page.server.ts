import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id },
		include: {
			commissions: {
				include: {
					commission: {
						include: {
							subject: true,
							term: true
						}
					}
				}
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las comisiones asignadas al docente
	const commissions = teacher.commissions.map(ct => ct.commission);

	// Obtener estudiantes de las comisiones del docente
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			enrollments: {
				some: {
					commissionId: {
						in: commissions.map(c => c.id)
					}
				}
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
			commissionId: {
				in: commissions.map(c => c.id)
			}
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			commission: {
				include: {
					subject: true
				}
			}
		},
		orderBy: { gradedAt: 'desc' },
		take: 10
	});

	// Obtener registros de asistencia recientes del docente
	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			createdByUserId: locals.user.id,
			commissionId: {
				in: commissions.map(c => c.id)
			}
		},
		include: {
			commission: {
				include: {
					subject: true
				}
			},
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
		commissions: commissions.map(c => ({
			id: c.id,
			name: c.name,
			subject: c.subject.name,
			term: c.term.name,
			active: c.active
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
			studentName: `${g.student.lastName}, ${g.student.firstName}`,
			subject: g.commission.subject.name,
			value: g.value,
			gradeType: g.gradeType,
			gradedAt: g.gradedAt
		})),
		recentAttendance: recentAttendance.map(a => ({
			id: a.id,
			date: a.classDate,
			subject: a.commission.subject.name,
			commission: a.commission.name,
			totalStudents: a.entries.length,
			presentStudents: a.entries.filter((e: any) => e.present).length
		}))
	};
};
