import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const teachers = await prisma.teacher.findMany({
		include: {
			user: true
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	type TeacherWithRelations = Prisma.TeacherGetPayload<{
		include: { user: true };
	}>;

	return {
		teachers: teachers.map((t: TeacherWithRelations) => ({
			id: t.id,
			userId: t.userId,
			dni: t.dni,
			firstName: t.firstName,
			lastName: t.lastName,
			email: t.user.email,
			createdAt: t.createdAt
		}))
	};
};

export const actions: Actions = {
	deleteTeacher: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const userId = formData.get('userId')?.toString();

		if (!id || !userId) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		try {
			// Eliminar el registro de Teacher
			await prisma.teacher.delete({
				where: { id }
			});

			// Eliminar el usuario
			await prisma.user.delete({
				where: { id: userId }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al eliminar docente' });
		}
	}
};
