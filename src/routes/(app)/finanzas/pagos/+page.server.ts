import { fail } from '@sveltejs/kit';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '$lib/server/db/prisma';
import { financialService } from '$lib/server/financial/financial-service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Obtener alumnos activos
	const students = await prisma.student.findMany({
		where: { status: 'ACTIVE' },
		include: { user: true },
		orderBy: { user: { firstName: 'asc' } }
	});

	// Obtener conceptos de cuota activos
	const concepts = await prisma.chargeConcept.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	// Obtener ciclos lectivos activos
	const academicTerms = await prisma.academicTerm.findMany({
		where: { active: true },
		orderBy: { startDate: 'desc' }
	});

	return {
		students,
		concepts,
		academicTerms
	};
};

export const actions: Actions = {
	registerPayment: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'Usuario no autenticado' });
		}

		try {
			const studentId = formData.get('studentId') as string;
			const amount = new Decimal(formData.get('amount') as string);
			const method = formData.get('method') as string;
			const reference = formData.get('reference') as string | null;
			const paidAt = formData.get('paidAt') as string | null;
			const notes = formData.get('notes') as string | null;
			const chargeIds = formData.get('chargeIds') as string | null;

			if (!studentId || !amount || !method) {
				return fail(400, { error: 'Faltan campos requeridos' });
			}

			const chargeIdsArray = chargeIds ? chargeIds.split(',').filter(Boolean) : undefined;

			const result = await financialService.registerPayment({
				studentId,
				amount,
				method: method as any,
				reference: reference || undefined,
				paidAt: paidAt ? new Date(paidAt) : undefined,
				notes: notes || undefined,
				userId,
				chargeIds: chargeIdsArray
			});

			return { success: true, payment: result.payment };
		} catch (error) {
			console.error('Error al registrar pago:', error);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Error al registrar pago'
			});
		}
	},

	cancelPayment: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'Usuario no autenticado' });
		}

		try {
			const paymentId = formData.get('paymentId') as string;
			const reason = formData.get('reason') as string;

			if (!paymentId || !reason) {
				return fail(400, { error: 'Faltan campos requeridos' });
			}

			await financialService.cancelPayment(paymentId, reason, userId);

			return { success: true };
		} catch (error) {
			console.error('Error al anular pago:', error);
			return fail(500, { error: error instanceof Error ? error.message : 'Error al anular pago' });
		}
	}
};
