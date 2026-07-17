import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { SubjectType, TrainingField, AccreditationMode } from '@prisma/client';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	// Obtener parámetros de filtro
	const search = url.searchParams.get('search') || '';
	const yearLevel = url.searchParams.get('yearLevel') || '';
	const subjectType = url.searchParams.get('subjectType') || '';
	const accreditationMode = url.searchParams.get('accreditationMode') || '';
	const active = url.searchParams.get('active') || '';

	// Construir where clause
	const where: {
		OR?: Array<
			| { name: { contains: string; mode: 'insensitive' } }
			| { code: { contains: string; mode: 'insensitive' } }
		>;
		yearLevel?: number;
		subjectType?: SubjectType;
		accreditationMode?: AccreditationMode;
		active?: boolean;
	} = {};

	// Search condition
	if (search) {
		where.OR = [
			{ name: { contains: search, mode: 'insensitive' } },
			{ code: { contains: search, mode: 'insensitive' } }
		];
	}

	// Other filters
	if (yearLevel) {
		where.yearLevel = parseInt(yearLevel);
	}

	if (subjectType) {
		where.subjectType = subjectType as SubjectType;
	}

	if (accreditationMode) {
		where.accreditationMode = accreditationMode as AccreditationMode;
	}

	if (active) {
		where.active = active === 'true';
	}

	const subjectsFromDb = await prisma.subject.findMany({
		where,
		orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }]
	});

	const subjects = subjectsFromDb.map((subject) => ({
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
		createdAt: subject.createdAt.toISOString(),
		updatedAt: subject.updatedAt.toISOString()
	}));

	return {
		subjects,
		filters: {
			search,
			yearLevel,
			subjectType,
			accreditationMode,
			active
		},
		// Opciones para filtros
		subjectTypes: Object.values(SubjectType),
		accreditationModes: Object.values(AccreditationMode),
		yearLevels: [1, 2, 3, 4, 5, 6, 7]
	};
};

export const actions: Actions = {
	deactivate: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID de materia requerido' });
		}

		try {
			await prisma.subject.update({
				where: { id },
				data: { active: false }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al desactivar la materia' });
		}
	},

	activate: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID de materia requerido' });
		}

		try {
			await prisma.subject.update({
				where: { id },
				data: { active: true }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al activar la materia' });
		}
	}
};
