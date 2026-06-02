import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const user = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: true,
			teacher: true
		}
	});

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	const roles = await prisma.role.findMany({
		orderBy: { name: 'asc' }
	});

	return {
		user,
		roles
	};
};

export const actions: Actions = {
	updateUser: async ({ request, params }) => {
		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString();
		const lastName = formData.get('lastName')?.toString();
		const email = formData.get('email')?.toString();
		const status = formData.get('status')?.toString();

		if (!firstName || !lastName || !email) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		try {
			await prisma.user.update({
				where: { id: params.id },
				data: {
					firstName,
					lastName,
					email,
					status: status as 'ACTIVE' | 'INACTIVE'
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar usuario' });
		}
	},

	updateRoles: async ({ request, params }) => {
		const formData = await request.formData();
		const roleIds = formData.getAll('roleIds').map(r => r.toString());

		try {
			// Eliminar roles actuales
			await prisma.userRole.deleteMany({
				where: { userId: params.id }
			});

			// Agregar nuevos roles
			if (roleIds.length > 0) {
				await prisma.userRole.createMany({
					data: roleIds.map(roleId => ({
						userId: params.id,
						roleId
					}))
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar roles' });
		}
	}
};
