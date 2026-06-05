import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: { id: true, name: true, code: true }
	});

	return { locations };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const name = formData.get('name');
		const locationIds = formData.getAll('locationIds') as string[];
		const activeStr = formData.get('active');

		if (!name || typeof name !== 'string') {
			return fail(400, { error: 'El nombre es requerido' });
		}

		if (!locationIds || locationIds.length === 0) {
			return fail(400, { error: 'Por favor seleccioná al menos una localidad' });
		}

		const active = activeStr === 'true';

		try {
			await prisma.$transaction(async (tx) => {
				const career = await tx.career.create({
					data: {
						name,
						active
					}
				});

				// Crear relaciones de localidad
				for (const locationId of locationIds) {
					await tx.careerLocation.create({
						data: {
							careerId: career.id,
							locationId
						}
					});
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
