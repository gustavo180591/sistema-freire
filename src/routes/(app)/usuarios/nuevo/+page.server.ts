import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const firstName = data.get('firstName');
		const lastName = data.get('lastName');
		const type = data.get('type');
		const dni = data.get('dni');

		if (!email || !firstName || !lastName || !dni || !type) {
			return fail(400, { error: 'Por favor completá los datos esenciales', missing: true });
		}

		console.log('Registrando nuevo usuario:', { type, email, firstName, lastName, dni });
		
		// TODO: Guardar en la base de datos con Prisma y enviar mail con la contraseña inicial

		// Tras crear el usuario, lo redirigimos al listado
		redirect(303, '/usuarios');
	}
} satisfies Actions;
