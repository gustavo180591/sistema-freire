import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	await requirePermission(user, 'SUBJECT_COMMISSION', 'create');

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
		careers,
		subjects,
		studyPlans,
		terms,
		teachers,
		locations
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		await requirePermission(user, 'SUBJECT_COMMISSION', 'create');

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

		// Verificar duplicado: misma materia, carrera, plan, docente y período
		const duplicate = await prisma.subjectCommission.findFirst({
			where: {
				subjectId,
				careerId: careerId || null,
				studyPlanId: studyPlanId || null,
				teacherId: teacherId || null,
				academicTermId
			}
		});

		if (duplicate) {
			return fail(400, { error: 'Ya existe una comisión con estos datos' });
		}

		// Crear comisión
		const commission = await prisma.subjectCommission.create({
			data: {
				code,
				subjectId,
				careerId: careerId || null,
				studyPlanId: studyPlanId || null,
				academicTermId,
				teacherId: teacherId || null,
				locationId: locationId || null,
				maxCapacity: capacity,
				currentEnrolled: 0,
				schedule: schedule || null,
				observations: observations || null,
				active: true
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'CREATE',
			entityType: 'SubjectCommission',
			entityId: commission.id,
			description: `Creó comisión ${code} para ${subject.name}`
		});

		throw redirect(303, `/comisiones/${commission.id}`);
	}
};
