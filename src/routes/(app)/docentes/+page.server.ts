import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad } from './$types';

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
