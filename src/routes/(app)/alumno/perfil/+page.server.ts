import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user || !user.roles.includes('ALUMNO')) {
		throw redirect(303, '/login');
	}

	const student = await prisma.student.findFirst({
		where: { userId: user.id },
		include: {
			career: true,
			user: {
				select: {
					email: true,
					firstName: true,
					lastName: true
				}
			}
		}
	});

	if (!student) {
		throw redirect(303, '/dashboard');
	}

	return {
		student: {
			id: student.id,
			dni: student.dni,
			firstName: student.firstName,
			lastName: student.lastName,
			email: student.user.email,
			career: student.career?.name || 'Sin carrera',
			status: student.status
		}
	};
};
