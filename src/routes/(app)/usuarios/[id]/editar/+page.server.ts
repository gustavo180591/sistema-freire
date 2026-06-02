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
			teacher: {
				include: {
					subjects: {
						include: {
							subject: true
						}
					}
				}
			}
		}
	});

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	const roles = await prisma.role.findMany({
		orderBy: { name: 'asc' }
	});

	const subjects = await prisma.subject.findMany({
		where: { active: true },
		orderBy: [
			{ yearLevel: 'asc' },
			{ name: 'asc' }
		]
	});

	return {
		user,
		roles,
		subjects
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
	},

	addSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			// Verificar que el usuario sea docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			await prisma.subjectTeacher.create({
				data: {
					subjectId,
					teacherId: teacher.id
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al agregar materia' });
		}
	},

	removeSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			// Verificar que el usuario sea docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			await prisma.subjectTeacher.deleteMany({
				where: {
					subjectId,
					teacherId: teacher.id
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al remover materia' });
		}
	}
};
