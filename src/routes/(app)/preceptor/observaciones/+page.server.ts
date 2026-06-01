import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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

	// Obtener seguimientos recientes
	const recentFollowUps = await prisma.studentFollowUp.findMany({
		include: {
			student: {
				include: {
					user: true
				}
			},
			creator: true,
			resolver: true
		},
		orderBy: { createdAt: 'desc' },
		take: 20
	});

	return {
		students: students.map(s => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name
		})),
		recentFollowUps: recentFollowUps.map(f => ({
			id: f.id,
			studentName: `${f.student.lastName}, ${f.student.firstName}`,
			studentDni: f.student.dni,
			type: f.type,
			title: f.title,
			description: f.description,
			createdAt: f.createdAt,
			resolved: f.resolvedAt !== null,
			resolvedAt: f.resolvedAt
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const studentId = data.get('studentId')?.toString();
		const type = data.get('type')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();

		if (!studentId || !type || !title || !description) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			await prisma.studentFollowUp.create({
				data: {
					studentId,
					type: type as any,
					title,
					description,
					createdBy: locals.user!.id
				}
			});

			return { success: 'Observación registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar observación:', error);
			return { error: 'Error al registrar la observación' };
		}
	}
};
