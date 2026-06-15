import { error, fail, redirect } from '@sveltejs/kit';
import { financialService } from '$lib/server/financial/financial-service';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: RequestEvent) {
	const userId = locals.user?.id;
	if (!userId) {
		throw redirect(302, '/login');
	}

	return { userId };
}

export const actions = {
	issueReceipt: async ({ request, locals }: RequestEvent) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const paymentIds = formData.get('paymentIds') as string;
		const observations = formData.get('observations') as string | null;

		if (!paymentIds) {
			return fail(400, { error: 'Debe seleccionar al menos un pago' });
		}

		try {
			const paymentIdsArray = JSON.parse(paymentIds);
			const result = await financialService.issueReceipt({
				paymentIds: paymentIdsArray,
				userId,
				observations: observations || undefined
			});

			return { success: true, receiptId: result.receipt.id };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al emitir recibo' });
		}
	},

	cancelReceipt: async ({ request, locals }: RequestEvent) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const receiptId = formData.get('receiptId') as string;
		const reason = formData.get('reason') as string;

		if (!receiptId || !reason) {
			return fail(400, { error: 'Faltan datos requeridos' });
		}

		try {
			await financialService.cancelReceipt({
				receiptId,
				reason,
				userId
			});

			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al anular recibo' });
		}
	},

	reprintReceipt: async ({ request, locals }: RequestEvent) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const receiptId = formData.get('receiptId') as string;

		if (!receiptId) {
			return fail(400, { error: 'Falta el ID del recibo' });
		}

		try {
			await financialService.reprintReceipt({
				receiptId,
				userId
			});

			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Error al reimprimir recibo' });
		}
	}
};
