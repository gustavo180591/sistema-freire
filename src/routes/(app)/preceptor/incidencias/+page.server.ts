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

	// Obtener incidencias recientes (usando StudentFollowUp con tipo INCIDENT)
	const recentIncidents = await prisma.studentFollowUp.findMany({
		where: { type: 'INCIDENT' },
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
		recentIncidents: recentIncidents.map(i => ({
			id: i.id,
			studentName: `${i.student.lastName}, ${i.student.firstName}`,
			studentDni: i.student.dni,
			title: i.title,
			description: i.description,
			createdAt: i.createdAt,
			resolved: i.resolvedAt !== null,
			resolvedAt: i.resolvedAt
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const studentId = data.get('studentId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const severity = data.get('severity')?.toString();

		if (!studentId || !title || !description || !severity) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			await prisma.studentFollowUp.create({
				data: {
					studentId,
					type: 'INCIDENT',
					title,
					description,
					isAlert: severity === 'ALTA',
					createdBy: locals.user!.id
				}
			});

			return { success: 'Incidencia registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar incidencia:', error);
			return { error: 'Error al registrar la incidencia' };
		}
	}
};
