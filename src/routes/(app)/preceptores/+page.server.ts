import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const preceptors = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					role: {
						code: 'PRECEPTOR'
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
		preceptors: preceptors.map((u) => ({
			id: u.id,
			dni: u.id, // DNI no está en User, usar ID temporal
			firstName: u.firstName,
			lastName: u.lastName,
			email: u.email,
			status: u.status,
			createdAt: u.createdAt
		}))
	};
};
