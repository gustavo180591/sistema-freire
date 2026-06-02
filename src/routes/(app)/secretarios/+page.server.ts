import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const secretaries = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					role: {
						code: 'SECRETARIA'
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
		secretaries: secretaries.map((u) => ({
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
