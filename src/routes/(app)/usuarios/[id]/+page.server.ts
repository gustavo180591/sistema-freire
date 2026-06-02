import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const user = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: true,
			teacher: {
				include: {
					subjects: {
						include: {
							subject: true
						}
					}
				}
			}
		}
	});

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	return {
		user
	};
};
