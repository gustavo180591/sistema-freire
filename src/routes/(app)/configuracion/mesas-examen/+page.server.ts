import { AuditAction } from '@prisma/client';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const CONFIG_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

async function requireExamTableConfigAccess(
	user: App.Locals['user'],
	permission: 'read' | 'update'
) {
	if (!user) {
		throw redirect(303, '/login');
	}

	requireRole(user, CONFIG_ROLES);
	await requirePermission(user, 'EVALUATION', permission);
}

export const load: PageServerLoad = async ({ locals }) => {
	await requireExamTableConfigAccess(locals.user, 'read');

	const configs = await prisma.examTableYearConfig.findMany({
		orderBy: {
			year: 'asc'
		}
	});

	return {
		configs
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;

		await requireExamTableConfigAccess(user, 'update');

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		const formData = await request.formData();
		const year = Number(formData.get('year'));

		if (!Number.isInteger(year) || year < 2000 || year > 2100) {
			return fail(400, {
				error: 'Ingresá un año válido'
			});
		}

		const existing = await prisma.examTableYearConfig.findUnique({
			where: { year }
		});

		if (existing) {
			return fail(400, {
				error: `El año ${year} ya está configurado`
			});
		}

		const created = await prisma.examTableYearConfig.create({
			data: {
				year,
				active: true,
				julyEnabled: true,
				novemberDecemberEnabled: true
			}
		});

		await auditLog({
			action: AuditAction.CREATE,
			entityType: 'ExamTableYearConfig',
			entityId: created.id,
			description: `Configuró el año ${year} para mesas de examen`,
			userId: user.id,
			metadata: {
				year,
				active: true,
				julyEnabled: true,
				novemberDecemberEnabled: true
			}
		});

		return {
			success: `Año ${year} agregado correctamente`
		};
	},

	toggleActive: async ({ request, locals }) => {
		const user = locals.user;

		await requireExamTableConfigAccess(user, 'update');

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Configuración inválida' });
		}

		const config = await prisma.examTableYearConfig.findUnique({
			where: { id }
		});

		if (!config) {
			return fail(404, { error: 'Año no encontrado' });
		}

		const updated = await prisma.examTableYearConfig.update({
			where: { id },
			data: {
				active: !config.active
			}
		});

		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'ExamTableYearConfig',
			entityId: config.id,
			description: `${updated.active ? 'Habilitó' : 'Deshabilitó'} el año ${config.year} para mesas`,
			userId: user.id,
			metadata: {
				before: { active: config.active },
				after: { active: updated.active }
			}
		});

		return { success: 'Configuración actualizada' };
	},

	togglePeriod: async ({ request, locals }) => {
		const user = locals.user;

		await requireExamTableConfigAccess(user, 'update');

		if (!user) {
			return fail(401, { error: 'No autenticado' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const period = formData.get('period')?.toString();

		if (!id || !['JULY', 'NOVEMBER_DECEMBER'].includes(period ?? '')) {
			return fail(400, {
				error: 'Período inválido'
			});
		}

		const config = await prisma.examTableYearConfig.findUnique({
			where: { id }
		});

		if (!config) {
			return fail(404, { error: 'Año no encontrado' });
		}

		const data =
			period === 'JULY'
				? { julyEnabled: !config.julyEnabled }
				: {
						novemberDecemberEnabled: !config.novemberDecemberEnabled
					};

		await prisma.examTableYearConfig.update({
			where: { id },
			data
		});

		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'ExamTableYearConfig',
			entityId: config.id,
			description: `Actualizó los turnos de mesas del año ${config.year}`,
			userId: user.id,
			metadata: {
				period
			}
		});

		return { success: 'Turno actualizado' };
	}
};
