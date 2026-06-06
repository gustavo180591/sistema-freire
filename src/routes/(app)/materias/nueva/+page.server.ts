import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
	const careers = await prisma.career.findMany({
		where: { active: true },
		select: { id: true, code: true, name: true },
		orderBy: { name: 'asc' }
	});

	return { careers };
};

export const actions: Actions = {
	default: async ({ request }) => {
		try {
			const formData = await request.formData();
			const code = formData.get('code') as string;
			const name = formData.get('name') as string;
			const subjectType = formData.get('subjectType') as string;
			const trainingField = formData.get('trainingField') as string;
			const yearLevel = formData.get('yearLevel') as string;
			const accreditationMode = formData.get('accreditationMode') as string;
			const hoursPerWeek = formData.get('hoursPerWeek') as string;
			const description = formData.get('description') as string;
			const approvalThreshold = formData.get('approvalThreshold') as string;
			const promotionThreshold = formData.get('promotionThreshold') as string;
			const isAnnual = formData.get('isAnnual') === 'true';
			const isElective = formData.get('isElective') === 'true';
			const isRemedial = formData.get('isRemedial') === 'true';
			const active = formData.get('active') === 'true';
			const careerIds = formData.getAll('careerIds') as string[];

			if (!code || !name || !subjectType || !trainingField || !yearLevel || !accreditationMode) {
				return {
					success: false,
					errors: {
						code: !code ? 'El código es requerido' : '',
						name: !name ? 'El nombre es requerido' : '',
						subjectType: !subjectType ? 'El tipo es requerido' : '',
						trainingField: !trainingField ? 'El campo es requerido' : '',
						yearLevel: !yearLevel ? 'El año es requerido' : '',
						accreditationMode: !accreditationMode ? 'La modalidad es requerida' : ''
					}
				};
			}

			const yearLevelNum = parseInt(yearLevel, 10);
			if (isNaN(yearLevelNum) || yearLevelNum < 1 || yearLevelNum > 10) {
				return {
					success: false,
					errors: {
						yearLevel: 'El año debe ser un número entre 1 y 10'
					}
				};
			}

			const hoursPerWeekNum = hoursPerWeek ? parseInt(hoursPerWeek, 10) : null;
			if (hoursPerWeekNum !== null && (isNaN(hoursPerWeekNum) || hoursPerWeekNum < 0)) {
				return {
					success: false,
					errors: {
						hoursPerWeek: 'Las horas deben ser un número positivo'
					}
				};
			}

			const approvalThresholdNum = approvalThreshold ? parseFloat(approvalThreshold) : 6;
			const promotionThresholdNum = promotionThreshold ? parseFloat(promotionThreshold) : 7;

			if (isNaN(approvalThresholdNum) || approvalThresholdNum < 1 || approvalThresholdNum > 10) {
				return {
					success: false,
					errors: {
						approvalThreshold: 'El umbral debe estar entre 1 y 10'
					}
				};
			}

			if (isNaN(promotionThresholdNum) || promotionThresholdNum < 1 || promotionThresholdNum > 10) {
				return {
					success: false,
					errors: {
						promotionThreshold: 'El umbral debe estar entre 1 y 10'
					}
				};
			}

			const existingSubject = await prisma.subject.findUnique({
				where: { code }
			});

			if (existingSubject) {
				return {
					success: false,
					errors: {
						code: `Ya existe una materia con el código "${code}"`
					}
				};
			}

			await prisma.$transaction(async (tx) => {
				const subject = await tx.subject.create({
					data: {
						code,
						name,
						subjectType: subjectType as any,
						trainingField: trainingField as any,
						yearLevel: yearLevelNum,
						accreditationMode: accreditationMode as any,
						hoursPerWeek: hoursPerWeekNum,
						description: description || null,
						approvalThreshold: approvalThresholdNum,
						promotionThreshold: promotionThresholdNum,
						isAnnual,
						isElective,
						isRemedial,
						active
					}
				});

				// Associate with careers if provided
				if (careerIds && careerIds.length > 0) {
					for (const careerId of careerIds) {
						await tx.careerSubject.create({
							data: {
								careerId,
								subjectId: subject.id,
								yearLevel: yearLevelNum,
								isMandatory: true
							}
						});
					}
				}
			});

			throw redirect(303, '/materias');
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
				throw e;
			}
			if (e instanceof Error) {
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
					general: 'Error al crear la materia. Intente nuevamente.'
				}
			};
		}
	}
};
