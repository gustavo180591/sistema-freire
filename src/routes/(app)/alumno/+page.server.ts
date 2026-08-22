import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';
import { getStudentBlockingMessage } from '$lib/server/financial/student-blocking-service';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Verificar que sea alumno
	const isStudent = user.roles.includes('ALUMNO');
	if (!isStudent) {
		throw redirect(303, '/dashboard');
	}

	// Obtener el estudiante asociado al usuario (por userId o DNI)
	const student = await getCurrentStudentForUser(user.id);

	// Cargar datos adicionales del estudiante
	const studentWithRelations = await prisma.student.findUnique({
		where: { id: student.id },
		include: {
			career: true,
			subjectStatuses: {
				include: {
					subject: true
				}
			},
			studentCharges: {
				include: {
					concept: true
				}
			}
		}
	});

	if (!studentWithRelations) {
		throw error(404, 'No se encontraron datos del estudiante');
	}

	// Cargar evaluaciones de las materias del alumno (nuevo modelo)
	const subjectIds = studentWithRelations.subjectStatuses.map((s) => s.subjectId);
	const evaluations = await prisma.evaluation.findMany({
		where: {
			subjectId: { in: subjectIds },
			type: { in: ['EXAMEN_FINAL', 'MESA_EXAMEN'] },
			evaluationDate: { gte: new Date() } // Solo evaluaciones futuras
		},
		include: {
			subject: true
		},
		orderBy: { evaluationDate: 'asc' }
	});

	// Determinar si el alumno es de primer año
	const isFirstYear = studentWithRelations.currentYear === 1;

	// Calcular todas las materias (como en historial)
	let allSubjects = studentWithRelations.subjectStatuses.map((status) => ({
		id: status.id,
		subject: status.subject.name,
		subjectId: status.subject.id,
		yearLevel: status.subject.yearLevel,
		attendancePercent: Number(status.attendancePercent),
		regularityStatus: status.regularityStatus,
		approved: status.approved,
		hasStatus: true
	}));

	// Si es de primer año, agregar todas las materias de primer año de la carrera
	if (isFirstYear && studentWithRelations.careerId) {
		const firstYearSubjects = await prisma.subject.findMany({
			where: {
				active: true,
				yearLevel: 1,
				careerSubjects: {
					some: {
						careerId: studentWithRelations.careerId
					}
				}
			},
			orderBy: { name: 'asc' }
		});

		// Agregar materias que no tienen status asignado
		const subjectIdsWithStatus = new Set(
			studentWithRelations.subjectStatuses.map((s) => s.subjectId)
		);
		const subjectsWithoutStatus = firstYearSubjects
			.filter((s) => !subjectIdsWithStatus.has(s.id))
			.map((s) => ({
				id: s.id,
				subject: s.name,
				subjectId: s.id,
				yearLevel: s.yearLevel,
				attendancePercent: 0,
				regularityStatus: 'LIBRE' as const,
				approved: false,
				hasStatus: false
			}));

		allSubjects = [...allSubjects, ...subjectsWithoutStatus];
	}

	// Calcular métricas académicas
	const totalSubjects = allSubjects.length;
	const approvedSubjects = allSubjects.filter((s) => s.approved).length;
	const regularSubjects = allSubjects.filter((s) => s.regularityStatus === 'REGULAR').length;

	// Materias cursadas (aprobadas o regularizadas)
	const completedSubjects = allSubjects.filter(
		(s) => s.approved || s.regularityStatus === 'REGULAR'
	);

	// Materias cursando (en estado LIBRE)
	const currentSubjects = allSubjects.filter((s) => s.regularityStatus === 'LIBRE');

	// Calcular deuda total (usar finalAmount según tipo de alumno)
	const totalDebt = studentWithRelations.studentCharges.reduce(
		(acc: number, charge) => acc + Number(charge.finalAmount),
		0
	);

	// Verificar si el alumno está bloqueado financieramente
	const blockingMessage = await getStudentBlockingMessage(studentWithRelations.id);

	return {
		student: {
			id: studentWithRelations.id,
			dni: studentWithRelations.dni,
			firstName: studentWithRelations.firstName,
			lastName: studentWithRelations.lastName,
			fullName: `${studentWithRelations.firstName} ${studentWithRelations.lastName}`,
			career: studentWithRelations.career?.name || 'Sin carrera',
			status: studentWithRelations.status,
			financialBlocked: studentWithRelations.financialBlocked,
			blockingMessage
		},
		academic: {
			totalSubjects,
			approvedSubjects,
			regularSubjects,
			progress: totalSubjects > 0 ? Math.round((approvedSubjects / totalSubjects) * 100) : 0,
			completedSubjects: completedSubjects.map((s) => ({
				id: s.subjectId,
				name: s.subject,
				code: '',
				yearLevel: s.yearLevel,
				regularityStatus: s.regularityStatus,
				approved: s.approved
			})),
			currentSubjects: currentSubjects.map((s) => ({
				id: s.subjectId,
				name: s.subject,
				code: '',
				yearLevel: s.yearLevel,
				regularityStatus: s.regularityStatus,
				approved: s.approved
			}))
		},
		finances: {
			totalDebt,
			charges: studentWithRelations.studentCharges.slice(0, 5).map((charge) => ({
				...charge,
				amount: Number(charge.amount),
				paidAmount: Number(charge.paidAmount),
				lateFeeApplied: Number(charge.lateFeeApplied),
				discountApplied: Number(charge.discountApplied),
				scholarshipApplied: Number(charge.scholarshipApplied),
				finalAmount: Number(charge.finalAmount)
			}))
		},
		evaluations: evaluations.map((e) => ({
			id: e.id,
			subjectId: e.subjectId,
			subjectName: e.subject.name,
			title: e.title,
			type: e.type,
			date: e.evaluationDate
		}))
	};
};
