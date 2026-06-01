import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

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

	// Obtener comunicados recientes (usando StudentFollowUp con tipo MEETING o NOTE)
	const recentCommunications = await prisma.studentFollowUp.findMany({
		where: {
			type: {
				in: ['MEETING', 'NOTE']
			}
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			creator: true
		},
		orderBy: { createdAt: 'desc' },
		take: 20
	});

	// Obtener documentos pendientes de estudiantes
	const pendingDocuments = await prisma.studentDocument.findMany({
		where: {
			verified: false
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			uploader: true
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
		recentCommunications: recentCommunications.map(c => ({
			id: c.id,
			studentName: `${c.student.lastName}, ${c.student.firstName}`,
			studentDni: c.student.dni,
			type: c.type,
			title: c.title,
			description: c.description,
			createdAt: c.createdAt
		})),
		pendingDocuments: pendingDocuments.map(d => ({
			id: d.id,
			studentName: `${d.student.lastName}, ${d.student.firstName}`,
			studentDni: d.student.dni,
			documentType: d.type,
			fileName: d.name,
			uploadedAt: d.createdAt
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
			// Obtener datos del estudiante para auditoría
			const student = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			await prisma.studentFollowUp.create({
				data: {
					studentId,
					type: type as any,
					title,
					description,
					createdBy: locals.user!.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user!.id,
				action: AuditAction.CREATE,
				entityType: 'STUDENT_FOLLOW_UP',
				entityId: studentId,
				description: `Registro de comunicado (${type}): ${title} para ${student?.firstName} ${student?.lastName}`
			});

			return { success: 'Comunicado registrado exitosamente' };
		} catch (error) {
			console.error('Error al registrar comunicado:', error);
			return { error: 'Error al registrar el comunicado' };
		}
	}
};
