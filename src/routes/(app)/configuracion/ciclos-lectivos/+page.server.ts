import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	requirePermission(user, 'ACADEMIC_TERM', 'read');

	const academicTerms = await prisma.academicTerm.findMany({
		include: {
			location: {
				select: {
					id: true,
					name: true,
					code: true
				}
			}
		},
		orderBy: [{ year: 'desc' }, { startDate: 'desc' }]
	});

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	return {
		academicTerms,
		locations
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'ACADEMIC_TERM', 'create');

		const data = await request.formData();
		const name = data.get('name')?.toString();
		const code = data.get('code')?.toString();
		const year = parseInt(data.get('year')?.toString() || '0');
		const termType = data.get('termType')?.toString();
		const startDate = data.get('startDate')?.toString();
		const endDate = data.get('endDate')?.toString();
		const locationId = data.get('locationId')?.toString();
		const active = data.get('active') === 'true';

		if (!name || !code || !year || !termType || !startDate || !endDate) {
			return { error: 'Todos los campos son requeridos' };
		}

		try {
			await prisma.academicTerm.create({
				data: {
					name,
					code,
					year,
					termType: termType as any,
					startDate: new Date(startDate),
					endDate: new Date(endDate),
					locationId: locationId || null,
					active
				}
			});
		} catch (error) {
			return { error: 'Error al crear ciclo lectivo' };
		}
	},

	toggleActive: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'ACADEMIC_TERM', 'update');

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return { error: 'ID requerido' };
		}

		try {
			const term = await prisma.academicTerm.findUnique({
				where: { id }
			});

			if (!term) {
				return { error: 'Ciclo lectivo no encontrado' };
			}

			await prisma.academicTerm.update({
				where: { id },
				data: { active: !term.active }
			});
		} catch (error) {
			return { error: 'Error al actualizar ciclo lectivo' };
		}
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'ACADEMIC_TERM', 'delete');

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return { error: 'ID requerido' };
		}

		try {
			await prisma.academicTerm.delete({
				where: { id }
			});
		} catch (error) {
			return { error: 'Error al eliminar ciclo lectivo' };
		}
	}
};
