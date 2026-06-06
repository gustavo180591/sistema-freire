import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	requirePermission(user, 'CAREER', 'create');

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: { id: true, name: true, code: true }
	});

	return { locations };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'CAREER', 'create');

		const formData = await request.formData();

		const name = formData.get('name')?.toString();
		const code = formData.get('code')?.toString();
		const trainingField = formData.get('trainingField')?.toString();
		const resolution = formData.get('resolution')?.toString();
		const durationYears = formData.get('durationYears')?.toString();
		const locationIds = formData.getAll('locationIds') as string[];
		const activeStr = formData.get('active')?.toString();

		if (!name || typeof name !== 'string') {
			return fail(400, { error: 'El nombre es requerido' });
		}

		if (!code || typeof code !== 'string') {
			return fail(400, { error: 'El código es requerido' });
		}

		if (!trainingField || typeof trainingField !== 'string') {
			return fail(400, { error: 'El campo de formación es requerido' });
		}

		if (!durationYears || typeof durationYears !== 'string') {
			return fail(400, { error: 'La duración es requerida' });
		}

		if (!locationIds || locationIds.length === 0) {
			return fail(400, { error: 'Por favor seleccioná al menos una localidad' });
		}

		const active = activeStr === 'true';
		const durationYearsNum = parseInt(durationYears, 10);

		if (isNaN(durationYearsNum) || durationYearsNum < 1 || durationYearsNum > 10) {
			return fail(400, { error: 'La duración debe ser un número entre 1 y 10 años' });
		}

		try {
			await prisma.$transaction(async (tx) => {
				const career = await tx.career.create({
					data: {
						name,
						code,
						trainingField: trainingField as any,
						resolution: resolution || null,
						durationYears: durationYearsNum,
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
