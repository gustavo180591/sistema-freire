import { error, fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { prisma } from '$lib/server/db/prisma';
import { financialService } from '$lib/server/financial/financial-service';
import { requirePermission } from '$lib/server/auth/permissions-granular';

function getErrorMessage(value: unknown, fallback: string): string {
	return value instanceof Error ? value.message : fallback;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	await requirePermission(locals.user, 'RECEIPT', 'read');

	const receipts = await prisma.receipt.findMany({
		orderBy: [{ issuedAt: 'desc' }, { receiptNumber: 'desc' }],
		select: {
			id: true,
			receiptNumber: true,
			receiptYear: true,
			pointOfSale: true,
			studentId: true,
			studentName: true,
			studentDni: true,
			locationName: true,
			totalAmount: true,
			paymentMethod: true,
			issuedAt: true,
			issuedByName: true,
			status: true,
			cancelledAt: true
		}
	});

	return {
		receipts: receipts.map((receipt) => ({
			...receipt,
			totalAmount: Number(receipt.totalAmount),
			issuedAt: receipt.issuedAt.toISOString(),
			cancelledAt: receipt.cancelledAt?.toISOString() ?? null
		}))
	};
};

export const actions: Actions = {
	issueReceipt: async ({ request, locals }) => {
		const userId = locals.user?.id;

		if (!userId) {
			throw error(401, 'No autenticado');
		}

		await requirePermission(locals.user, 'RECEIPT', 'create');

		const formData = await request.formData();
		const paymentIds = formData.get('paymentIds')?.toString();
		const observations = formData.get('observations')?.toString().trim() || undefined;

		if (!paymentIds) {
			return fail(400, {
				error: 'Debe seleccionar al menos un pago'
			});
		}

		try {
			const paymentIdsArray = JSON.parse(paymentIds);

			const result = await financialService.issueReceipt({
				paymentIds: paymentIdsArray,
				userId,
				observations
			});

			return {
				success: true,
				receiptId: result.receipt.id
			};
		} catch (cause: unknown) {
			return fail(400, {
				error: getErrorMessage(cause, 'Error al emitir recibo')
			});
		}
	},

	cancelReceipt: async ({ request, locals }) => {
		const userId = locals.user?.id;

		if (!userId) {
			throw error(401, 'No autenticado');
		}

		await requirePermission(locals.user, 'RECEIPT', 'update');

		const formData = await request.formData();
		const receiptId = formData.get('receiptId')?.toString();
		const reason = formData.get('reason')?.toString().trim();

		if (!receiptId || !reason) {
			return fail(400, {
				error: 'Faltan datos requeridos'
			});
		}

		try {
			await financialService.cancelReceipt({
				receiptId,
				reason,
				userId
			});

			return {
				success: true
			};
		} catch (cause: unknown) {
			return fail(400, {
				error: getErrorMessage(cause, 'Error al anular recibo')
			});
		}
	},

	reprintReceipt: async ({ request, locals }) => {
		const userId = locals.user?.id;

		if (!userId) {
			throw error(401, 'No autenticado');
		}

		await requirePermission(locals.user, 'RECEIPT', 'read');

		const formData = await request.formData();
		const receiptId = formData.get('receiptId')?.toString();

		if (!receiptId) {
			return fail(400, {
				error: 'Falta el ID del recibo'
			});
		}

		try {
			await financialService.reprintReceipt({
				receiptId,
				userId
			});

			return {
				success: true
			};
		} catch (cause: unknown) {
			return fail(400, {
				error: getErrorMessage(cause, 'Error al reimprimir recibo')
			});
		}
	}
};
