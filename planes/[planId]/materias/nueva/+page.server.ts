import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
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

	// Get all active subjects
	const subjects = await prisma.subject.findMany({
		where: {
			active: true
		},
		orderBy: [
			{ yearLevel: 'asc' },
			{ name: 'asc' }
		]
	});

	// Get subjects already in this plan
	const existingSubjectIds = await prisma.planSubject.findMany({
		where: {
			planId: params.planId
		},
		select: {
			subjectId: true
		}
	});

	const existingIds = new Set(existingSubjectIds.map((ps) => ps.subjectId));

	const availableSubjects = subjects.filter((subject) => !existingIds.has(subject.id));

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
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId') as string;
		const sortOrder = formData.get('sortOrder') as string;

		if (!subjectId || !sortOrder) {
			return {
				success: false,
				errors: {
					subjectId: !subjectId ? 'La materia es requerida' : '',
					sortOrder: !sortOrder ? 'El orden es requerido' : ''
				}
			};
		}

		const sortOrderNum = parseInt(sortOrder, 10);
		if (isNaN(sortOrderNum) || sortOrderNum < 1) {
			return {
				success: false,
				errors: {
					sortOrder: 'El orden debe ser un número positivo'
				}
			};
		}

		// Check if subject exists
		const subject = await prisma.subject.findUnique({
			where: {
				id: subjectId
			}
		});

		if (!subject) {
			return {
				success: false,
				errors: {
					subjectId: 'La materia no existe'
				}
			};
		}

		// Check if subject is already in the plan
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

			throw redirect(303, `/carreras/${params.id}/planes/${params.planId}`);
		} catch (e) {
			if (e instanceof Error) {
				console.error('Error adding subject to plan:', e);
				if (e.message.includes('redirect')) {
					throw e;
				}
				return {
					success: false,
					errors: {
						general: `Error: ${e.message}`
					}
				};
			}
			return {
				success: false,
				errors: {
					general: 'Error al agregar la materia. Intente nuevamente.'
				}
			};
		}
	}
};
