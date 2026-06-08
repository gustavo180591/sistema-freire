import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ params, locals }) => {
	const commissionId = params.id;
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Verificar que la comisión existe
	const commission = await prisma.subjectCommission.findUnique({
		where: { id: commissionId },
		include: {
			subject: true,
			career: true,
			academicTerm: true,
			teacher: true,
			location: true
		}
	});

	if (!commission) {
		throw redirect(303, '/comisiones');
	}

	// Obtener localidades permitidas para el usuario
	const allowedLocationIds = await getUserAllowedLocationIds(user.id);

	// Verificar permisos según rol
	const hasAccess = await checkCommissionAccess(user, commission, allowedLocationIds);

	if (!hasAccess) {
		throw redirect(303, '/dashboard');
	}

	// Obtener registros de asistencia de la comisión
	const attendanceRecords = await prisma.attendanceRecord.findMany({
		where: {
			commissionId: commissionId
		},
		include: {
			subject: true,
			entries: {
				include: {
					student: {
						include: {
							user: true,
							career: true
						}
					}
				}
			}
		},
		orderBy: { classDate: 'desc' }
	});

	// Obtener estudiantes inscriptos en la comisión
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			commissionId: commissionId
		},
		include: {
			student: {
				include: {
					user: true,
					career: true
				}
			}
		}
	});

	// Obtener estados de materia de los estudiantes
	const studentIds = enrollments.map((e: { studentId: string }) => e.studentId);
	const subjectStatuses = await prisma.studentSubjectStatus.findMany({
		where: {
			studentId: { in: studentIds },
			subjectId: commission.subjectId
		}
	});

	// Agrupar datos por estudiante
	const studentsData = enrollments.map((enrollment: { student: any; studentId: string }) => {
		const status = subjectStatuses.find((s: { studentId: string }) => s.studentId === enrollment.studentId);
		const studentAttendance = attendanceRecords.flatMap((ar: { entries: any[] }) => 
			ar.entries.filter((e: { studentId: string; present: boolean }) => e.studentId === enrollment.studentId)
		);

		const presentCount = studentAttendance.filter((e: { present: boolean }) => e.present).length;
		const totalCount = studentAttendance.length;
		const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

		return {
			student: enrollment.student,
			attendancePercent: status ? Number(status.attendancePercent) : attendancePercent,
			regularityStatus: status?.regularityStatus || 'LIBRE',
			totalClasses: totalCount,
			presentClasses: presentCount,
			absentClasses: totalCount - presentCount,
			isCritical: (status ? Number(status.attendancePercent) : attendancePercent) < 75 && totalCount > 0
		};
	});

	// Calcular estadísticas generales de la comisión
	const totalStudents = studentsData.length;
	const regularStudents = studentsData.filter((s: { regularityStatus: string }) => s.regularityStatus === 'REGULAR').length;
	const libreStudents = studentsData.filter((s: { regularityStatus: string }) => s.regularityStatus === 'LIBRE').length;
	const criticalStudents = studentsData.filter((s: { isCritical: boolean }) => s.isCritical).length;
	const avgAttendance = totalStudents > 0 
		? Math.round(studentsData.reduce((sum: number, s: { attendancePercent: number }) => sum + s.attendancePercent, 0) / totalStudents)
		: 0;

	return {
		commission,
		students: studentsData,
		attendanceRecords: attendanceRecords.map((ar: { id: string; classDate: Date; subject: { name: string }; entries: any[] }) => ({
			id: ar.id,
			date: ar.classDate,
			subject: ar.subject.name,
			totalStudents: ar.entries.length,
			presentStudents: ar.entries.filter((e: { present: boolean }) => e.present).length
		})),
		stats: {
			totalStudents,
			regularStudents,
			libreStudents,
			criticalStudents,
			avgAttendance
		},
		userRole: user.roles[0]
	};
};

async function checkCommissionAccess(
	user: { id: string; roles: string[] },
	commission: { locationId?: string | null; teacherId?: string | null },
	allowedLocationIds: string[]
): Promise<boolean> {
	const role = user.roles[0];

	// Superadmin tiene acceso a todo
	if (role === 'SUPERADMIN') {
		return true;
	}

	// Verificar acceso por localidad
	if (commission.locationId && !allowedLocationIds.includes(commission.locationId)) {
		return false;
	}

	// Docente: solo si es el docente de la comisión
	if (role === 'DOCENTE') {
		const teacher = await prisma.teacher.findUnique({
			where: { userId: user.id }
		});
		return teacher?.id === commission.teacherId;
	}

	// Preceptor, Secretario, Director: acceso por localidad ya verificado
	if (['PRECEPTOR', 'SECRETARIO', 'DIRECTOR'].includes(role)) {
		return true;
	}

	return false;
}
