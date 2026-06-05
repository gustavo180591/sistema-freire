import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const career = await prisma.career.findUnique({
		where: {
			id: params.id
		},
		include: {
			location: true
		}
	});

	if (!career) {
		throw error(404, 'Carrera no encontrada');
	}

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: { id: true, name: true, code: true }
	});

	return {
		career,
		locations
	};
};

export const actions: Actions = {
	updateCareer: async ({ request, params }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString();
		const name = formData.get('name')?.toString();
		const trainingField = formData.get('trainingField')?.toString();
		const resolution = formData.get('resolution')?.toString();
		const durationYears = formData.get('durationYears')?.toString();
		const active = formData.get('active')?.toString();
		const locationId = formData.get('locationId')?.toString();

		if (!code || !name || !trainingField || !durationYears || !locationId) {
			return fail(400, { error: 'Por favor completá los campos requeridos' });
		}

		try {
			await prisma.career.update({
				where: { id: params.id },
				data: {
					code,
					name,
					trainingField,
					resolution: resolution || null,
					durationYears: parseInt(durationYears),
					active: active === 'true',
					locationId
				}
			});

			throw redirect(303, `/carreras/${params.id}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes('redirect')) {
				throw error;
			}
			console.error('Error al actualizar carrera:', error);
			return fail(500, { error: 'Error al actualizar la carrera' });
		}
	}
};
