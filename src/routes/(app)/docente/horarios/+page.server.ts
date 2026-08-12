import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const teacher = await prisma.teacher.findUnique({
		where: {
			userId: locals.user.id
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			status: true
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	const schedules = await prisma.classSchedule.findMany({
		where: {
			teacherId: teacher.id,
			active: true
		},
		include: {
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
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
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		},
		orderBy: [
			{
				dayOfWeek: 'asc'
			},
			{
				startTime: 'asc'
			}
		]
	});

	return {
		teacher,
		schedules
	};
};
