import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id },
		include: {
			commissions: {
				include: {
					commission: {
						include: {
							subject: true,
							term: true
						}
					}
				}
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las comisiones asignadas al docente
	const commissions = teacher.commissions.map(ct => ct.commission);

	// Obtener evaluaciones del docente
	const evaluations = await prisma.evaluation.findMany({
		where: {
			createdBy: locals.user.id,
			commissionId: {
				in: commissions.map(c => c.id)
			}
		},
		include: {
			commission: {
				include: {
					subject: true
				}
			},
			creator: true
		},
		orderBy: { date: 'desc' },
		take: 50
	});

	return {
		commissions: commissions.map(c => ({
			id: c.id,
			name: c.name,
			subject: c.subject.name,
			term: c.term.name,
			active: c.active
		})),
		evaluations: evaluations.map(e => ({
			id: e.id,
			title: e.title,
			description: e.description,
			type: e.type,
			date: e.date,
			maxScore: e.maxScore,
			subject: e.commission.subject.name,
			commission: e.commission.name,
			createdAt: e.createdAt,
			creatorName: `${e.creator.firstName} ${e.creator.lastName}`
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const commissionId = data.get('commissionId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const type = data.get('type')?.toString();
		const date = data.get('date')?.toString();
		const maxScore = data.get('maxScore')?.toString();

		if (!commissionId || !title || !type) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que la comisión pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id },
				include: {
					commissions: true
				}
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const teacherCommissionIds = teacher.commissions.map(ct => ct.commissionId);
			if (!teacherCommissionIds.includes(commissionId)) {
				return { error: 'No tenés permiso para crear evaluaciones en esta comisión' };
			}

			// Obtener datos de la comisión para auditoría
			const commission = await prisma.commission.findUnique({
				where: { id: commissionId },
				include: { subject: true }
			});

			await prisma.evaluation.create({
				data: {
					commissionId,
					title,
					description: description || null,
					type,
					date: date ? new Date(date) : null,
					maxScore: maxScore ? parseFloat(maxScore) : 10,
					createdBy: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'EVALUATION',
				entityId: commissionId,
				description: `Evaluación creada: ${type} - ${title} para ${commission?.subject.name}`
			});

			return { success: 'Evaluación creada exitosamente' };
		} catch (error) {
			console.error('Error al crear evaluación:', error);
			return { error: 'Error al crear la evaluación' };
		}
	}
};
