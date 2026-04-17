import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;
		const message = formData.get('message') as string;

		// Validación básica
		if (!name || !email || !message) {
			return {
				success: false,
				errors: {
					name: !name ? 'El nombre es requerido' : '',
					email: !email ? 'El email es requerido' : '',
					message: !message ? 'El mensaje es requerido' : ''
				}
			};
		}

		// Validación de email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return {
				success: false,
				errors: {
					email: 'El email no es válido'
				}
			};
		}

		// Aquí podrías agregar lógica para enviar el email
		// Por ejemplo, usando un servicio como SendGrid, Resend, etc.
		console.log('Formulario de contacto:', { name, email, phone, message });

		return {
			success: true,
			message: '¡Mensaje enviado correctamente! Te contactaremos pronto.'
		};
	}
};
