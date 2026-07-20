import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user || !user.roles.includes('ALUMNO')) {
		throw redirect(303, '/login');
	}

	// Intentar obtener el estudiante asociado al usuario por DNI
	let student;
	try {
		student = await getCurrentStudentForUser(user.id);
	} catch (e) {
		// Si no se encuentra el estudiante, mostrar datos del usuario
		student = null;
	}

	if (student) {
		// Cargar datos adicionales del estudiante
		const studentWithRelations = await prisma.student.findUnique({
			where: { id: student.id },
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

		if (!studentWithRelations) {
			throw error(404, 'No se encontraron datos del estudiante');
		}

		return {
			student: {
				id: studentWithRelations.id,
				dni: studentWithRelations.dni,
				firstName: studentWithRelations.firstName,
				lastName: studentWithRelations.lastName,
				email: studentWithRelations.user.email,
				career: studentWithRelations.career?.name || 'Sin carrera',
				status: studentWithRelations.status
			}
		};
	}

	// Si no hay estudiante asociado, mostrar datos del usuario
	return {
		student: {
			id: user.id,
			dni: null,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			career: 'Sin carrera',
			status: 'NO_VINCULADO'
		}
	};
};
