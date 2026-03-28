import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (!email || !password) {
			return fail(400, { error: 'Faltan credenciales', missing: true });
		}

		// TODO: Implementar la lógica real de autenticación con Prisma/Bcrypt
		console.log('Intento de login con:', email);

		// Redirigir al dashboard provisionalmente
		redirect(303, '/dashboard');
	}
} satisfies Actions;
