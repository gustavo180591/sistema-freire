import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	requirePermission(user, 'CAREER', 'update');

	const career = await prisma.career.findUnique({
		where: {
			id: params.id
		},
		include: {
			locations: {
				include: {
					location: true
				}
			}
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
		locations,
		careerLocationIds: career.locations.map(cl => cl.locationId)
	};
};

export const actions: Actions = {
	updateCareer: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'CAREER', 'update');

		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const resolution = formData.get('resolution')?.toString();
		const durationYears = formData.get('durationYears')?.toString();
		const active = formData.get('active')?.toString();

		// Obtener múltiples localidades
		const locationIds = formData.getAll('locationIds') as string[];

		if (!name || !durationYears) {
			return fail(400, { error: 'Por favor completá los campos requeridos' });
		}

		if (!locationIds || locationIds.length === 0) {
			return fail(400, { error: 'Por favor seleccioná al menos una localidad' });
		}

		try {
			await prisma.$transaction(async (tx) => {
				// Actualizar datos básicos de la carrera
				await tx.career.update({
					where: { id: params.id },
					data: {
						name,
						resolution: resolution || null,
						durationYears: parseInt(durationYears),
						active: active === 'true'
					}
				});

				// Eliminar relaciones de localidad existentes
				await tx.careerLocation.deleteMany({
					where: { careerId: params.id }
				});

				// Crear nuevas relaciones de localidad
				for (const locationId of locationIds) {
					await tx.careerLocation.create({
						data: {
							careerId: params.id,
							locationId
						}
					});
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
