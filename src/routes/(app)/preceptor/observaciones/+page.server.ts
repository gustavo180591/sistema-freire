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

const OBSERVATION_TYPES = [
	FollowUpType.OBSERVATION,
	FollowUpType.WARNING,
	FollowUpType.INTERVIEW,
	FollowUpType.ACHIEVEMENT,
	FollowUpType.NOTE
] as const;

type ObservationType = (typeof OBSERVATION_TYPES)[number];

function isObservationType(value: string): value is ObservationType {
	return OBSERVATION_TYPES.some((type) => type === value);
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

	const [students, recentFollowUps] = await Promise.all([
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
				type: {
					in: [...OBSERVATION_TYPES]
				},
				student: {
					is: studentWhere
				}
			},
			select: {
				id: true,
				type: true,
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

		recentFollowUps: recentFollowUps.map((followUp) => ({
			id: followUp.id,
			studentName: `${followUp.student.lastName}, ${followUp.student.firstName}`,
			studentDni: followUp.student.dni,
			type: followUp.type,
			title: followUp.title,
			description: followUp.description,
			isAlert: followUp.isAlert,
			createdAt: followUp.createdAt,
			resolved: followUp.isResolved || followUp.resolvedAt !== null,
			resolvedAt: followUp.resolvedAt
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

		const type = data.get('type')?.toString().trim() ?? '';

		const title = data.get('title')?.toString().trim() ?? '';

		const description = data.get('description')?.toString().trim() ?? '';

		if (!studentId || !type || !title || !description) {
			return fail(400, {
				error: 'Por favor completá todos los campos requeridos'
			});
		}

		if (!isObservationType(type)) {
			return fail(400, {
				error: 'El tipo de observación seleccionado no es válido'
			});
		}

		/*
		 * Nunca confiamos en el studentId recibido desde el cliente.
		 * El alumno debe pertenecer al scope explícito del PRECEPTOR.
		 */
		const student = await requirePreceptorStudentAccess(currentUser.id, studentId);

		if (student.status !== 'ACTIVE') {
			return fail(400, {
				error: 'El alumno ya no se encuentra activo'
			});
		}

		try {
			const followUp = await prisma.studentFollowUp.create({
				data: {
					studentId: student.id,
					type,
					title,
					description,
					isAlert: type === FollowUpType.WARNING,
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
				entityId: followUp.id,
				description:
					`Registro de observación (${type}) para ` +
					`${student.firstName} ${student.lastName}: ${title}`
			});

			return {
				success: 'Observación registrada exitosamente'
			};
		} catch (caught) {
			console.error('Error al registrar observación:', caught);

			return fail(500, {
				error: 'Error al registrar la observación'
			});
		}
	}
};
