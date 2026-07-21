import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';
import { checkAndExpireScholarshipsForStudent } from '$lib/server/financial/scholarship-expiration-service';
import { createReceiptForPayment } from '$lib/server/financial/receipt-service';

export const load: PageServerLoad = async ({ url }) => {
	const studentId = url.searchParams.get('studentId');

	const students = await prisma.student.findMany({
		where: { status: 'ACTIVE' },
		select: {
			id: true,
			firstName: true,
			lastName: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	let selectedStudent = null;
	let charges: Array<{
		id: string;
		concept: string;
		conceptCode: string;
		periodLabel: string;
		amount: number;
		paidAmount: number;
		finalAmount: number;
		pending: number;
		scholarshipApplied: number;
		lateFeeApplied: number;
		discountApplied: number;
		status: string;
		dueDate: string | null;
	}> = [];

	if (studentId) {
		// Validar que el alumno existe
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: {
				id: true,
				firstName: true,
				lastName: true
			}
		});

		if (student) {
			selectedStudent = {
				id: student.id,
				fullName: `${student.firstName} ${student.lastName}`.trim()
			};

			// Cargar cargos pendientes
			const studentCharges = await prisma.studentCharge.findMany({
				where: {
					studentId,
					status: {
						in: ['PENDING', 'PARTIAL']
					}
				},
				include: {
					concept: true
				},
				orderBy: [{ dueDate: 'asc' }, { periodLabel: 'asc' }]
			});

			charges = studentCharges.map((charge) => ({
				id: charge.id,
				concept: charge.concept.name,
				conceptCode: charge.concept.code,
				periodLabel: charge.periodLabel,
				amount: Number(charge.amount),
				paidAmount: Number(charge.paidAmount),
				finalAmount: Number(charge.finalAmount),
				pending: Number(charge.finalAmount) - Number(charge.paidAmount),
				scholarshipApplied: Number(charge.scholarshipApplied),
				lateFeeApplied: Number(charge.lateFeeApplied),
				discountApplied: Number(charge.discountApplied),
				status: charge.status,
				dueDate: charge.dueDate ? charge.dueDate.toISOString() : null
			}));
		}
	}

	return {
		students: students.map((s) => ({
			id: s.id,
			fullName: `${s.firstName} ${s.lastName}`.trim()
		})),
		selectedStudent,
		charges
	};
};

export const actions: Actions = {
	getCharges: async ({ request }) => {
		const form = await request.formData();
		const studentId = String(form.get('studentId') ?? '');

		if (!studentId) {
			return fail(400, { message: 'Alumno es obligatorio' });
		}

		const charges = await prisma.studentCharge.findMany({
			where: {
				studentId,
				status: {
					in: ['PENDING', 'PARTIAL']
				}
			},
			include: {
				concept: true
			},
			orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
		});

		return {
			charges: charges.map((charge) => ({
				id: charge.id,
				concept: charge.concept.name,
				conceptCode: charge.concept.code,
				periodLabel: charge.periodLabel,
				amount: Number(charge.amount),
				paidAmount: Number(charge.paidAmount),
				finalAmount: Number(charge.finalAmount),
				pending: Number(charge.amount) - Number(charge.paidAmount),
				scholarshipApplied: Number(charge.scholarshipApplied),
				lateFeeApplied: Number(charge.lateFeeApplied),
				discountApplied: Number(charge.discountApplied)
			}))
		};
	},
	create: async ({ request, locals }) => {
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
		const chargeIdsStr = String(form.get('chargeIds') ?? '');

		if (!studentId || amount <= 0) {
			return fail(400, {
				message: 'Alumno e importe son obligatorios'
			});
		}

		// Parsear chargeIds seleccionados
		const chargeIds = chargeIdsStr ? chargeIdsStr.split(',').filter((id) => id.length > 0) : [];

		// Validar que los chargeIds pertenecen al alumno
		if (chargeIds.length > 0) {
			const charges = await prisma.studentCharge.findMany({
				where: {
					id: { in: chargeIds },
					studentId
				},
				select: { id: true }
			});

			if (charges.length !== chargeIds.length) {
				return fail(400, {
					message: 'Uno o más cargos no pertenecen al alumno seleccionado'
				});
			}
		}

		// Expirar becas vencidas antes de registrar pago
		if (locals.user) {
			await checkAndExpireScholarshipsForStudent(
				studentId,
				locals.user.id,
				`${locals.user.firstName} ${locals.user.lastName}`
			);
		}

		// Obtener cargos a imputar (seleccionados o todos los pendientes)
		const chargesToAllocate =
			chargeIds.length > 0
				? await prisma.studentCharge.findMany({
						where: {
							id: { in: chargeIds },
							studentId
						},
						orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
					})
				: await prisma.studentCharge.findMany({
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

			for (const charge of chargesToAllocate) {
				if (remaining <= 0) break;

				const pending = Number(charge.finalAmount) - Number(charge.paidAmount);
				if (pending <= 0) continue;

				const applied = Math.min(remaining, pending);
				const nextPaid = Number(charge.paidAmount) + applied;
				const nextPending = Number(charge.finalAmount) - nextPaid;

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

		// Crear recibo para el pago
		if (locals.user) {
			const receipt = await createReceiptForPayment(payment.id, locals.user.id);

			// Auditoría del recibo
			await auditLog({
				action: AuditAction.CREATE,
				entityType: 'RECEIPT',
				entityId: receipt.id,
				description: `Recibo generado: ${receipt.receiptNumber}/${receipt.receiptYear}`
			});

			throw redirect(303, `/recibos/${receipt.id}`);
		}

		throw redirect(303, `/finanzas/${payment.id}`);
	}
};
