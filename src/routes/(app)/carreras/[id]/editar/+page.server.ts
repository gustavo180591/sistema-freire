import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	// Verificar si el usuario tiene roles permitidos
	const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'APODERADO'];
	const hasPermission = user.roles.some((role) => allowedRoles.includes(role));

	if (!hasPermission) {
		throw error(403, 'No tenés permiso para editar carreras');
	}

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

	// Mapear a objeto serializable
	const careerData = {
		id: career.id,
		code: career.code,
		name: career.name,
		trainingField: career.trainingField,
		resolution: career.resolution,
		durationYears: career.durationYears,
		active: career.active,
		locationIds: career.locations.map((cl) => cl.locationId)
	};

	return {
		career: careerData,
		locations
	};
};

export const actions: Actions = {
	updateCareer: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		// Verificar si el usuario tiene roles permitidos
		const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'APODERADO'];
		const hasPermission = user.roles.some((role) => allowedRoles.includes(role));

		if (!hasPermission) {
			return fail(403, { error: 'No tenés permiso para editar carreras' });
		}

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

		const durationYearsNum = parseInt(durationYears);
		if (isNaN(durationYearsNum) || durationYearsNum < 1 || durationYearsNum > 10) {
			return fail(400, { error: 'La duración debe ser un número entre 1 y 10' });
		}

		try {
			await prisma.$transaction(async (tx) => {
				// Actualizar datos básicos de la carrera
				await tx.career.update({
					where: { id: params.id },
					data: {
						name,
						resolution: resolution || null,
						durationYears: durationYearsNum,
						active: active === 'true'
					}
				});

				// Eliminar relaciones de localidad existentes
				await tx.careerLocation.deleteMany({
					where: { careerId: params.id }
				});

				// Crear nuevas relaciones de localidad
				if (locationIds.length > 0) {
					await tx.careerLocation.createMany({
						data: locationIds.map((locationId) => ({
							careerId: params.id,
							locationId
						})),
						skipDuplicates: true
					});
				}
			});
		} catch (error) {
			console.error('Error al actualizar carrera:', error);
			return fail(500, { error: 'Error al actualizar la carrera' });
		}

		throw redirect(303, `/carreras/${params.id}`);
	}
};
