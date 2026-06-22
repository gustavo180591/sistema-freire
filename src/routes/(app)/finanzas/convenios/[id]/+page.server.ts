import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';
import { error, redirect } from '@sveltejs/kit';
import type { UserRole } from '$lib/server/payment-agreements/payment-agreement-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function load({ locals, params }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userRoles = (locals.user.roles || []) as UserRole[];

	// Check if user can view agreements
	const canView = userRoles.some(
		(role) =>
			role === 'SUPERADMIN' ||
			role === 'DIRECTOR' ||
			role === 'FINANZAS' ||
			role === 'SECRETARIA' ||
			role === 'ALUMNO'
	);

	if (!canView) {
		throw error(403, 'No tienes permiso para ver convenios de pago');
	}

	const agreement = await paymentAgreementService.getAgreementById(
		params.id,
		userRoles,
		locals.user.id
	);

	if (!agreement) {
		throw error(404, 'Convenio no encontrado');
	}

	const summary = await paymentAgreementService.getAgreementSummary(
		params.id,
		userRoles,
		locals.user.id
	);

	return {
		agreement,
		summary
	};
}

export const actions = {
	activate: async ({ locals, params }) => {
		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		const userRoles = (locals.user.roles || []) as UserRole[];

		try {
			const agreement = await paymentAgreementService.activateAgreement(
				params.id,
				userRoles,
				locals.user.id,
				`${locals.user.firstName} ${locals.user.lastName}`
			);

			return { success: true, agreement };
		} catch (err) {
			console.error('Error activating payment agreement:', err);
			return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
		}
	}
};
