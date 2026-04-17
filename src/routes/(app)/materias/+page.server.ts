import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
	const subjects = await prisma.subject.findMany({
		where: {
			active: true
		},
		include: {
			commissions: {
				select: {
					id: true
				}
			}
		},
		orderBy: [
			{ yearLevel: 'asc' },
			{ name: 'asc' }
		]
	});

	const normalizedSubjects = subjects.map((subject) => ({
		id: subject.id,
		code: subject.code,
		name: subject.name,
		yearLevel: subject.yearLevel,
		active: subject.active,
		commissionsCount: subject.commissions.length
	}));

	return {
		subjects: normalizedSubjects,
		metrics: {
			totalSubjects: normalizedSubjects.length,
			totalCommissions: normalizedSubjects.reduce((acc, s) => acc + s.commissionsCount, 0)
		}
	};
};