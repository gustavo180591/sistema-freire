import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { checkPermission } from '$lib/server/auth/permissions-granular';
import type { Prisma } from '@prisma/client';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	const canRead = await checkPermission(user, 'SUBJECT_COMMISSION', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver comisiones');
	}

	const careerFilter = url.searchParams.get('career');
	const subjectFilter = url.searchParams.get('subject');
	const studyPlanFilter = url.searchParams.get('studyPlan');
	const termFilter = url.searchParams.get('term');
	const teacherFilter = url.searchParams.get('teacher');
	const locationFilter = url.searchParams.get('location');
	const activeFilter = url.searchParams.get('active');

	const where: Prisma.SubjectCommissionWhereInput = {};

	if (careerFilter) where.careerId = careerFilter;
	if (subjectFilter) where.subjectId = subjectFilter;
	if (studyPlanFilter) where.studyPlanId = studyPlanFilter;
	if (termFilter) where.academicTermId = termFilter;
	if (teacherFilter) where.teacherId = teacherFilter;
	if (locationFilter) where.locationId = locationFilter;
	if (activeFilter !== null && activeFilter !== '') where.active = activeFilter === 'true';

	const commissions = await prisma.subjectCommission.findMany({
		where,
		include: {
			subject: {
				select: {
					id: true,
					name: true,
					code: true,
					yearLevel: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true,
					version: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			location: {
				select: {
					id: true,
					name: true
				}
			},
			academicTerm: {
				select: {
					id: true,
					name: true,
					year: true
				}
			},
			_count: {
				select: { enrollments: true }
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 100
	});

	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true
		}
	});

	const subjects = await prisma.subject.findMany({
		where: { active: true },
		orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }],
		select: {
			id: true,
			code: true,
			name: true,
			yearLevel: true,
			subjectType: true,
			trainingField: true,
			active: true
		}
	});

	const studyPlans = await prisma.studyPlan.findMany({
		where: { active: true },
		orderBy: { version: 'desc' },
		select: {
			id: true,
			name: true,
			version: true,
			careerId: true,
			career: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	const terms = await prisma.academicTerm.findMany({
		where: { active: true },
		orderBy: { startDate: 'desc' },
		select: {
			id: true,
			name: true,
			year: true,
			active: true
		}
	});

	const teachers = await prisma.teacher.findMany({
		where: { status: 'ACTIVE' },
		orderBy: { lastName: 'asc' },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			dni: true,
			status: true
		}
	});

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true,
			active: true
		}
	});

	return {
		commissions: commissions.map((c) => ({
			id: c.id,
			code: c.code,
			subject: c.subject,
			career: c.career,
			studyPlan: c.studyPlan,
			teacher: c.teacher
				? {
						id: c.teacher.id,
						name: `${c.teacher.firstName} ${c.teacher.lastName}`
					}
				: null,
			location: c.location,
			academicTerm: c.academicTerm,
			maxCapacity: c.maxCapacity,
			currentEnrolled: c.currentEnrolled,
			enrollmentsCount: c._count.enrollments,
			schedule: c.schedule,
			active: c.active,
			observations: c.observations,
			createdAt: c.createdAt.toISOString()
		})),
		filters: {
			career: careerFilter,
			subject: subjectFilter,
			studyPlan: studyPlanFilter,
			term: termFilter,
			teacher: teacherFilter,
			location: locationFilter,
			active: activeFilter
		},
		careers,
		subjects,
		studyPlans,
		terms,
		teachers,
		locations,
		canCreate: await checkPermission(user, 'SUBJECT_COMMISSION', 'create'),
		canUpdate: await checkPermission(user, 'SUBJECT_COMMISSION', 'update'),
		canDelete: await checkPermission(user, 'SUBJECT_COMMISSION', 'delete')
	};
};

export const actions: Actions = {
	toggleActive: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'SUBJECT_COMMISSION', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para modificar comisiones' });
		}

		const formData = await request.formData();
		const commissionId = formData.get('commissionId')?.toString();

		if (!commissionId) {
			return fail(400, { error: 'ID de comisión requerido' });
		}

		const commission = await prisma.subjectCommission.findUnique({
			where: { id: commissionId }
		});

		if (!commission) {
			return fail(404, { error: 'Comisión no encontrada' });
		}

		if (commission.active) {
			const activeEnrollments = await prisma.subjectEnrollment.count({
				where: {
					commissionId,
					status: 'ACTIVE'
				}
			});

			if (activeEnrollments > 0) {
				return fail(400, {
					error: 'No se puede desactivar una comisión con inscripciones activas'
				});
			}
		}

		await prisma.subjectCommission.update({
			where: { id: commissionId },
			data: { active: !commission.active }
		});

		return {
			success: true,
			message: commission.active ? 'Comisión desactivada' : 'Comisión activada'
		};
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canDelete = await checkPermission(user, 'SUBJECT_COMMISSION', 'delete');
		if (!canDelete) {
			return fail(403, { error: 'No tenés permiso para eliminar comisiones' });
		}

		const formData = await request.formData();
		const commissionId = formData.get('commissionId')?.toString();

		if (!commissionId) {
			return fail(400, { error: 'ID de comisión requerido' });
		}

		const enrollmentsCount = await prisma.subjectEnrollment.count({
			where: { commissionId }
		});

		if (enrollmentsCount > 0) {
			return fail(400, {
				error: 'No se puede eliminar una comisión con inscripciones asociadas'
			});
		}

		await prisma.subjectCommission.delete({
			where: { id: commissionId }
		});

		return {
			success: true,
			message: 'Comisión eliminada correctamente'
		};
	}
};
