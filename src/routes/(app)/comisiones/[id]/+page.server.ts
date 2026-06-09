import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, redirect } from '@sveltejs/kit';
import { checkPermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	// Verificar permiso de lectura
	const canRead = await checkPermission(user, 'SUBJECT_COMMISSION', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver comisiones');
	}

	// Obtener comisión
	const commission = await prisma.subjectCommission.findUnique({
		where: { id: params.id },
		include: {
			subject: true,
			career: true,
			studyPlan: true,
			teacher: true,
			location: true,
			academicTerm: true,
			enrollments: {
				include: {
					student: {
						include: {
							user: { select: { email: true } }
						}
					}
				},
				orderBy: { enrolledAt: 'desc' }
			}
		}
	});

	if (!commission) {
		throw error(404, 'Comisión no encontrada');
	}

	return {
		commission: {
			id: commission.id,
			code: commission.code,
			subject: {
				id: commission.subject.id,
				name: commission.subject.name,
				code: commission.subject.code,
				yearLevel: commission.subject.yearLevel
			},
			career: commission.career
				? {
						id: commission.career.id,
						name: commission.career.name
					}
				: null,
			studyPlan: commission.studyPlan
				? {
						id: commission.studyPlan.id,
						name: commission.studyPlan.name,
						version: commission.studyPlan.version
					}
				: null,
			teacher: commission.teacher
				? {
						id: commission.teacher.id,
						name: `${commission.teacher.firstName} ${commission.teacher.lastName}`
					}
				: null,
			location: commission.location
				? {
						id: commission.location.id,
						name: commission.location.name,
						address: commission.location.address
					}
				: null,
			academicTerm: commission.academicTerm
				? {
						id: commission.academicTerm.id,
						name: commission.academicTerm.name,
						year: commission.academicTerm.year,
						startDate: commission.academicTerm.startDate,
						endDate: commission.academicTerm.endDate
					}
				: null,
			maxCapacity: commission.maxCapacity,
			currentEnrolled: commission.currentEnrolled,
			schedule: commission.schedule,
			scheduleJson: commission.scheduleJson,
			active: commission.active,
			observations: commission.observations,
			createdAt: commission.createdAt,
			updatedAt: commission.updatedAt
		},
		enrollments: commission.enrollments.map((e) => ({
			id: e.id,
			student: {
				id: e.student.id,
				fullName: `${e.student.lastName} ${e.student.firstName}`,
				dni: e.student.dni,
				email: e.student.user.email
			},
			status: e.status,
			enrolledAt: e.enrolledAt,
			confirmedAt: e.confirmedAt,
			cancelledAt: e.cancelledAt,
			rejectedAt: e.rejectedAt,
			rejectionReason: e.rejectionReason,
			cancellationReason: e.cancellationReason
		})),
		canUpdate: await checkPermission(user, 'SUBJECT_COMMISSION', 'update'),
		canDelete: await checkPermission(user, 'SUBJECT_COMMISSION', 'delete')
	};
};
