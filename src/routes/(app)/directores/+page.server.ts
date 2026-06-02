import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const directors = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					role: {
						code: 'DIRECTOR'
					}
				}
			}
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	return {
		directors: directors.map((u) => ({
			id: u.id,
			dni: u.id,
			firstName: u.firstName,
			lastName: u.lastName,
			email: u.email,
			status: u.status,
			createdAt: u.createdAt
		}))
	};
};
