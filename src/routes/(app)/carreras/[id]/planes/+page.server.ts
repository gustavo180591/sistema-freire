import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const career = await prisma.career.findUnique({
		where: {
			id: params.id
		},
		include: {
			studyPlans: {
				orderBy: {
					version: 'desc'
				}
			},
			careerSubjects: {
				where: {
					isMandatory: true
				},
				include: {
					subject: {
						include: {
							correlatives: {
								where: {
									OR: [{ careerId: null }, { careerId: params.id }]
								},
								include: {
									requiredSubject: {
										select: {
											id: true,
											code: true,
											name: true
										}
									}
								}
							}
						}
					}
				},
				orderBy: {
					yearLevel: 'asc'
				}
			}
		}
	});

	if (!career) {
		throw error(404, 'Carrera no encontrada');
	}

	// Agrupar materias por año y convertir Decimals a números
	const subjectsByYear: Record<number, any[]> = {};

	career.careerSubjects.forEach((cs) => {
		const year = cs.yearLevel;
		if (!subjectsByYear[year]) {
			subjectsByYear[year] = [];
		}
		// Convertir Decimals a números
		subjectsByYear[year].push({
			...cs,
			subject: {
				...cs.subject,
				approvalThreshold: cs.subject.approvalThreshold
					? Number(cs.subject.approvalThreshold)
					: null,
				promotionThreshold: cs.subject.promotionThreshold
					? Number(cs.subject.promotionThreshold)
					: null
			}
		});
	});

	// Calcular totales
	const totalSubjects = career.careerSubjects.length;
	const totalCorrelatives = career.careerSubjects.reduce(
		(acc, cs) => acc + cs.subject.correlatives.length,
		0
	);

	return {
		career: {
			id: career.id,
			code: career.code,
			name: career.name,
			trainingField: career.trainingField,
			resolution: career.resolution,
			durationYears: career.durationYears,
			active: career.active
		},
		subjectsByYear,
		totalSubjects,
		totalCorrelatives,
		plans: career.studyPlans
	};
};

export const actions: Actions = {
	deletePlan: async ({ request, params }) => {
		const data = await request.formData();
		const planId = data.get('planId')?.toString();

		if (!planId) {
			return fail(400, { error: 'ID de plan no proporcionado' });
		}

		// Verificar que el plan existe y pertenece a la carrera
		const plan = await prisma.studyPlan.findUnique({
			where: { id: planId },
			include: {
				career: true
			}
		});

		if (!plan) {
			return fail(404, { error: 'Plan no encontrado' });
		}

		if (plan.careerId !== params.id) {
			return fail(403, { error: 'El plan no pertenece a esta carrera' });
		}

		// Eliminar el plan (cascade eliminará los PlanSubjects relacionados)
		await prisma.studyPlan.delete({
			where: { id: planId }
		});

		return { success: true, message: 'Plan eliminado correctamente' };
	}
};
