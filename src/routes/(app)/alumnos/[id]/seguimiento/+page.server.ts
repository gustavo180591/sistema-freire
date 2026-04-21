import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { checkPermission } from '$lib/server/auth/permissions-granular';

const FOLLOW_UP_TYPE_LABELS: Record<string, string> = {
	INTERVIEW: 'Entrevista',
	OBSERVATION: 'Observación',
	WARNING: 'Advertencia',
	MEETING: 'Reunión',
	INCIDENT: 'Incidente',
	ACHIEVEMENT: 'Logro',
	NOTE: 'Nota'
};

const FOLLOW_UP_TYPE_COLORS: Record<string, string> = {
	INTERVIEW: 'blue',
	OBSERVATION: 'slate',
	WARNING: 'amber',
	MEETING: 'purple',
	INCIDENT: 'red',
	ACHIEVEMENT: 'emerald',
	NOTE: 'gray'
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	// Verificar permiso de lectura
	const canRead = await checkPermission(user, 'STUDENT', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver seguimientos');
	}

	const studentId = params.id;

	const student = await prisma.student.findUnique({
		where: { id: studentId },
		include: {
			user: { select: { email: true } },
			career: { select: { name: true } },
			followUps: {
				include: {
					creator: { select: { firstName: true, lastName: true } },
					resolver: { select: { firstName: true, lastName: true } }
				},
				orderBy: { date: 'desc' }
			}
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	// Calcular estadísticas
	const totalFollowUps = student.followUps.length;
	const alertsCount = student.followUps.filter(f => f.isAlert).length;
	const unresolvedAlerts = student.followUps.filter(f => f.isAlert && !f.isResolved).length;
	const lastFollowUp = student.followUps[0]?.date ?? null;

	return {
		student: {
			id: student.id,
			fullName: `${student.lastName} ${student.firstName}`,
			dni: student.dni,
			career: student.career.name,
			email: student.user.email
		},
		followUps: student.followUps.map(f => ({
			id: f.id,
			type: f.type,
			typeLabel: FOLLOW_UP_TYPE_LABELS[f.type],
			typeColor: FOLLOW_UP_TYPE_COLORS[f.type],
			title: f.title,
			description: f.description,
			date: f.date,
			isAlert: f.isAlert,
			isResolved: f.isResolved,
			resolvedAt: f.resolvedAt,
			resolvedBy: f.resolver ? `${f.resolver.lastName} ${f.resolver.firstName}` : null,
			createdBy: `${f.creator.lastName} ${f.creator.firstName}`,
			createdAt: f.createdAt,
			attachments: f.attachments ? f.attachments.split(',') : []
		})),
		stats: {
			total: totalFollowUps,
			alerts: alertsCount,
			unresolvedAlerts,
			lastFollowUp
		},
		typeLabels: FOLLOW_UP_TYPE_LABELS,
		canCreate: await checkPermission(user, 'STUDENT', 'update'),
		canResolve: await checkPermission(user, 'STUDENT', 'update')
	};
};

export const actions: Actions = {
	// Crear seguimiento
	create: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para crear seguimientos' });
		}

		const studentId = params.id;
		const formData = await request.formData();
		const type = formData.get('type')?.toString();
		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString();
		const dateStr = formData.get('date')?.toString();
		const isAlert = formData.get('isAlert') === 'true';

		if (!type || !title || !description) {
			return fail(400, { error: 'Tipo, título y descripción son obligatorios' });
		}

		// Validar tipo
		const validTypes = ['INTERVIEW', 'OBSERVATION', 'WARNING', 'MEETING', 'INCIDENT', 'ACHIEVEMENT', 'NOTE'];
		if (!validTypes.includes(type)) {
			return fail(400, { error: 'Tipo de seguimiento inválido' });
		}

		// Validar longitud
		if (title.length > 200) {
			return fail(400, { error: 'El título no puede superar los 200 caracteres' });
		}
		if (description.length > 2000) {
			return fail(400, { error: 'La descripción no puede superar los 2000 caracteres' });
		}

		// Parsear fecha o usar actual
		const date = dateStr ? new Date(dateStr) : new Date();

		// Crear seguimiento
		const followUp = await prisma.studentFollowUp.create({
			data: {
				studentId,
				type: type as import('@prisma/client').FollowUpType,
				title,
				description,
				date,
				createdBy: user.id,
				isAlert
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'CREATE',
			entityType: 'StudentFollowUp',
			entityId: followUp.id,
			description: `Creó seguimiento "${title}" (${type}) para alumno ${studentId}`
		});

		return {
			success: true,
			message: 'Seguimiento creado correctamente'
		};
	},

	// Resolver alerta
	resolve: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para resolver alertas' });
		}

		const formData = await request.formData();
		const followUpId = formData.get('followUpId')?.toString();

		if (!followUpId) {
			return fail(400, { error: 'ID de seguimiento requerido' });
		}

		const followUp = await prisma.studentFollowUp.findFirst({
			where: { id: followUpId, studentId: params.id }
		});

		if (!followUp) {
			return fail(404, { error: 'Seguimiento no encontrado' });
		}

		if (!followUp.isAlert) {
			return fail(400, { error: 'Solo las alertas pueden ser resueltas' });
		}

		if (followUp.isResolved) {
			return fail(400, { error: 'Esta alerta ya fue resuelta' });
		}

		await prisma.studentFollowUp.update({
			where: { id: followUpId },
			data: {
				isResolved: true,
				resolvedAt: new Date(),
				resolvedBy: user.id
			}
		});

		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'StudentFollowUp',
			entityId: followUpId,
			description: `Resolvió alerta "${followUp.title}"`
		});

		return {
			success: true,
			message: 'Alerta resuelta correctamente'
		};
	},

	// Eliminar seguimiento
	delete: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canDelete = await checkPermission(user, 'STUDENT', 'delete');
		if (!canDelete) {
			return fail(403, { error: 'No tenés permiso para eliminar seguimientos' });
		}

		const formData = await request.formData();
		const followUpId = formData.get('followUpId')?.toString();

		if (!followUpId) {
			return fail(400, { error: 'ID de seguimiento requerido' });
		}

		const followUp = await prisma.studentFollowUp.findFirst({
			where: { id: followUpId, studentId: params.id }
		});

		if (!followUp) {
			return fail(404, { error: 'Seguimiento no encontrado' });
		}

		await prisma.studentFollowUp.delete({
			where: { id: followUpId }
		});

		await auditLog({
			userId: user.id,
			action: 'DELETE',
			entityType: 'StudentFollowUp',
			entityId: followUpId,
			description: `Eliminó seguimiento "${followUp.title}" del alumno ${params.id}`
		});

		return {
			success: true,
			message: 'Seguimiento eliminado correctamente'
		};
	}
};
