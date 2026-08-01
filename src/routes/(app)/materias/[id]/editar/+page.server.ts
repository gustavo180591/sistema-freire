import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { SubjectType, TrainingField, AccreditationMode } from '@prisma/client';

export const load: PageServerLoad = async ({ params }) => {
	const subject = await prisma.subject.findUnique({
		where: { id: params.id },
		include: {
			careerSubjects: {
				select: {
					careerId: true
				}
			}
		}
	});

	if (!subject) {
		throw error(404, 'Materia no encontrada');
	}

	const careers = await prisma.career.findMany({
		where: {
			active: true
		},
		orderBy: {
			name: 'asc'
		},
		select: {
			id: true,
			code: true,
			name: true,
			durationYears: true
		}
	});

	const normalizedSubject = {
		id: subject.id,
		code: subject.code,
		name: subject.name,
		subjectType: subject.subjectType,
		trainingField: subject.trainingField,
		yearLevel: subject.yearLevel,
		accreditationMode: subject.accreditationMode,
		approvalThreshold: subject.approvalThreshold.toString(),
		promotionThreshold: subject.promotionThreshold.toString(),
		isAnnual: subject.isAnnual,
		hoursPerWeek: subject.hoursPerWeek,
		isElective: subject.isElective,
		isRemedial: subject.isRemedial,
		description: subject.description,
		active: subject.active,
		careerIds: subject.careerSubjects.map((careerSubject) => careerSubject.careerId),
		createdAt: subject.createdAt.toISOString(),
		updatedAt: subject.updatedAt.toISOString()
	};

	return {
		subject: normalizedSubject,
		subjectTypes: Object.values(SubjectType),
		trainingFields: Object.values(TrainingField),
		accreditationModes: Object.values(AccreditationMode),
		careers
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		try {
			const formData = await request.formData();

			const code = formData.get('code')?.toString().trim();
			const name = formData.get('name')?.toString().trim();
			const subjectType = formData.get('subjectType')?.toString();
			const trainingField = formData.get('trainingField')?.toString();
			const yearLevel = formData.get('yearLevel')?.toString();
			const accreditationMode = formData.get('accreditationMode')?.toString();
			const hoursPerWeek = formData.get('hoursPerWeek')?.toString();
			const description = formData.get('description')?.toString().trim();
			const approvalThreshold = formData.get('approvalThreshold')?.toString();
			const promotionThreshold = formData.get('promotionThreshold')?.toString();
			const isAnnual = formData.get('isAnnual') === 'true';
			const isElective = formData.get('isElective') === 'true';
			const isRemedial = formData.get('isRemedial') === 'true';
			const active = formData.get('active') === 'true';

			const careerIds = Array.from(
				new Set(
					formData
						.getAll('careerIds')
						.map((value) => value.toString().trim())
						.filter((value) => value.length > 0)
				)
			);

			if (
				!code ||
				!name ||
				!subjectType ||
				!trainingField ||
				!yearLevel ||
				!accreditationMode ||
				careerIds.length === 0
			) {
				return {
					success: false,
					errors: {
						code: !code ? 'El código es requerido' : '',
						name: !name ? 'El nombre es requerido' : '',
						subjectType: !subjectType ? 'El tipo es requerido' : '',
						trainingField: !trainingField ? 'El campo es requerido' : '',
						yearLevel: !yearLevel ? 'El año es requerido' : '',
						accreditationMode: !accreditationMode ? 'La modalidad es requerida' : '',
						careerIds: careerIds.length === 0 ? 'Seleccioná al menos una carrera' : ''
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
			const promotionThresholdNum = promotionThreshold ? parseFloat(promotionThreshold) : 8;

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

			const validSubjectTypes = Object.values(SubjectType).map(String);
			const validTrainingFields = Object.values(TrainingField).map(String);
			const validAccreditationModes = Object.values(AccreditationMode).map(String);

			if (!validSubjectTypes.includes(subjectType)) {
				return {
					success: false,
					errors: {
						subjectType: 'El tipo de materia no es válido'
					}
				};
			}

			if (!validTrainingFields.includes(trainingField)) {
				return {
					success: false,
					errors: {
						trainingField: 'El campo de formación no es válido'
					}
				};
			}

			if (!validAccreditationModes.includes(accreditationMode)) {
				return {
					success: false,
					errors: {
						accreditationMode: 'La modalidad de acreditación no es válida'
					}
				};
			}

			const existingSubject = await prisma.subject.findUnique({
				where: { code }
			});

			if (existingSubject && existingSubject.id !== params.id) {
				return {
					success: false,
					errors: {
						code: `Ya existe una materia con el código "${code}"`
					}
				};
			}

			const selectedCareers = await prisma.career.findMany({
				where: {
					id: {
						in: careerIds
					},
					active: true
				},
				select: {
					id: true
				}
			});

			if (selectedCareers.length !== careerIds.length) {
				return {
					success: false,
					errors: {
						careerIds: 'Una o más carreras seleccionadas no existen o no están activas'
					}
				};
			}

			await prisma.$transaction(async (tx) => {
				await tx.subject.update({
					where: { id: params.id },
					data: {
						code,
						name,
						subjectType: subjectType as SubjectType,
						trainingField: trainingField as TrainingField,
						yearLevel: yearLevelNum,
						accreditationMode: accreditationMode as AccreditationMode,
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

				await tx.careerSubject.deleteMany({
					where: {
						subjectId: params.id,
						careerId: {
							notIn: careerIds
						}
					}
				});

				await tx.careerSubject.updateMany({
					where: {
						subjectId: params.id,
						careerId: {
							in: careerIds
						}
					},
					data: {
						yearLevel: yearLevelNum,
						isMandatory: true
					}
				});

				const currentCareerSubjects = await tx.careerSubject.findMany({
					where: {
						subjectId: params.id
					},
					select: {
						careerId: true
					}
				});

				const currentCareerIds = new Set(
					currentCareerSubjects.map((careerSubject) => careerSubject.careerId)
				);

				const missingCareerSubjects = selectedCareers
					.filter((career) => !currentCareerIds.has(career.id))
					.map((career) => ({
						careerId: career.id,
						subjectId: params.id,
						yearLevel: yearLevelNum,
						isMandatory: true
					}));

				if (missingCareerSubjects.length > 0) {
					await tx.careerSubject.createMany({
						data: missingCareerSubjects,
						skipDuplicates: true
					});
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
					general: 'Error al actualizar la materia. Intente nuevamente.'
				}
			};
		}
	}
};
