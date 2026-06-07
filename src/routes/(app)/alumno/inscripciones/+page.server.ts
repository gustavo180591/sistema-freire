import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, fail } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { EnrollmentStatus } from '@prisma/client';

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
			career: true
		}
	});

	if (!student) {
		throw redirect(303, '/dashboard');
	}

	// Obtener inscripciones del alumno
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: { studentId: student.id },
		include: {
			subject: true,
			commission: {
				include: {
					teacher: true,
					location: true
				}
			},
			career: true,
			studyPlan: true,
			academicTerm: true
		},
		orderBy: { enrolledAt: 'desc' }
	});

	// Obtener período lectivo activo
	const activeTerm = await prisma.academicTerm.findFirst({
		where: { active: true },
		orderBy: { startDate: 'desc' }
	});

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			career: student.career.name
		},
		enrollments: enrollments.map(e => ({
			id: e.id,
			subject: {
				id: e.subject.id,
				name: e.subject.name,
				code: e.subject.code,
				yearLevel: e.subject.yearLevel
			},
			commission: e.commission ? {
				id: e.commission.id,
				code: e.commission.code,
				schedule: e.commission.schedule,
				teacher: e.commission.teacher ? {
					name: `${e.commission.teacher.firstName} ${e.commission.teacher.lastName}`
				} : null,
				location: e.commission.location ? {
					name: e.commission.location.name
				} : null
			} : null,
			career: {
				name: e.career.name
			},
			studyPlan: e.studyPlan ? {
				name: e.studyPlan.name,
				version: e.studyPlan.version
			} : null,
			academicTerm: e.academicTerm ? {
				name: e.academicTerm.name,
				year: e.academicTerm.year
			} : null,
			status: e.status,
			enrolledAt: e.enrolledAt,
			confirmedAt: e.confirmedAt,
			cancelledAt: e.cancelledAt,
			rejectedAt: e.rejectedAt,
			rejectionReason: e.rejectionReason,
			cancellationReason: e.cancellationReason,
			canCancel: e.status === EnrollmentStatus.ACTIVE && (!activeTerm || e.academicTermId === activeTerm.id)
		})),
		activeTerm
	};
};

export const actions: Actions = {
	// Cancelar inscripción
	cancel: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const isStudent = user.roles.includes('ALUMNO');
		if (!isStudent) {
			return fail(403, { error: 'Solo alumnos pueden cancelar sus inscripciones' });
		}

		const formData = await request.formData();
		const enrollmentId = formData.get('enrollmentId')?.toString();

		if (!enrollmentId) {
			return fail(400, { error: 'ID de inscripción requerido' });
		}

		// Buscar el estudiante
		const student = await prisma.student.findFirst({
			where: { userId: user.id }
		});

		if (!student) {
			return fail(404, { error: 'Alumno no encontrado' });
		}

		// Obtener la inscripción
		const enrollment = await prisma.subjectEnrollment.findUnique({
			where: { id: enrollmentId },
			include: {
				subject: true,
				commission: true
			}
		});

		if (!enrollment) {
			return fail(404, { error: 'Inscripción no encontrada' });
		}

		// Verificar que pertenezca al alumno
		if (enrollment.studentId !== student.id) {
			return fail(403, { error: 'No tenés permiso para cancelar esta inscripción' });
		}

		// Verificar que esté activa
		if (enrollment.status !== EnrollmentStatus.ACTIVE) {
			return fail(400, { error: 'Solo se pueden cancelar inscripciones activas' });
		}

		// Actualizar cupo de comisión si corresponde
		if (enrollment.commissionId) {
			await prisma.subjectCommission.update({
				where: { id: enrollment.commissionId },
				data: {
					currentEnrolled: {
						decrement: 1
					}
				}
			});
		}

		// Cancelar inscripción
		await prisma.subjectEnrollment.update({
			where: { id: enrollmentId },
			data: {
				status: EnrollmentStatus.CANCELLED,
				cancelledAt: new Date(),
				cancelledBy: user.id,
				cancellationReason: 'Cancelado por el alumno'
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'SubjectEnrollment',
			entityId: enrollmentId,
			description: `Alumno ${student.lastName} ${student.firstName} canceló inscripción a materia ${enrollment.subject.name}`
		});

		return {
			success: true,
			message: 'Inscripción cancelada correctamente'
		};
	}
};
