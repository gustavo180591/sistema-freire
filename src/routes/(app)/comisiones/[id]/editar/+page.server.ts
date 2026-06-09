import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	await requirePermission(user, 'SUBJECT_COMMISSION', 'update');

	// Obtener comisión
	const commission = await prisma.subjectCommission.findUnique({
		where: { id: params.id },
		include: {
			subject: true,
			career: true,
			studyPlan: true,
			teacher: true,
			location: true,
			academicTerm: true
		}
	});

	if (!commission) {
		throw error(404, 'Comisión no encontrada');
	}

	// Obtener datos para el formulario
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
		commission: {
			id: commission.id,
			code: commission.code,
			subjectId: commission.subjectId,
			careerId: commission.careerId,
			studyPlanId: commission.studyPlanId,
			academicTermId: commission.academicTermId,
			teacherId: commission.teacherId,
			locationId: commission.locationId,
			maxCapacity: commission.maxCapacity,
			schedule: commission.schedule,
			observations: commission.observations,
			active: commission.active
		},
		careers,
		subjects,
		studyPlans,
		terms,
		teachers,
		locations
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		await requirePermission(user, 'SUBJECT_COMMISSION', 'update');

		const formData = await request.formData();
		const code = formData.get('code')?.toString();
		const subjectId = formData.get('subjectId')?.toString();
		const careerId = formData.get('careerId')?.toString();
		const studyPlanId = formData.get('studyPlanId')?.toString();
		const academicTermId = formData.get('academicTermId')?.toString();
		const teacherId = formData.get('teacherId')?.toString();
		const locationId = formData.get('locationId')?.toString();
		const maxCapacity = formData.get('maxCapacity')?.toString();
		const schedule = formData.get('schedule')?.toString();
		const observations = formData.get('observations')?.toString();
		const active = formData.get('active')?.toString() === 'true';

		// Validaciones básicas
		if (!code || !subjectId || !academicTermId) {
			return fail(400, { error: 'Código, materia y período son requeridos' });
		}

		if (!maxCapacity || isNaN(parseInt(maxCapacity))) {
			return fail(400, { error: 'Cupo máximo inválido' });
		}

		const capacity = parseInt(maxCapacity);
		if (capacity <= 0) {
			return fail(400, { error: 'El cupo debe ser mayor a 0' });
		}

		// Obtener comisión actual
		const currentCommission = await prisma.subjectCommission.findUnique({
			where: { id: params.id },
			include: { subject: true }
		});

		if (!currentCommission) {
			return fail(404, { error: 'Comisión no encontrada' });
		}

		// Verificar que el nuevo cupo no sea menor que los inscriptos actuales
		if (capacity < currentCommission.currentEnrolled) {
			return fail(400, {
				error: `El cupo no puede ser menor a los inscriptos actuales (${currentCommission.currentEnrolled})`
			});
		}

		// Verificar que la materia existe
		const subject = await prisma.subject.findUnique({
			where: { id: subjectId }
		});

		if (!subject) {
			return fail(400, { error: 'Materia no encontrada' });
		}

		// Verificar que el período existe
		const term = await prisma.academicTerm.findUnique({
			where: { id: academicTermId }
		});

		if (!term) {
			return fail(400, { error: 'Período lectivo no encontrado' });
		}

		// Si se especifica carrera, verificar que existe
		if (careerId) {
			const career = await prisma.career.findUnique({
				where: { id: careerId }
			});

			if (!career) {
				return fail(400, { error: 'Carrera no encontrada' });
			}
		}

		// Si se especifica plan, verificar que existe y pertenece a la carrera
		if (studyPlanId) {
			const studyPlan = await prisma.studyPlan.findUnique({
				where: { id: studyPlanId },
				include: { career: true }
			});

			if (!studyPlan) {
				return fail(400, { error: 'Plan de estudio no encontrado' });
			}

			if (careerId && studyPlan.careerId !== careerId) {
				return fail(400, { error: 'El plan no pertenece a la carrera seleccionada' });
			}

			// Verificar que la materia está en el plan
			const subjectInPlan = await prisma.planSubject.findFirst({
				where: {
					planId: studyPlanId,
					subjectId
				}
			});

			if (!subjectInPlan) {
				return fail(400, { error: 'La materia no está en el plan de estudio seleccionado' });
			}
		}

		// Si se especifica docente, verificar que existe
		if (teacherId) {
			const teacher = await prisma.teacher.findUnique({
				where: { id: teacherId }
			});

			if (!teacher) {
				return fail(400, { error: 'Docente no encontrado' });
			}
		}

		// Si se especifica localidad, verificar que existe
		if (locationId) {
			const location = await prisma.location.findUnique({
				where: { id: locationId }
			});

			if (!location) {
				return fail(400, { error: 'Localidad no encontrada' });
			}
		}

		// Verificar duplicado (excluyendo la comisión actual)
		const duplicate = await prisma.subjectCommission.findFirst({
			where: {
				subjectId,
				careerId: careerId || null,
				studyPlanId: studyPlanId || null,
				teacherId: teacherId || null,
				academicTermId,
				id: { not: params.id }
			}
		});

		if (duplicate) {
			return fail(400, { error: 'Ya existe otra comisión con estos datos' });
		}

		// Actualizar comisión
		await prisma.subjectCommission.update({
			where: { id: params.id },
			data: {
				code,
				subjectId,
				careerId: careerId || null,
				studyPlanId: studyPlanId || null,
				academicTermId,
				teacherId: teacherId || null,
				locationId: locationId || null,
				maxCapacity: capacity,
				schedule: schedule || null,
				observations: observations || null,
				active
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'SubjectCommission',
			entityId: params.id,
			description: `Editó comisión ${code} para ${subject.name}`
		});

		throw redirect(303, `/comisiones/${params.id}`);
	}
};
