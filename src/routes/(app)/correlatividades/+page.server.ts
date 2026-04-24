import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const [subjects, careers] = await Promise.all([
		prisma.subject.findMany({
			where: { active: true },
			include: {
				correlatives: {
					include: { requiredSubject: true }
				},
				careerSubjects: {
					include: { career: true }
				}
			},
			orderBy: [
				{ yearLevel: 'asc' },
				{ name: 'asc' }
			]
		}),
		prisma.career.findMany({
			where: { active: true },
			select: { id: true, name: true, code: true, durationYears: true }
		})
	]);

	const normalizedSubjects = subjects.map((subject) => ({
		id: subject.id,
		code: subject.code,
		name: subject.name,
		yearLevel: subject.yearLevel,
		accreditationMode: subject.accreditationMode,
		careers: subject.careerSubjects.map(cs => cs.career),
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
		yearLevels: [1, 2, 3, 4]
	};
};

export const actions: Actions = {
	updateAccreditationMode: async ({ request }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId') as string;
		const accreditationMode = formData.get('accreditationMode') as string;

		if (!subjectId || !accreditationMode) {
			return fail(400, { error: 'Faltan datos requeridos' });
		}

		try {
			await prisma.subject.update({
				where: { id: subjectId },
				data: { accreditationMode: accreditationMode as any }
			});
			return { success: true };
		} catch (error) {
			return fail(500, { error: 'Error al actualizar modalidad de acreditación' });
		}
	},
	addCorrelative: async ({ request }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId') as string;
		const requiredSubjectId = formData.get('requiredSubjectId') as string;
		const correlativeType = formData.get('correlativeType') as string;

		if (!subjectId || !requiredSubjectId || !correlativeType) {
			return fail(400, { error: 'Faltan datos requeridos' });
		}

		if (requiredSubjectId === '') {
			return fail(400, { error: 'Debes seleccionar una materia requerida' });
		}

		try {
			await prisma.subjectCorrelative.create({
				data: {
					subjectId,
					requiredSubjectId,
					correlativeType: correlativeType as any
				}
			});
			return { success: true };
		} catch (error: any) {
			console.error('Error al agregar correlativa:', error);
			if (error.code === 'P2002') {
				return fail(400, { error: 'Esta correlativa ya existe' });
			}
			return fail(500, { error: `Error al agregar correlativa: ${error.message}` });
		}
	}
};
