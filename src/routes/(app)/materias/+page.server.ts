import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { SubjectType, TrainingField } from '@prisma/client';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener parámetros de filtro
	const search = url.searchParams.get('search') || '';
	const yearLevel = url.searchParams.get('yearLevel') || '';
	const subjectType = url.searchParams.get('subjectType') || '';
	const trainingField = url.searchParams.get('trainingField') || '';
	const careerId = url.searchParams.get('careerId') || '';

	// Construir where clause
	const where: any = { active: true };

	// Base conditions
	const baseConditions: any[] = [{ active: true }];

	// Filtrar por localidades permitidas a través de carreras
	if (allowedLocationIds.length > 0) {
		baseConditions.push({
			careerSubjects: {
				some: {
					career: {
						locationId: { in: allowedLocationIds }
					}
				}
			}
		});
	}

	// Search condition
	if (search) {
		baseConditions.push({
			OR: [
				{ name: { contains: search, mode: 'insensitive' } },
				{ code: { contains: search, mode: 'insensitive' } }
			]
		});
	}

	// Other filters
	if (yearLevel) {
		baseConditions.push({ yearLevel: parseInt(yearLevel) });
	}

	if (subjectType) {
		baseConditions.push({ subjectType: subjectType as SubjectType });
	}

	if (trainingField) {
		baseConditions.push({ trainingField: trainingField as TrainingField });
	}

	if (careerId) {
		baseConditions.push({
			careerSubjects: {
				some: { careerId }
			}
		});
	}

	// Apply all conditions with AND
	if (baseConditions.length > 1) {
		where.AND = baseConditions;
	}

	const [subjects, careers] = await Promise.all([
		prisma.subject.findMany({
			where,
			include: {
				careerSubjects: {
					include: { career: true }
				},
				correlatives: {
					include: { requiredSubject: true }
				}
			},
			orderBy: [
				{ yearLevel: 'asc' },
				{ name: 'asc' }
			]
		}),
		prisma.career.findMany({
			where: { 
				active: true,
				locationId: { in: allowedLocationIds }
			},
			select: { id: true, name: true, code: true }
		})
	]);

	const normalizedSubjects = subjects.map((subject) => ({
		id: subject.id,
		code: subject.code,
		name: subject.name,
		subjectType: subject.subjectType,
		trainingField: subject.trainingField,
		accreditationMode: subject.accreditationMode,
		yearLevel: subject.yearLevel,
		hoursPerWeek: subject.hoursPerWeek,
		isElective: subject.isElective,
		isRemedial: subject.isRemedial,
		active: subject.active,
		careers: subject.careerSubjects.map(cs => cs.career),
		correlativesCount: subject.correlatives.length,
		correlativesRegular: subject.correlatives
			.filter(c => c.correlativeType === 'REGULAR')
			.map(c => c.requiredSubject.name),
		correlativesAprobadoCursar: subject.correlatives
			.filter(c => c.correlativeType === 'APROBADO')
			.map(c => c.requiredSubject.name),
		correlativesAprobadoAprobar: subject.correlatives
			.filter(c => c.correlativeType === 'APROBADO_APROBAR')
			.map(c => c.requiredSubject.name)
	}));

	return {
		subjects: normalizedSubjects,
		careers,
		filters: {
			search,
			yearLevel,
			subjectType,
			trainingField,
			careerId
		},
		metrics: {
			totalSubjects: normalizedSubjects.length,
			totalWithCorrelatives: normalizedSubjects.filter(s => s.correlativesCount > 0).length
		},
		// Opciones para filtros
		subjectTypes: Object.values(SubjectType),
		trainingFields: Object.values(TrainingField),
		yearLevels: [1, 2, 3, 4]
	};
};