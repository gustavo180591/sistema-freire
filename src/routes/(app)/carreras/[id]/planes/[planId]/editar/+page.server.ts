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

	return {
		plan: {
			id: studyPlan.id,
			name: studyPlan.name,
			version: studyPlan.version,
			durationYears: studyPlan.durationYears,
			active: studyPlan.active,
			career: studyPlan.career
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const version = formData.get('version') as string;
		const durationYears = formData.get('durationYears') as string;
		const active = formData.get('active') === 'true';

		if (!name || !version || !durationYears) {
			return {
				success: false,
				errors: {
					name: !name ? 'El nombre es requerido' : '',
					version: !version ? 'La versión es requerida' : '',
					durationYears: !durationYears ? 'La duración es requerida' : ''
				}
			};
		}

		const durationYearsNum = parseInt(durationYears, 10);
		if (isNaN(durationYearsNum) || durationYearsNum < 1 || durationYearsNum > 10) {
			return {
				success: false,
				errors: {
					durationYears: 'La duración debe ser un número entre 1 y 10 años'
				}
			};
		}

		// Check if version already exists for this career (excluding current plan)
		const existingPlan = await prisma.studyPlan.findUnique({
			where: {
				careerId_version: {
					careerId: params.id,
					version
				}
			}
		});

		if (existingPlan && existingPlan.id !== params.planId) {
			return {
				success: false,
				errors: {
					version: `Ya existe un plan con la versión "${version}" para esta carrera.`
				}
			};
		}

		try {
			await prisma.studyPlan.update({
				where: {
					id: params.planId
				},
				data: {
					name,
					version,
					durationYears: durationYearsNum,
					active
				}
			});

			throw redirect(303, `/carreras/${params.id}/planes/${params.planId}`);
		} catch (e) {
			if (e instanceof Error) {
				console.error('Error updating study plan:', e);
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
					general: 'Error al actualizar el plan de estudio. Intente nuevamente.'
				}
			};
		}
	}
};
