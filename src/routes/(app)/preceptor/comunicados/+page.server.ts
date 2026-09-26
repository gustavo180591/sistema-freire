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

const COMMUNICATION_TYPES = [FollowUpType.NOTE, FollowUpType.MEETING] as const;

type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

function isCommunicationType(value: string): value is CommunicationType {
	return COMMUNICATION_TYPES.some((type) => type === value);
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, ['PRECEPTOR']);

	await Promise.all([
		requirePermission(currentUser, 'COMMUNICATION', 'read'),
		requirePermission(currentUser, 'DOCUMENT', 'read')
	]);

	const scope = await getPreceptorScope(currentUser.id);
	const studentWhere = getPreceptorStudentWhere(scope);

	const [students, recentCommunications, pendingDocuments] = await Promise.all([
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
					in: [...COMMUNICATION_TYPES]
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
		}),

		prisma.studentDocument.findMany({
			where: {
				verified: false,
				student: {
					is: {
						...studentWhere,
						status: 'ACTIVE'
					}
				}
			},
			select: {
				id: true,
				type: true,
				name: true,
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

		recentCommunications: recentCommunications.map((communication) => ({
			id: communication.id,
			studentName: `${communication.student.lastName}, ` + communication.student.firstName,
			studentDni: communication.student.dni,
			type: communication.type,
			title: communication.title,
			description: communication.description,
			createdAt: communication.createdAt
		})),

		pendingDocuments: pendingDocuments.map((document) => ({
			id: document.id,
			studentName: `${document.student.lastName}, ` + document.student.firstName,
			studentDni: document.student.dni,
			documentType: document.type,
			fileName: document.name,
			uploadedAt: document.createdAt
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

		await requirePermission(currentUser, 'COMMUNICATION', 'create');

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

		if (!isCommunicationType(type)) {
			return fail(400, {
				error: 'El tipo de comunicado seleccionado no es válido'
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
			const communication = await prisma.studentFollowUp.create({
				data: {
					studentId: student.id,
					type,
					title,
					description,
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
				entityId: communication.id,
				description:
					`Registro de comunicado (${type}) para ` +
					`${student.firstName} ${student.lastName}: ${title}`
			});

			return {
				success: 'Comunicado registrado exitosamente'
			};
		} catch (caught) {
			console.error('Error al registrar comunicado:', caught);

			return fail(500, {
				error: 'Error al registrar el comunicado'
			});
		}
	}
};
