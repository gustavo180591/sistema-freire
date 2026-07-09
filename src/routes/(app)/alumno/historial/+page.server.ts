import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';

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

	// Buscar el estudiante asociado al usuario
	const student = await prisma.student.findFirst({
		where: { userId: user.id },
		include: {
			career: true,
			subjectStatuses: {
				include: {
					subject: true
				}
			},
			studentCharges: true
		}
	});

	if (!student) {
		throw redirect(303, '/dashboard');
	}

	// Determinar si el alumno es de primer año
	const isFirstYear = student.currentYear === 1;

	let subjects = student.subjectStatuses.map((status) => ({
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
	if (isFirstYear && student.careerId) {
		const firstYearSubjects = await prisma.subject.findMany({
			where: {
				active: true,
				yearLevel: 1,
				careerSubjects: {
					some: {
						careerId: student.careerId
					}
				}
			},
			orderBy: { name: 'asc' }
		});

		// Agregar materias que no tienen status asignado
		const subjectIdsWithStatus = new Set(student.subjectStatuses.map((s) => s.subjectId));
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

		subjects = [...subjects, ...subjectsWithoutStatus];
	}

	// Calcular progreso real basado en materias aprobadas
	const totalCareerSubjects = await prisma.subject.count({
		where: {
			active: true,
			careerSubjects: {
				some: {
					careerId: student.careerId
				}
			}
		}
	});

	const progress =
		totalCareerSubjects > 0
			? Math.round((subjects.filter((s) => s.approved).length / totalCareerSubjects) * 100)
			: 0;

	// Calcular deuda financiera real
	const totalDebt = student.studentCharges.reduce((sum, charge) => {
		return sum + Number(charge.amount) - Number(charge.paidAmount);
	}, 0);

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			status: student.status,
			career: student.career.name,
			currentYear: student.currentYear
		},
		academic: {
			totalSubjects: subjects.length,
			approvedSubjects: subjects.filter((s) => s.approved).length,
			regularSubjects: subjects.filter((s) => s.regularityStatus === 'REGULAR').length,
			freeSubjects: subjects.filter((s) => s.regularityStatus === 'LIBRE').length,
			progress,
			subjects
		},
		financial: {
			totalDebt
		}
	};
};
