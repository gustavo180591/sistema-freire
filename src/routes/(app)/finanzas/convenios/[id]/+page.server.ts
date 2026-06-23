import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';
import { error, redirect } from '@sveltejs/kit';
import type { UserRole } from '$lib/server/payment-agreements/payment-agreement-service';
import { Decimal } from '@prisma/client/runtime/library';

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

	// Get payments with receipts for this agreement
	const { prisma } = await import('$lib/server/db/prisma');
	const paymentsWithReceipts = await prisma.payment.findMany({
		where: {
			isCancelled: false,
			allocations: {
				some: {
					installment: {
						agreementId: params.id
					}
				}
			}
		},
		include: {
			receipt: true,
			allocations: {
				where: {
					installmentId: { not: null }
				},
				include: {
					installment: true
				}
			}
		},
		orderBy: { paidAt: 'desc' }
	});

	return {
		agreement,
		summary,
		paymentsWithReceipts: paymentsWithReceipts.map((p) => ({
			id: p.id,
			paidAt: p.paidAt,
			amount: p.amount,
			method: p.method,
			reference: p.reference,
			receipt: p.receipt ? {
				id: p.receipt.id,
				receiptNumber: p.receipt.receiptNumber,
				receiptYear: p.receipt.receiptYear,
				issuedAt: p.receipt.issuedAt,
				totalAmount: p.receipt.totalAmount
			} : null,
			installment: p.allocations[0]?.installment || null
		}))
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
	},

	registerPayment: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		const userRoles = (locals.user.roles || []) as UserRole[];

		const formData = await request.formData();
		const installmentId = formData.get('installmentId') as string;
		const amount = formData.get('amount') as string;
		const method = formData.get('method') as string;
		const reference = formData.get('reference') as string | null;
		const notes = formData.get('notes') as string | null;

		if (!installmentId || !amount || !method) {
			return { success: false, error: 'Faltan datos requeridos' };
		}

		try {
			const result = await paymentAgreementService.registerInstallmentPayment(
				{
					installmentId,
					amount: new Decimal(amount),
					method,
					reference: reference || undefined,
					notes: notes || undefined,
					paidBy: locals.user.id,
					paidByName: `${locals.user.firstName} ${locals.user.lastName}`
				},
				userRoles,
				locals.user.id
			);

			return { success: true, result };
		} catch (err) {
			console.error('Error registering payment:', err);
			return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
		}
	}
};
