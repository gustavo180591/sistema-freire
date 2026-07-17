import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const careerId = url.searchParams.get('careerId');
	const yearLevel = url.searchParams.get('yearLevel');

	if (!careerId || !yearLevel) {
		return json([], { status: 400 });
	}

	// Get the active/default study plan for the career
	const studyPlan = await prisma.studyPlan.findFirst({
		where: {
			careerId,
			active: true,
			OR: [{ isDefault: true }, { active: true }]
		}
	});

	if (!studyPlan) {
		return json([]);
	}

	// Get subjects from the plan that match the year level
	const planSubjects = await prisma.planSubject.findMany({
		where: {
			planId: studyPlan.id
		},
		include: {
			subject: true
		}
	});

	// Filter out subjects that don't match the year level
	const subjects = planSubjects
		.filter((ps) => ps.subject && ps.subject.yearLevel === parseInt(yearLevel) && ps.subject.active)
		.map((ps) => ({
			id: ps.subject.id,
			name: ps.subject.name,
			code: ps.subject.code,
			yearLevel: ps.subject.yearLevel
		}));

	return json(subjects);
};
