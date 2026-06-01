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
	const commissionIds = commissions.map(c => c.id);

	// Obtener estudiantes de las comisiones del docente
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			enrollments: {
				some: {
					commissionId: {
						in: commissionIds
					}
				}
			}
		},
		include: {
			career: true,
			enrollments: true
		}
	});

	const studentIds = students.map(s => s.id);

	// Calificaciones por materia
	const gradesBySubject = await prisma.grade.groupBy({
		by: ['commissionId'],
		where: {
			studentId: {
				in: studentIds
			},
			commissionId: {
				in: commissionIds
			}
		},
		_count: true,
		_avg: {
			value: true
		}
	});

	// Asistencia por materia
	const attendanceRecords = await prisma.attendanceRecord.findMany({
		where: {
			commissionId: {
				in: commissionIds
			}
		},
		include: {
			entries: true
		}
	});

	const attendanceBySubject = commissionIds.map(commissionId => {
		const records = attendanceRecords.filter(r => r.commissionId === commissionId);
		const totalEntries = records.reduce((sum, r) => sum + r.entries.length, 0);
		const presentEntries = records.reduce((sum, r) => sum + r.entries.filter((e: any) => e.present).length, 0);
		const attendanceRate = totalEntries > 0 ? (presentEntries / totalEntries) * 100 : 0;

		return {
			commissionId,
			totalClasses: records.length,
			totalEntries,
			presentEntries,
			attendanceRate: Math.round(attendanceRate * 10) / 10
		};
	});

	// Combinar datos por comisión
	const subjectReports = commissions.map(commission => {
		const gradesData = gradesBySubject.find(g => g.commissionId === commission.id);
		const attendanceData = attendanceBySubject.find(a => a.commissionId === commission.id);
		const commissionStudents = students.filter(s =>
			s.enrollments && s.enrollments.some((e: any) => e.commissionId === commission.id)
		);

		const avgValue = gradesData?._avg.value;
		const averageGrade = avgValue ? Math.round(Number(avgValue) * 100) / 100 : 0;

		return {
			id: commission.id,
			subject: commission.subject.name,
			commission: commission.name,
			term: commission.term.name,
			totalStudents: commissionStudents.length,
			totalGrades: gradesData?._count || 0,
			averageGrade,
			totalClasses: attendanceData?.totalClasses || 0,
			attendanceRate: attendanceData?.attendanceRate || 0
		};
	});

	return {
		subjectReports
	};
};
