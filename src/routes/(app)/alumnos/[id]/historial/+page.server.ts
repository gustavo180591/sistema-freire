import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { error, fail } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const student = await prisma.student.findUnique({
		where: { id: params.id },
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
		throw error(404, 'Alumno no encontrado');
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

	// Calcular progreso real del alumno
	// Obtener todas las materias de la carrera
	const allCareerSubjects = await prisma.subject.findMany({
		where: {
			active: true,
			careerSubjects: {
				some: {
					careerId: student.careerId
				}
			}
		},
		select: { id: true }
	});

	const totalCareerSubjects = allCareerSubjects.length;
	const approvedCount = student.subjectStatuses.filter((s) => s.approved).length;
	const progress =
		totalCareerSubjects > 0 ? Math.round((approvedCount / totalCareerSubjects) * 100) : 0;

	// Calcular deuda financiera real
	const totalCharges = student.studentCharges.reduce(
		(sum, charge) => sum + Number(charge.amount),
		0
	);
	const totalPayments = await prisma.payment.aggregate({
		where: {
			studentId: student.id
		},
		_sum: {
			amount: true
		}
	});
	const totalDebt = totalCharges - Number(totalPayments._sum.amount || 0);

	return {
		student: {
			id: student.id,
			userId: student.userId,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			status: student.status,
			career: student.career.name
		},
		academic: {
			totalSubjects: subjects.length,
			approvedSubjects: approvedCount,
			regularSubjects: subjects.filter((s) => s.regularityStatus === 'REGULAR').length,
			progress,
			subjects
		},
		financial: {
			totalDebt
		}
	};
};

export const actions: Actions = {
	resetPassword: async ({ params, locals, request }) => {
		await requireStudentAccess(locals.user, params.id);

		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const student = await prisma.student.findUnique({
			where: { id: params.id },
			include: { user: true }
		});

		if (!student) {
			return fail(404, { error: 'Alumno no encontrado' });
		}

		const defaultPassword = '12345678';
		const hashedPassword = await bcrypt.hash(defaultPassword, 10);

		try {
			await prisma.user.update({
				where: { id: student.userId },
				data: { passwordHash: hashedPassword }
			});

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'USER',
				entityId: student.userId,
				description: `Contraseña restablecida para alumno: ${student.firstName} ${student.lastName} (${student.dni})`
			});

			return { success: true, message: 'Contraseña restablecida a 12345678' };
		} catch (error) {
			console.error('Error al restablecer contraseña:', error);
			return fail(500, { error: 'Error al restablecer la contraseña' });
		}
	}
};
