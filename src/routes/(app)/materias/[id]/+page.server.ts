import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const subject = await prisma.subject.findUnique({
		where: { id: params.id }
	});

	if (!subject) {
		throw error(404, 'Materia no encontrada');
	}

	// Convert all fields to serializable types
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
		createdAt: subject.createdAt.toISOString(),
		updatedAt: subject.updatedAt.toISOString()
	};

	return { subject: normalizedSubject };
};
