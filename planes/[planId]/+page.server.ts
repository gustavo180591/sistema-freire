import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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
			},
			subjects: {
				include: {
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				},
				orderBy: {
					sortOrder: 'asc'
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

	const normalizedPlan = {
		id: studyPlan.id,
		name: studyPlan.name,
		version: studyPlan.version,
		durationYears: studyPlan.durationYears,
		active: studyPlan.active,
		createdAt: studyPlan.createdAt,
		updatedAt: studyPlan.updatedAt,
		career: studyPlan.career,
		subjects: studyPlan.subjects.map((ps) => ({
			id: ps.subject.id,
			code: ps.subject.code,
			name: ps.subject.name,
			yearLevel: ps.subject.yearLevel,
			active: ps.subject.active,
			sortOrder: ps.sortOrder
		}))
	};

	return {
		plan: normalizedPlan,
		metrics: {
			totalSubjects: normalizedPlan.subjects.length,
			totalYears: normalizedPlan.durationYears
		}
	};
};
