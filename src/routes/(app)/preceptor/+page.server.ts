import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['PRECEPTOR']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener estudiantes activos
	const students = await prisma.student.findMany({
		where: { status: 'ACTIVE' },
		include: {
			user: true,
			career: true
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	// Obtener carreras disponibles
	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	// Obtener materias
	const subjects = await prisma.subject.findMany({
		where: { active: true },
		include: {
			careerSubjects: {
				include: {
					career: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	return {
		user: locals.user,
		students: students.map(s => ({
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
		subjects: subjects.map(s => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map(cs => cs.career.name)
		}))
	};
};
