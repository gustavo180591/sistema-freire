import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

function decimalToNumber(value: { toString(): string } | null): number | null {
	if (value === null) return null;
	return Number(value.toString());
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	requirePermission(user, 'CAREER', 'update');

	const studyPlan = await prisma.studyPlan.findUnique({
		where: {
			id: params.planId
		},
		include: {
			career: {
				select: {
					id: true,
					code: true,
					name: true
				}
			}
		}
	});

	if (!studyPlan) {
		throw error(404, 'Plan de estudio no encontrado');
	}

	if (studyPlan.careerId !== params.id) {
		throw error(404, 'Plan de estudio no pertenece a esta carrera');
	}

	const subjects = await prisma.subject.findMany({
		where: {
			active: true
		},
		orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }]
	});

	const existingSubjectIds = await prisma.planSubject.findMany({
		where: {
			planId: params.planId
		},
		select: {
			subjectId: true
		}
	});

	const existingIds = new Set(existingSubjectIds.map((planSubject) => planSubject.subjectId));

	const availableSubjects = subjects
		.filter((subject) => !existingIds.has(subject.id))
		.map((subject) => ({
			...subject,
			approvalThreshold: decimalToNumber(subject.approvalThreshold),
			promotionThreshold: decimalToNumber(subject.promotionThreshold),
			createdAt: subject.createdAt.toISOString(),
			updatedAt: subject.updatedAt.toISOString()
		}));

	return {
		plan: {
			id: studyPlan.id,
			name: studyPlan.name,
			version: studyPlan.version,
			durationYears: studyPlan.durationYears,
			career: studyPlan.career
		},
		subjects: availableSubjects
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'CAREER', 'update');

		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString() ?? '';
		const sortOrder = formData.get('sortOrder')?.toString() ?? '';

		if (!subjectId || !sortOrder) {
			return {
				success: false,
				errors: {
					subjectId: !subjectId ? 'La materia es requerida' : '',
					sortOrder: !sortOrder ? 'El orden es requerido' : ''
				}
			};
		}

		const sortOrderNum = Number.parseInt(sortOrder, 10);

		if (Number.isNaN(sortOrderNum) || sortOrderNum < 1) {
			return {
				success: false,
				errors: {
					sortOrder: 'El orden debe ser un número positivo'
				}
			};
		}

		const studyPlan = await prisma.studyPlan.findUnique({
			where: {
				id: params.planId
			},
			select: {
				id: true,
				careerId: true
			}
		});

		if (!studyPlan || studyPlan.careerId !== params.id) {
			return {
				success: false,
				errors: {
					general: 'El plan de estudio no pertenece a esta carrera'
				}
			};
		}

		const subject = await prisma.subject.findUnique({
			where: {
				id: subjectId
			},
			select: {
				id: true,
				active: true
			}
		});

		if (!subject || !subject.active) {
			return {
				success: false,
				errors: {
					subjectId: 'La materia no existe o no está activa'
				}
			};
		}

		const existingRelation = await prisma.planSubject.findUnique({
			where: {
				planId_subjectId: {
					planId: params.planId,
					subjectId
				}
			}
		});

		if (existingRelation) {
			return {
				success: false,
				errors: {
					subjectId: 'Esta materia ya está en el plan'
				}
			};
		}

		try {
			await prisma.planSubject.create({
				data: {
					planId: params.planId,
					subjectId,
					sortOrder: sortOrderNum
				}
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Error desconocido';

			return {
				success: false,
				errors: {
					general: `Error al agregar la materia: ${message}`
				}
			};
		}

		throw redirect(303, `/carreras/${params.id}/planes/${params.planId}`);
	}
};
