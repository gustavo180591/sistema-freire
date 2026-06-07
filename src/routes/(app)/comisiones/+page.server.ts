import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { checkPermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	// Verificar permiso de lectura
	const canRead = await checkPermission(user, 'SUBJECT_COMMISSION', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver comisiones');
	}

	// Obtener filtros de la URL
	const careerFilter = url.searchParams.get('career');
	const subjectFilter = url.searchParams.get('subject');
	const studyPlanFilter = url.searchParams.get('studyPlan');
	const termFilter = url.searchParams.get('term');
	const teacherFilter = url.searchParams.get('teacher');
	const locationFilter = url.searchParams.get('location');
	const activeFilter = url.searchParams.get('active');

	// Construir where clause
	const where: any = {};
	if (careerFilter) where.careerId = careerFilter;
	if (subjectFilter) where.subjectId = subjectFilter;
	if (studyPlanFilter) where.studyPlanId = studyPlanFilter;
	if (termFilter) where.academicTermId = termFilter;
	if (teacherFilter) where.teacherId = teacherFilter;
	if (locationFilter) where.locationId = locationFilter;
	if (activeFilter !== null && activeFilter !== '') where.active = activeFilter === 'true';

	// Obtener comisiones
	const commissions = await prisma.subjectCommission.findMany({
		where,
		include: {
			subject: true,
			career: true,
			studyPlan: true,
			teacher: true,
			location: true,
			academicTerm: true,
			_count: {
				select: { enrollments: true }
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 100
	});

	// Obtener datos para filtros
	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	const subjects = await prisma.subject.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	const studyPlans = await prisma.studyPlan.findMany({
		where: { active: true },
		include: { career: true },
		orderBy: { version: 'desc' }
	});

	const terms = await prisma.academicTerm.findMany({
		where: { active: true },
		orderBy: { startDate: 'desc' }
	});

	const teachers = await prisma.teacher.findMany({
		where: { status: 'ACTIVE' },
		orderBy: { lastName: 'asc' }
	});

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	return {
		commissions: commissions.map(c => ({
			id: c.id,
			code: c.code,
			subject: {
				id: c.subject.id,
				name: c.subject.name,
				code: c.subject.code,
				yearLevel: c.subject.yearLevel
			},
			career: c.career ? {
				id: c.career.id,
				name: c.career.name
			} : null,
			studyPlan: c.studyPlan ? {
				id: c.studyPlan.id,
				name: c.studyPlan.name,
				version: c.studyPlan.version
			} : null,
			teacher: c.teacher ? {
				id: c.teacher.id,
				name: `${c.teacher.firstName} ${c.teacher.lastName}`
			} : null,
			location: c.location ? {
				id: c.location.id,
				name: c.location.name
			} : null,
			academicTerm: c.academicTerm ? {
				id: c.academicTerm.id,
				name: c.academicTerm.name,
				year: c.academicTerm.year
			} : null,
			maxCapacity: c.maxCapacity,
			currentEnrolled: c.currentEnrolled,
			enrollmentsCount: c._count.enrollments,
			schedule: c.schedule,
			active: c.active,
			observations: c.observations,
			createdAt: c.createdAt
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
	// Activar/Desactivar comisión
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

		// Obtener comisión
		const commission = await prisma.subjectCommission.findUnique({
			where: { id: commissionId }
		});

		if (!commission) {
			return fail(404, { error: 'Comisión no encontrada' });
		}

		// Verificar si tiene inscripciones activas antes de desactivar
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

		// Toggle estado
		await prisma.subjectCommission.update({
			where: { id: commissionId },
			data: { active: !commission.active }
		});

		return {
			success: true,
			message: commission.active ? 'Comisión desactivada' : 'Comisión activada'
		};
	},

	// Eliminar comisión
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

		// Verificar si tiene inscripciones
		const enrollmentsCount = await prisma.subjectEnrollment.count({
			where: { commissionId }
		});

		if (enrollmentsCount > 0) {
			return fail(400, { 
				error: 'No se puede eliminar una comisión con inscripciones asociadas' 
			});
		}

		// Eliminar comisión
		await prisma.subjectCommission.delete({
			where: { id: commissionId }
		});

		return {
			success: true,
			message: 'Comisión eliminada correctamente'
		};
	}
};
