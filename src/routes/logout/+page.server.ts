import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const actions: Actions = {
	default: async ({ cookies }) => {
		// Eliminar la sesión de la base de datos
		const token = cookies.get('session');
		if (token) {
			await prisma.session.deleteMany({
				where: {
					tokenHash: token
				}
			});
		}

		// Eliminar la cookie de sesión
		cookies.delete('session', { path: '/' });

		// Redirigir al login
		throw redirect(303, '/login');
	}
};
