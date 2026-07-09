import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireRole(locals.user, ['DOCENTE', 'DIRECTOR', 'SECRETARIA', 'SUPERADMIN']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const commissionId = params.id;

	// Obtener localidades permitidas para el usuario
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener la comisión con todos sus datos
	const commission = await prisma.subjectCommission.findUnique({
		where: { id: commissionId },
		include: {
			subject: true,
			career: true,
			academicTerm: true,
			teacher: {
				include: {
					user: true
				}
			},
			location: true
		}
	});

	if (!commission) {
		throw redirect(303, '/comisiones');
	}

	// Verificar permisos de localidad
	if (commission.locationId && !allowedLocationIds.includes(commission.locationId)) {
		throw redirect(303, '/comisiones');
	}

	// Verificar permisos: solo el docente de la comisión o administradores pueden ver
	const isAdmin = locals.user.roles.some((r: any) =>
		['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'].includes(r.role.code)
	);
	const isTeacher = commission.teacher?.userId === locals.user.id;

	if (!isAdmin && !isTeacher) {
		throw redirect(303, '/comisiones');
	}

	// Obtener alumnos inscriptos en la comisión
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			commissionId: commissionId,
			status: 'ACTIVE'
		},
		include: {
			student: {
				include: {
					user: true,
					subjectStatuses: {
						where: {
							subjectId: commission.subjectId
						}
					}
				}
			}
		}
	});

	// Obtener evaluaciones de la comisión
	const evaluations = await prisma.evaluation.findMany({
		where: {
			commissionId: commissionId
		},
		include: {
			subject: true
		},
		orderBy: { evaluationDate: 'asc' }
	});

	// Obtener calificaciones de la comisión
	const evaluationIds = evaluations.map((e) => e.id);
	const grades = await prisma.grade.findMany({
		where: {
			evaluationId: { in: evaluationIds }
		},
		include: {
			evaluation: true,
			student: {
				include: {
					user: true
				}
			}
		}
	});

	// Calcular estadísticas por evaluación
	const evaluationStats = evaluations.map((evaluation) => {
		const evalGrades = grades.filter((g) => g.evaluationId === evaluation.id);
		const present = evalGrades.filter((g) => g.status === 'PRESENT').length;
		const absent = evalGrades.filter((g) => g.status === 'ABSENT').length;
		const excused = evalGrades.filter((g) => g.status === 'EXCUSED').length;
		const withValue = evalGrades.filter((g) => g.value !== null);
		const avg =
			withValue.length > 0
				? withValue.reduce((sum, g) => sum + Number(g.value), 0) / withValue.length
				: 0;
		const passed = withValue.filter(
			(g) => Number(g.value) >= Number(evaluation.minPassingScore)
		).length;

		return {
			id: evaluation.id,
			title: evaluation.title,
			type: evaluation.type,
			date: evaluation.evaluationDate,
			maxScore: Number(evaluation.maxScore),
			minPassingScore: Number(evaluation.minPassingScore),
			weight: Number(evaluation.weight),
			isClosed: evaluation.isClosed,
			total: evalGrades.length,
			present,
			absent,
			excused,
			average: Math.round(avg * 100) / 100,
			passed,
			failed: withValue.length - passed
		};
	});

	// Calcular estadísticas por alumno
	const studentStats = enrollments.map((enrollment) => {
		const studentGrades = grades.filter((g) => g.studentId === enrollment.studentId);
		const subjectStatus = enrollment.student.subjectStatuses[0];

		const present = studentGrades.filter((g) => g.status === 'PRESENT').length;
		const absent = studentGrades.filter((g) => g.status === 'ABSENT').length;
		const excused = studentGrades.filter((g) => g.status === 'EXCUSED').length;
		const withValue = studentGrades.filter((g) => g.value !== null);
		const avg =
			withValue.length > 0
				? withValue.reduce((sum, g) => sum + Number(g.value), 0) / withValue.length
				: 0;

		// Determinar si está en riesgo (promedio < 6 o muchas ausencias)
		const atRisk = avg < 6 || absent > evaluations.length * 0.3;

		return {
			id: enrollment.student.id,
			dni: enrollment.student.dni,
			name: `${enrollment.student.lastName}, ${enrollment.student.firstName}`,
			total: studentGrades.length,
			present,
			absent,
			excused,
			average: Math.round(avg * 100) / 100,
			atRisk,
			courseStatus: subjectStatus?.courseStatus || 'UNKNOWN',
			academicStatus: subjectStatus?.academicStatus || 'UNKNOWN',
			approved: subjectStatus?.approved || false,
			promoted: subjectStatus?.promoted || false
		};
	});

	// Calcular estadísticas generales de la comisión
	const totalStudents = enrollments.length;
	const totalGrades = grades.length;
	const totalPresent = grades.filter((g) => g.status === 'PRESENT').length;
	const totalAbsent = grades.filter((g) => g.status === 'ABSENT').length;
	const totalExcused = grades.filter((g) => g.status === 'EXCUSED').length;
	const totalWithValue = grades.filter((g) => g.value !== null);
	const commissionAverage =
		totalWithValue.length > 0
			? totalWithValue.reduce((sum, g) => sum + Number(g.value), 0) / totalWithValue.length
			: 0;
	const approvedStudents = studentStats.filter((s) => s.approved).length;
	const atRiskStudents = studentStats.filter((s) => s.atRisk).length;

	return {
		commission: {
			id: commission.id,
			code: commission.code,
			name: commission.code,
			subject: commission.subject.name,
			subjectCode: commission.subject.code,
			career: commission.career?.name || 'Sin carrera',
			academicTerm: commission.academicTerm?.name || 'Sin período',
			teacher: commission.teacher
				? `${commission.teacher.user.firstName} ${commission.teacher.user.lastName}`
				: 'Sin docente',
			location: commission.location?.name || 'Sin localidad',
			active: commission.active
		},
		evaluations: evaluationStats,
		students: studentStats,
		summary: {
			totalStudents,
			totalGrades,
			totalPresent,
			totalAbsent,
			totalExcused,
			average: Math.round(commissionAverage * 100) / 100,
			approved: approvedStudents,
			failed: totalStudents - approvedStudents,
			atRisk: atRiskStudents
		}
	};
};
