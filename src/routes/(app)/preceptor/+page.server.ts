import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['PRECEPTOR']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener localidades permitidas para el preceptor
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener estudiantes activos filtrados por localidad
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			career: {
				locations: {
					some: {
						locationId: { in: allowedLocationIds }
					}
				}
			}
		},
		include: {
			user: true,
			career: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	// Obtener carreras disponibles filtradas por localidad
	const careers = await prisma.career.findMany({
		where: {
			active: true,
			locations: {
				some: {
					locationId: { in: allowedLocationIds }
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	// Obtener materias filtradas por localidad
	const subjects = await prisma.subject.findMany({
		where: { active: true },
		include: {
			careerSubjects: {
				where: {
					career: {
						locations: {
							some: {
								locationId: { in: allowedLocationIds }
							}
						}
					}
				},
				include: {
					career: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	return {
		user: locals.user,
		students: students.map((s) => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			email: s.user.email,
			career: s.career.name,
			careerId: s.careerId,
			status: s.status,
			currentYear: s.currentYear
		})),
		careers,
		subjects: subjects.map((s) => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map((cs) => cs.career.name)
		}))
	};
};
