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

		// Parsear datos de condonación por cargo
		const chargeForgivenessData: Record<
			string,
			{ amountToPay: number; forgivenAmount: number; forgivenessReason: string }
		> = {};
		for (const [key, value] of form.entries()) {
			if (key.startsWith('charge_') && key.endsWith('_amountToPay')) {
				const chargeId = key.replace('charge_', '').replace('_amountToPay', '');
				const amountToPay = Number(value);
				const forgivenAmount = Number(form.get(`charge_${chargeId}_forgivenAmount`) ?? 0);
				const forgivenessReason = String(form.get(`charge_${chargeId}_forgivenessReason`) ?? '');
				chargeForgivenessData[chargeId] = { amountToPay, forgivenAmount, forgivenessReason };
			}
		}

		if (!studentId) {
			return fail(400, {
				message: 'Alumno es obligatorio'
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

		// Verificar permisos para condonación
		const hasForgivenessPermission = locals.user
			? await prisma.userRole.findFirst({
					where: {
						userId: locals.user.id,
						role: {
							code: {
								in: ['SUPERADMIN', 'DIRECTOR', 'FINANZAS', 'SECRETARIA']
							}
						}
					}
				})
			: null;

		// Validar datos de condonación
		for (const [chargeId, data] of Object.entries(chargeForgivenessData)) {
			if (data.amountToPay < 0) {
				return fail(400, {
					message: 'El monto a cobrar no puede ser negativo'
				});
			}

			if (data.forgivenAmount < 0) {
				return fail(400, {
					message: 'El monto condonado no puede ser negativo'
				});
			}

			// Si hay condonación, verificar permisos y motivo
			if (data.forgivenAmount > 0) {
				if (!hasForgivenessPermission) {
					return fail(403, {
						message: 'No tenés permisos para condonar deuda'
					});
				}

				if (!data.forgivenessReason || data.forgivenessReason.trim().length === 0) {
					return fail(400, {
						message: 'El motivo de condonación es obligatorio cuando hay monto condonado'
					});
				}
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
			let createdPayment = null;
			let remaining = amount;

			// Si hay monto a pagar, crear el pago
			if (amount > 0) {
				createdPayment = await tx.payment.create({
					data: {
						studentId,
						amount,
						method,
						reference: reference || null,
						notes: notes || null
					}
				});
			}

			// Procesar cada cargo con sus datos de condonación
			for (const charge of chargesToAllocate) {
				const forgivenessData = chargeForgivenessData[charge.id];
				const amountToPay =
					forgivenessData?.amountToPay ?? Number(charge.finalAmount) - Number(charge.paidAmount);
				const forgivenAmount = forgivenessData?.forgivenAmount ?? 0;
				const forgivenessReason = forgivenessData?.forgivenessReason ?? '';

				// Calcular pending real desde base de datos
				const pending = Number(charge.finalAmount) - Number(charge.paidAmount);

				// Validar que amountToPay <= pending
				if (amountToPay > pending) {
					throw new Error(
						`El monto a cobrar (${amountToPay}) no puede ser mayor al pendiente (${pending}) para el cargo ${charge.id}`
					);
				}

				// Aplicar condonación si existe
				if (forgivenAmount > 0) {
					// Validar que forgivenAmount = pending - amountToPay
					const expectedForgiven = pending - amountToPay;
					if (Math.abs(forgivenAmount - expectedForgiven) > 0.01) {
						throw new Error(
							`El monto condonado (${forgivenAmount}) no coincide con la diferencia (${expectedForgiven}) para el cargo ${charge.id}`
						);
					}

					// Actualizar cargo con condonación
					const newDiscount = Number(charge.discountApplied) + forgivenAmount;
					const newFinalAmount = Number(charge.finalAmount) - forgivenAmount;

					await tx.studentCharge.update({
						where: { id: charge.id },
						data: {
							discountApplied: newDiscount,
							finalAmount: newFinalAmount
						}
					});

					// Registrar FinancialMovement para la condonación
					await tx.financialMovement.create({
						data: {
							studentId,
							movementType: 'DISCOUNT',
							entityType: 'STUDENT_CHARGE',
							entityId: charge.id,
							description: 'Condonación de deuda autorizada',
							amount: forgivenAmount,
							balanceBefore: Number(charge.finalAmount),
							balanceAfter: newFinalAmount,
							metadata: {
								originalFinalAmount: Number(charge.finalAmount),
								originalPaidAmount: Number(charge.paidAmount),
								originalPendingAmount: pending,
								amountToPay,
								forgivenAmount,
								reason: forgivenessReason,
								approvedByUserId: locals.user?.id,
								approvedByName: locals.user
									? `${locals.user.firstName} ${locals.user.lastName}`
									: null,
								createdFrom: 'finanzas/pagos/nuevo'
							},
							userId: locals.user?.id
						}
					});
				}

				// Aplicar pago si existe
				if (amountToPay > 0 && createdPayment) {
					if (remaining <= 0) break;

					const applied = Math.min(remaining, amountToPay);
					const nextPaid = Number(charge.paidAmount) + applied;
					const nextFinalAmount = Number(charge.finalAmount) - (forgivenAmount || 0);
					const nextPending = nextFinalAmount - nextPaid;

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
				} else if (forgivenAmount > 0 && amountToPay === 0) {
					// Caso especial: condonación total sin pago
					const nextFinalAmount = Number(charge.finalAmount) - forgivenAmount;
					const nextPending = nextFinalAmount - Number(charge.paidAmount);

					await tx.studentCharge.update({
						where: { id: charge.id },
						data: {
							status:
								nextPending <= 0 ? 'PAID' : Number(charge.paidAmount) > 0 ? 'PARTIAL' : 'PENDING'
						}
					});
				}
			}

			return createdPayment;
		});

		// Registrar en auditoría fuera de la transacción
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			include: { user: true }
		});

		if (payment) {
			await auditLog({
				action: AuditAction.CREATE,
				entityType: 'PAYMENT',
				entityId: payment.id,
				description: `Pago registrado: ${amount} (${method}) para ${student?.firstName} ${student?.lastName}`
			});
		}

		// Registrar auditoría de condonaciones
		for (const [chargeId, data] of Object.entries(chargeForgivenessData)) {
			if (data.forgivenAmount > 0) {
				await auditLog({
					action: AuditAction.UPDATE,
					entityType: 'STUDENT_CHARGE',
					entityId: chargeId,
					description: `Condonación de deuda: ${data.forgivenAmount} - Motivo: ${data.forgivenessReason}`
				});
			}
		}

		// Crear recibo para el pago si existe
		if (payment && locals.user) {
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

		// Si no hay pago pero hay condonaciones, redirigir a finanzas del alumno
		if (!payment && Object.keys(chargeForgivenessData).length > 0) {
			throw redirect(303, `/alumnos/${studentId}/finanzas`);
		}

		throw redirect(303, `/finanzas/${payment?.id || ''}`);
	}
};
