import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

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
			dni: u.id,
			firstName: u.firstName,
			lastName: u.lastName,
			email: u.email,
			status: u.status,
			createdAt: u.createdAt
		}))
	};
};

export const actions: Actions = {
	deletePreceptor: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		try {
			// Eliminar el rol PRECEPTOR del usuario
			await prisma.userRole.deleteMany({
				where: {
					userId: id,
					role: {
						code: 'PRECEPTOR'
					}
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al eliminar preceptor' });
		}
	}
};
