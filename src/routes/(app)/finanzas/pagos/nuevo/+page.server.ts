import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async () => {
	const students = await prisma.student.findMany({
		where: { status: 'ACTIVE' },
		select: {
			id: true,
			firstName: true,
			lastName: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	return {
		students: students.map((s) => ({
			id: s.id,
			fullName: `${s.firstName} ${s.lastName}`.trim()
		})),
		pendingCharges: [] as Array<{
			periodLabel: string;
			concept: string;
			pending: number;
		}>
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();

		const studentId = String(form.get('studentId') ?? '');
		const amount = Number(form.get('amount') ?? 0);
		const method = String(form.get('method') ?? 'CASH') as
			| 'CASH'
			| 'BANK_TRANSFER'
			| 'DEBIT_CARD'
			| 'CREDIT_CARD'
			| 'QR'
			| 'SCHOLARSHIP';
		const reference = String(form.get('reference') ?? '');
		const notes = String(form.get('notes') ?? '');

		if (!studentId || amount <= 0) {
			return fail(400, {
				message: 'Alumno e importe son obligatorios'
			});
		}

		const pendingCharges = await prisma.studentCharge.findMany({
			where: {
				studentId,
				status: {
					in: ['PENDING', 'PARTIAL']
				}
			},
			orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
		});

		const payment = await prisma.$transaction(async (tx) => {
			const createdPayment = await tx.payment.create({
				data: {
					studentId,
					amount,
					method,
					reference: reference || null,
					notes: notes || null
				}
			});

			let remaining = amount;

			for (const charge of pendingCharges) {
				if (remaining <= 0) break;

				const pending = Number(charge.amount) - Number(charge.paidAmount);
				if (pending <= 0) continue;

				const applied = Math.min(remaining, pending);
				const nextPaid = Number(charge.paidAmount) + applied;
				const nextPending = Number(charge.amount) - nextPaid;

				await tx.paymentAllocation.create({
					data: {
						paymentId: createdPayment.id,
						chargeId: charge.id,
						amount: applied
					}
				});

				await tx.studentCharge.update({
					where: { id: charge.id },
					data: {
						paidAmount: nextPaid,
						status: nextPending <= 0 ? 'PAID' : nextPaid > 0 ? 'PARTIAL' : 'PENDING'
					}
				});

				remaining -= applied;
			}

			return createdPayment;
		});

		// Registrar en auditoría fuera de la transacción
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			include: { user: true }
		});

		await auditLog({
			action: AuditAction.CREATE,
			entityType: 'PAYMENT',
			entityId: payment.id,
			description: `Pago registrado: ${amount} (${method}) para ${student?.firstName} ${student?.lastName}`
		});

		throw redirect(303, `/finanzas/${payment.id}`);
	}
};
