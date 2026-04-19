import { json } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

export const POST = async ({ cookies }: { cookies: Cookies }) => {
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

	// Devolver respuesta exitosa (el cliente manejará la redirección)
	return json({ success: true });
};
