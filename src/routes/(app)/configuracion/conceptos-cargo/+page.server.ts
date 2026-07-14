import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	requirePermission(user, 'STUDENT_CHARGE', 'read');

	const chargeConcepts = await prisma.chargeConcept.findMany({
		orderBy: { name: 'asc' }
	});

	return {
		chargeConcepts
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'STUDENT_CHARGE', 'create');

		const data = await request.formData();
		const code = data.get('code')?.toString();
		const name = data.get('name')?.toString();
		const description = data.get('description')?.toString();
		const active = data.get('active') === 'true';

		if (!code || !name) {
			return { error: 'Código y nombre son requeridos' };
		}

		try {
			await prisma.chargeConcept.create({
				data: {
					code,
					name,
					description: description || null,
					active
				}
			});
		} catch (error) {
			return { error: 'Error al crear concepto de cargo' };
		}
	},

	toggleActive: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'STUDENT_CHARGE', 'update');

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return { error: 'ID requerido' };
		}

		try {
			const concept = await prisma.chargeConcept.findUnique({
				where: { id }
			});

			if (!concept) {
				return { error: 'Concepto de cargo no encontrado' };
			}

			await prisma.chargeConcept.update({
				where: { id },
				data: { active: !concept.active }
			});
		} catch (error) {
			return { error: 'Error al actualizar concepto de cargo' };
		}
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'STUDENT_CHARGE', 'delete');

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return { error: 'ID requerido' };
		}

		try {
			await prisma.chargeConcept.delete({
				where: { id }
			});
		} catch (error) {
			return { error: 'Error al eliminar concepto de cargo' };
		}
	}
};
