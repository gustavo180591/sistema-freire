import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/auth/permissions';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['SUPERADMIN']);

	const { prisma } = await import('$lib/server/db/prisma');

	// Fetch all locations with careers
	const locations = await prisma.location.findMany({
		include: {
			careers: {
				include: {
					career: {
						select: {
							id: true,
							name: true
						}
					}
				}
			}
		}
	});

	// Fetch all careers for the association form
	const careers = await prisma.career.findMany({
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true
		}
	});

	// Augment locations with counts (simplified without raw queries)
	const locationsWithCounts = locations.map((loc) => ({
		...loc,
		_count: {
			students: 0, // TODO: Implement count without raw queries
			userPermissions: 0, // TODO: Implement count without raw queries
			careers: (loc as { careers: unknown[] }).careers.length
		}
	}));

	// Calculate KPIs
	const totalLocations = locationsWithCounts.length;
	const activeLocations = locationsWithCounts.filter((l) => l.active).length;
	const inactiveLocations = totalLocations - activeLocations;
	const totalCareerAssociations = locationsWithCounts.reduce(
		(sum, loc) => sum + loc._count.careers,
		0
	);

	return {
		locations: locationsWithCounts,
		careers,
		kpis: {
			totalLocations,
			activeLocations,
			inactiveLocations,
			totalCareerAssociations
		}
	};
};

export const actions: Actions = {
	createLocation: async ({ request, locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();

		const name = formData.get('name')?.toString();
		const code = formData.get('code')?.toString();
		const address = formData.get('address')?.toString() || null;
		const city = formData.get('city')?.toString() || null;
		const province = formData.get('province')?.toString() || null;
		const phone = formData.get('phone')?.toString() || null;
		const email = formData.get('email')?.toString() || null;
		const displayOrder = parseInt(formData.get('displayOrder')?.toString() || '0');
		const active = formData.get('active') === 'on';

		if (!name || !code) {
			return fail(400, { error: 'Nombre y código son requeridos' });
		}

		try {
			// Check if name or code already exists
			const existing = await prisma.location.findFirst({
				where: {
					OR: [{ name }, { code }]
				}
			});

			if (existing) {
				if (existing.name === name) {
					return fail(400, { error: 'Ya existe una sede con ese nombre' });
				}
				if (existing.code === code) {
					return fail(400, { error: 'Ya existe una sede con ese código' });
				}
			}

			await prisma.location.create({
				data: {
					name,
					code,
					address,
					city,
					province,
					phone,
					email,
					displayOrder,
					active
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al crear sede' });
		}
	},

	updateLocation: async ({ request, locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();

		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString();
		const code = formData.get('code')?.toString();
		const address = formData.get('address')?.toString() || null;
		const city = formData.get('city')?.toString() || null;
		const province = formData.get('province')?.toString() || null;
		const phone = formData.get('phone')?.toString() || null;
		const email = formData.get('email')?.toString() || null;
		const displayOrder = parseInt(formData.get('displayOrder')?.toString() || '0');
		const active = formData.get('active') === 'on';

		if (!id || !name || !code) {
			return fail(400, { error: 'ID, nombre y código son requeridos' });
		}

		try {
			// Check if name or code already exists (excluding current location)
			const existing = await prisma.location.findFirst({
				where: {
					OR: [{ name }, { code }],
					NOT: { id }
				}
			});

			if (existing) {
				if (existing.name === name) {
					return fail(400, { error: 'Ya existe una sede con ese nombre' });
				}
				if (existing.code === code) {
					return fail(400, { error: 'Ya existe una sede con ese código' });
				}
			}

			await prisma.location.update({
				where: { id },
				data: {
					name,
					code,
					address,
					city,
					province,
					phone,
					email,
					displayOrder,
					active
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar sede' });
		}
	},

	toggleLocationStatus: async ({ request, locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();

		const id = formData.get('id')?.toString();
		const active = formData.get('active') === 'true';

		if (!id) {
			return fail(400, { error: 'ID es requerido' });
		}

		try {
			await prisma.location.update({
				where: { id },
				data: { active }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al cambiar estado de sede' });
		}
	},

	updateCareerLocations: async ({ request, locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();

		const locationId = formData.get('locationId')?.toString();
		const careerIds = formData.getAll('careerIds').map((c) => c.toString());

		if (!locationId) {
			return fail(400, { error: 'ID de sede es requerido' });
		}

		try {
			// Validate location exists
			const location = await prisma.location.findUnique({
				where: { id: locationId }
			});

			if (!location) {
				return fail(404, { error: 'Sede no encontrada' });
			}

			// Validate all careers exist
			const careers = await prisma.career.findMany({
				where: { id: { in: careerIds } }
			});

			if (careers.length !== careerIds.length) {
				return fail(400, { error: 'Una o más carreras no existen' });
			}

			// Delete existing career associations for this location
			await prisma.careerLocation.deleteMany({
				where: { locationId }
			});

			// Create new associations
			if (careerIds.length > 0) {
				await prisma.careerLocation.createMany({
					data: careerIds.map((careerId) => ({
						careerId,
						locationId
					})),
					skipDuplicates: true
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar carreras de sede' });
		}
	}
};
