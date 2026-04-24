import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { SubjectType, TrainingField } from '@prisma/client';

export const load: PageServerLoad = async ({ url }) => {
	// Obtener parámetros de filtro
	const search = url.searchParams.get('search') || '';
	const yearLevel = url.searchParams.get('yearLevel') || '';
	const subjectType = url.searchParams.get('subjectType') || '';
	const trainingField = url.searchParams.get('trainingField') || '';
	const careerId = url.searchParams.get('careerId') || '';

	// Construir where clause
	const where: any = { active: true };

	if (search) {
		where.OR = [
			{ name: { contains: search, mode: 'insensitive' } },
			{ code: { contains: search, mode: 'insensitive' } }
		];
	}

	if (yearLevel) {
		where.yearLevel = parseInt(yearLevel);
	}

	if (subjectType) {
		where.subjectType = subjectType as SubjectType;
	}

	if (trainingField) {
		where.trainingField = trainingField as TrainingField;
	}

	if (careerId) {
		where.careerSubjects = {
			some: { careerId }
		};
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
				},
				_count: {
					select: { commissions: true }
				}
			},
			orderBy: [
				{ yearLevel: 'asc' },
				{ name: 'asc' }
			]
		}),
		prisma.career.findMany({
			where: { active: true },
			select: { id: true, name: true, code: true }
		})
	]);

	const normalizedSubjects = subjects.map((subject) => ({
		id: subject.id,
		code: subject.code,
		name: subject.name,
		subjectType: subject.subjectType,
		trainingField: subject.trainingField,
		yearLevel: subject.yearLevel,
		hoursPerWeek: subject.hoursPerWeek,
		isElective: subject.isElective,
		isRemedial: subject.isRemedial,
		active: subject.active,
		careers: subject.careerSubjects.map(cs => cs.career),
		correlativesCount: subject.correlatives.length,
		commissionsCount: subject._count.commissions
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
			totalCommissions: normalizedSubjects.reduce((acc, s) => acc + s.commissionsCount, 0),
			totalWithCorrelatives: normalizedSubjects.filter(s => s.correlativesCount > 0).length
		},
		// Opciones para filtros
		subjectTypes: Object.values(SubjectType),
		trainingFields: Object.values(TrainingField),
		yearLevels: [1, 2, 3, 4]
	};
};