import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';

export async function load() {
	const students = await prisma.student.findMany({
		include: {
			user: true,
			career: true
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	type StudentWithRelations = Prisma.StudentGetPayload<{
		include: { user: true; career: true };
	}>;

	return {
		students: students.map((s: StudentWithRelations) => ({
			id: s.id,
			userId: s.userId,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			email: s.user.email,
			career: s.career.name,
			careerId: s.careerId,
			status: s.status,
			isBecado: s.isBecado,
			isRecursante: s.isRecursante,
			createdAt: s.createdAt
		}))
	};
}
