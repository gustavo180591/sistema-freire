import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		
		const code = formData.get('code');
		const name = formData.get('name');
		const activeStr = formData.get('active');
		// Note: description is in the form but our prisma schema doesn't have a description field for Career yet
		
		if (!code || typeof code !== 'string') {
			return fail(400, { error: 'El código es requerido' });
		}
		
		if (!name || typeof name !== 'string') {
			return fail(400, { error: 'El nombre es requerido' });
		}

		const active = activeStr === 'true';

		try {
			await prisma.career.create({
				data: {
					code,
					name,
					active
				}
			});
		} catch (error) {
			console.error('Error creando la carrera:', error);
			return fail(500, {
				error: 'Ocurrió un error al crear la carrera. Verificá que el código no esté duplicado.'
			});
		}

		// Redirigir al listado de carreras
		throw redirect(303, '/carreras');
	}
};
