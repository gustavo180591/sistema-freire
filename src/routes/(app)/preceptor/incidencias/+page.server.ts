import { AuditAction, FollowUpType } from '@prisma/client';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auditLog } from '$lib/server/audit';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import {
	getPreceptorScope,
	getPreceptorStudentWhere,
	requirePreceptorStudentAccess
} from '$lib/server/preceptor/preceptor-scope-service';

type IncidentSeverity = 'BAJA' | 'MEDIA' | 'ALTA';

function isIncidentSeverity(value: string): value is IncidentSeverity {
	return value === 'BAJA' || value === 'MEDIA' || value === 'ALTA';
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, ['PRECEPTOR']);
	await requirePermission(currentUser, 'STUDENT_FOLLOW_UP', 'read');

	const scope = await getPreceptorScope(currentUser.id);
	const studentWhere = getPreceptorStudentWhere(scope);

	const [students, recentIncidents] = await Promise.all([
		prisma.student.findMany({
			where: {
				...studentWhere,
				status: 'ACTIVE'
			},
			select: {
				id: true,
				dni: true,
				firstName: true,
				lastName: true,
				career: {
					select: {
						name: true
					}
				}
			},
			orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
		}),

		prisma.studentFollowUp.findMany({
			where: {
				type: FollowUpType.INCIDENT,
				student: {
					is: studentWhere
				}
			},
			select: {
				id: true,
				title: true,
				description: true,
				isAlert: true,
				isResolved: true,
				resolvedAt: true,
				createdAt: true,
				student: {
					select: {
						dni: true,
						firstName: true,
						lastName: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 20
		})
	]);

	return {
		students: students.map((student) => ({
			id: student.id,
			dni: student.dni,
			firstName: student.firstName,
			lastName: student.lastName,
			career: student.career.name
		})),

		recentIncidents: recentIncidents.map((incident) => ({
			id: incident.id,
			studentName: `${incident.student.lastName}, ${incident.student.firstName}`,
			studentDni: incident.student.dni,
			title: incident.title,
			description: incident.description,
			createdAt: incident.createdAt,
			isAlert: incident.isAlert,
			resolved: incident.isResolved || incident.resolvedAt !== null,
			resolvedAt: incident.resolvedAt
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, {
				error: 'No autorizado'
			});
		}

		requireRole(currentUser, ['PRECEPTOR']);
		await requirePermission(currentUser, 'STUDENT_FOLLOW_UP', 'create');

		const data = await request.formData();

		const studentId = data.get('studentId')?.toString().trim() ?? '';

		const title = data.get('title')?.toString().trim() ?? '';

		const description = data.get('description')?.toString().trim() ?? '';

		const severity = data.get('severity')?.toString().trim() ?? '';

		if (!studentId || !title || !description || !severity) {
			return fail(400, {
				error: 'Por favor completá todos los campos requeridos'
			});
		}

		if (!isIncidentSeverity(severity)) {
			return fail(400, {
				error: 'La severidad seleccionada no es válida'
			});
		}

		/*
		 * Esta comprobación es la frontera real de seguridad.
		 *
		 * No confiamos en el studentId enviado por el navegador:
		 * el alumno debe pertenecer a una sede explícitamente
		 * asignada al PRECEPTOR.
		 */
		const student = await requirePreceptorStudentAccess(currentUser.id, studentId);

		if (student.status !== 'ACTIVE') {
			return fail(400, {
				error: 'El alumno ya no se encuentra activo'
			});
		}

		try {
			const incident = await prisma.studentFollowUp.create({
				data: {
					studentId: student.id,
					type: FollowUpType.INCIDENT,
					title,
					description,
					isAlert: severity === 'ALTA',
					createdBy: currentUser.id
				},
				select: {
					id: true
				}
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.CREATE,
				entityType: 'STUDENT_FOLLOW_UP',
				entityId: incident.id,
				description:
					`Registro de incidencia (${severity}) para ` +
					`${student.firstName} ${student.lastName}: ${title}`
			});

			return {
				success: 'Incidencia registrada exitosamente'
			};
		} catch (caught) {
			console.error('Error al registrar incidencia:', caught);

			return fail(500, {
				error: 'Error al registrar la incidencia'
			});
		}
	}
};
