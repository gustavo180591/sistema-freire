import type { Prisma } from '@prisma/client';

import { prisma } from '$lib/server/db/prisma';
import { getPreceptorScope } from '$lib/server/preceptor/preceptor-scope-service';

type CohortFilters = {
	userId: string;
	careerId?: string;
};

type CohortStudentFilters = CohortFilters & {
	instituteYear: number;
	search?: string;
};

function buildStudentSearchFilters(search: string): Prisma.StudentWhereInput[] {
	const terms = search
		.split(/\s+/)
		.map((term) => term.trim())
		.filter(Boolean);

	return terms.map((term) => ({
		OR: [
			{
				dni: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				firstName: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				lastName: {
					contains: term,
					mode: 'insensitive'
				}
			}
		]
	}));
}

export async function listPreceptorCohorts({ userId, careerId = '' }: CohortFilters) {
	const { locationIds } = await getPreceptorScope(userId);

	const cohortWhere: Prisma.StudentWhereInput = {
		instituteYear: {
			not: null
		},
		locationId: {
			in: locationIds
		}
	};

	if (careerId) {
		cohortWhere.careerId = careerId;
	}

	const [cohortGroups, careers] = await Promise.all([
		prisma.student.groupBy({
			by: ['instituteYear'],
			where: cohortWhere,
			_count: {
				_all: true
			},
			orderBy: {
				instituteYear: 'desc'
			}
		}),
		prisma.career.findMany({
			where: {
				students: {
					some: {
						instituteYear: {
							not: null
						},
						locationId: {
							in: locationIds
						}
					}
				}
			},
			select: {
				id: true,
				name: true
			},
			orderBy: {
				name: 'asc'
			}
		})
	]);

	return {
		cohorts: cohortGroups
			.filter(
				(group): group is typeof group & { instituteYear: number } => group.instituteYear !== null
			)
			.map((group) => ({
				year: group.instituteYear,
				studentCount: group._count._all
			})),
		careers
	};
}

export async function listPreceptorCohortStudents({
	userId,
	instituteYear,
	careerId = '',
	search = ''
}: CohortStudentFilters) {
	const { locationIds } = await getPreceptorScope(userId);

	const baseWhere: Prisma.StudentWhereInput = {
		instituteYear,
		locationId: {
			in: locationIds
		}
	};

	if (careerId) {
		baseWhere.careerId = careerId;
	}

	const searchFilters = buildStudentSearchFilters(search);

	const studentWhere: Prisma.StudentWhereInput =
		searchFilters.length > 0
			? {
					AND: [baseWhere, ...searchFilters]
				}
			: baseWhere;

	const [students, careers] = await Promise.all([
		prisma.student.findMany({
			where: studentWhere,
			select: {
				id: true,
				dni: true,
				firstName: true,
				lastName: true,
				status: true,
				currentYear: true,
				isRecursante: true,
				instituteYear: true,
				career: {
					select: {
						id: true,
						name: true
					}
				},
				location: {
					select: {
						id: true,
						name: true
					}
				},
				studyPlan: {
					select: {
						id: true,
						code: true,
						name: true
					}
				}
			},
			orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }]
		}),
		prisma.career.findMany({
			where: {
				students: {
					some: {
						instituteYear,
						locationId: {
							in: locationIds
						}
					}
				}
			},
			select: {
				id: true,
				name: true
			},
			orderBy: {
				name: 'asc'
			}
		})
	]);

	return {
		students,
		careers
	};
}
