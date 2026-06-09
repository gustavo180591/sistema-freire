import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { checkPermission } from '$lib/server/auth/permissions-granular';
import { EnrollmentStatus } from '@prisma/client';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	// Verificar permiso de lectura
	const canRead = await checkPermission(user, 'STUDENT', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver inscripciones');
	}

	// Obtener filtros de la URL
	const statusFilter = url.searchParams.get('status') as EnrollmentStatus | null;
	const careerFilter = url.searchParams.get('career');
	const termFilter = url.searchParams.get('term');
	const studentFilter = url.searchParams.get('student');

	// Construir where clause
	const where: any = {};
	if (statusFilter) where.status = statusFilter;
	if (careerFilter) where.careerId = careerFilter;
	if (termFilter) where.academicTermId = termFilter;
	if (studentFilter) {
		where.student = {
			OR: [
				{ firstName: { contains: studentFilter, mode: 'insensitive' } },
				{ lastName: { contains: studentFilter, mode: 'insensitive' } },
				{ dni: { contains: studentFilter } }
			]
		};
	}

	// Obtener inscripciones
	const enrollments = await prisma.subjectEnrollment.findMany({
		where,
		include: {
			student: {
				include: {
					user: { select: { email: true } }
				}
			},
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
		orderBy: { enrolledAt: 'desc' },
		take: 100
	});

	// Obtener datos para filtros
	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	const terms = await prisma.academicTerm.findMany({
		where: { active: true },
		orderBy: { startDate: 'desc' }
	});

	return {
		enrollments: enrollments.map((e) => ({
			id: e.id,
			student: {
				id: e.student.id,
				fullName: `${e.student.lastName} ${e.student.firstName}`,
				dni: e.student.dni,
				email: e.student.user.email
			},
			subject: {
				id: e.subject.id,
				name: e.subject.name,
				code: e.subject.code,
				yearLevel: e.subject.yearLevel
			},
			commission: e.commission
				? {
						id: e.commission.id,
						code: e.commission.code,
						schedule: e.commission.schedule,
						teacher: e.commission.teacher
							? {
									name: `${e.commission.teacher.firstName} ${e.commission.teacher.lastName}`
								}
							: null,
						location: e.commission.location
							? {
									name: e.commission.location.name
								}
							: null
					}
				: null,
			career: {
				id: e.career.id,
				name: e.career.name
			},
			studyPlan: e.studyPlan
				? {
						name: e.studyPlan.name,
						version: e.studyPlan.version
					}
				: null,
			academicTerm: e.academicTerm
				? {
						id: e.academicTerm.id,
						name: e.academicTerm.name,
						year: e.academicTerm.year
					}
				: null,
			status: e.status,
			enrolledAt: e.enrolledAt,
			confirmedAt: e.confirmedAt,
			cancelledAt: e.cancelledAt,
			rejectedAt: e.rejectedAt,
			rejectionReason: e.rejectionReason,
			cancellationReason: e.cancellationReason,
			enrolledBy: e.enrolledBy
		})),
		filters: {
			status: statusFilter,
			career: careerFilter,
			term: termFilter,
			student: studentFilter
		},
		careers,
		terms,
		canUpdate: await checkPermission(user, 'STUDENT', 'update'),
		canDelete: await checkPermission(user, 'STUDENT', 'delete')
	};
};

export const actions: Actions = {
	// Confirmar inscripción
	confirm: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para confirmar inscripciones' });
		}

		const formData = await request.formData();
		const enrollmentId = formData.get('enrollmentId')?.toString();

		if (!enrollmentId) {
			return fail(400, { error: 'ID de inscripción requerido' });
		}

		// Obtener inscripción
		const enrollment = await prisma.subjectEnrollment.findUnique({
			where: { id: enrollmentId },
			include: { student: true, subject: true }
		});

		if (!enrollment) {
			return fail(404, { error: 'Inscripción no encontrada' });
		}

		// Actualizar estado
		await prisma.subjectEnrollment.update({
			where: { id: enrollmentId },
			data: {
				status: EnrollmentStatus.ACTIVE,
				confirmedAt: new Date(),
				confirmedBy: user.id
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'SubjectEnrollment',
			entityId: enrollmentId,
			description: `Confirmó inscripción de ${enrollment.student.lastName} ${enrollment.student.firstName} a ${enrollment.subject.name}`
		});

		return {
			success: true,
			message: 'Inscripción confirmada correctamente'
		};
	},

	// Rechazar inscripción
	reject: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para rechazar inscripciones' });
		}

		const formData = await request.formData();
		const enrollmentId = formData.get('enrollmentId')?.toString();
		const reason = formData.get('reason')?.toString();

		if (!enrollmentId) {
			return fail(400, { error: 'ID de inscripción requerido' });
		}

		// Obtener inscripción
		const enrollment = await prisma.subjectEnrollment.findUnique({
			where: { id: enrollmentId },
			include: { student: true, subject: true, commission: true }
		});

		if (!enrollment) {
			return fail(404, { error: 'Inscripción no encontrada' });
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

		// Actualizar estado
		await prisma.subjectEnrollment.update({
			where: { id: enrollmentId },
			data: {
				status: EnrollmentStatus.REJECTED,
				rejectedAt: new Date(),
				rejectedBy: user.id,
				rejectionReason: reason || 'Rechazado por administración'
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'SubjectEnrollment',
			entityId: enrollmentId,
			description: `Rechazó inscripción de ${enrollment.student.lastName} ${enrollment.student.firstName} a ${enrollment.subject.name}`
		});

		return {
			success: true,
			message: 'Inscripción rechazada correctamente'
		};
	},

	// Cancelar inscripción (admin)
	cancel: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para cancelar inscripciones' });
		}

		const formData = await request.formData();
		const enrollmentId = formData.get('enrollmentId')?.toString();
		const reason = formData.get('reason')?.toString();

		if (!enrollmentId) {
			return fail(400, { error: 'ID de inscripción requerido' });
		}

		// Obtener inscripción
		const enrollment = await prisma.subjectEnrollment.findUnique({
			where: { id: enrollmentId },
			include: { student: true, subject: true, commission: true }
		});

		if (!enrollment) {
			return fail(404, { error: 'Inscripción no encontrada' });
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

		// Actualizar estado
		await prisma.subjectEnrollment.update({
			where: { id: enrollmentId },
			data: {
				status: EnrollmentStatus.CANCELLED,
				cancelledAt: new Date(),
				cancelledBy: user.id,
				cancellationReason: reason || 'Cancelado por administración'
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'SubjectEnrollment',
			entityId: enrollmentId,
			description: `Canceló inscripción de ${enrollment.student.lastName} ${enrollment.student.firstName} a ${enrollment.subject.name}`
		});

		return {
			success: true,
			message: 'Inscripción cancelada correctamente'
		};
	}
};
