import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const careerId = url.searchParams.get('carrera');
	
	const where = careerId ? { careerId } : {};
	
	const students = await prisma.student.findMany({
		where,
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

	// Get career name if filtering by career
	let careerName = null;
	if (careerId && students.length > 0) {
		careerName = students[0].career.name;
	}
	
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
		})),
		filter: careerId ? { careerId, careerName } : null
	};
}
