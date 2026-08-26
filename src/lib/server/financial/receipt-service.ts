import { prisma } from '$lib/server/db/prisma';

/**
 * Datos de respaldo para recibos históricos que todavía no tienen
 * snapshot institucional.
 */
export const INSTITUTIONAL_DATA = {
	name: 'Instituto Superior de Formación Docente',
	code: 'PAULO FREIRE',
	codeNumber: '1117',
	owner: 'SIDEPP',
	email: '',
	address: '',
	phone: '',
	website: '',
	taxStatus: 'IVA EXENTO',
	cuit: '',
	grossIncome: '',
	activityStart: null
} as const;

/**
 * Crea el recibo correspondiente a un pago.
 *
 * La numeración se administra por localidad y punto de venta.
 * El incremento del contador y la creación del recibo ocurren
 * dentro de la misma transacción.
 */
export async function createReceiptForPayment(paymentId: string, userId: string) {
	const payment = await prisma.payment.findUnique({
		where: {
			id: paymentId
		},
		include: {
			student: {
				include: {
					career: true,
					location: true
				}
			},
			allocations: {
				include: {
					charge: {
						include: {
							concept: true
						}
					}
				}
			},
			user: true
		}
	});

	if (!payment) {
		throw new Error('Pago no encontrado');
	}

	/*
	 * Evita emitir dos recibos si la función se vuelve a ejecutar
	 * accidentalmente para el mismo pago.
	 */
	if (payment.receiptId) {
		const existingReceipt = await prisma.receipt.findUnique({
			where: {
				id: payment.receiptId
			}
		});

		if (existingReceipt) {
			return existingReceipt;
		}
	}

	const locationId = payment.student.locationId;
	const studentLocation = payment.student.location;

	if (!locationId || !studentLocation) {
		throw new Error(
			'No se puede emitir el recibo porque el alumno no tiene una localidad/sede asignada'
		);
	}

	/*
	 * Buscar movimientos de condonación para incluir el motivo
	 * dentro de las observaciones impresas.
	 */
	const chargeIds = payment.allocations
		.map((allocation) => allocation.chargeId)
		.filter((id): id is string => id !== null);

	const forgivenessMovements =
		chargeIds.length > 0
			? await prisma.financialMovement.findMany({
					where: {
						entityType: 'STUDENT_CHARGE',
						entityId: {
							in: chargeIds
						},
						movementType: 'DISCOUNT'
					}
				})
			: [];

	let observations = payment.notes?.trim() ?? '';

	const forgivenessNotes: string[] = [];

	for (const movement of forgivenessMovements) {
		const metadata = movement.metadata as { reason?: string } | null;

		if (metadata?.reason?.trim()) {
			forgivenessNotes.push(`Condonación autorizada: ${metadata.reason.trim()}`);
		}
	}

	if (forgivenessNotes.length > 0) {
		observations = observations
			? `${observations}\n${forgivenessNotes.join('\n')}`
			: forgivenessNotes.join('\n');
	}

	const currentYear = new Date().getFullYear();

	const receipt = await prisma.$transaction(async (tx) => {
		/*
		 * La configuración debe existir antes de emitir recibos.
		 */
		const currentConfig = await tx.receiptLocationConfig.findUnique({
			where: {
				locationId
			},
			select: {
				id: true
			}
		});

		if (!currentConfig) {
			throw new Error(`No existe configuración de recibos para ${studentLocation.name}`);
		}

		/*
		 * PostgreSQL bloqueará esta fila durante el UPDATE.
		 * Dos pagos simultáneos no recibirán el mismo número.
		 */
		const config = await tx.receiptLocationConfig.update({
			where: {
				locationId
			},
			data: {
				lastReceiptNumber: {
					increment: 1
				}
			},
			select: {
				institutionName: true,
				institutionCode: true,
				institutionCodeNumber: true,
				institutionOwner: true,
				institutionAddress: true,
				institutionCuit: true,
				institutionPhone: true,
				institutionEmail: true,
				institutionWebsite: true,
				taxStatus: true,
				grossIncome: true,
				activityStartDate: true,
				receiptLetter: true,
				pointOfSale: true,
				lastReceiptNumber: true,
				signatureLeftLabel: true,
				signatureRightLabel: true
			}
		});

		const receiptNumber = config.lastReceiptNumber;

		const createdReceipt = await tx.receipt.create({
			data: {
				receiptNumber,
				receiptYear: currentYear,

				locationId,
				locationName: studentLocation.name,

				receiptLetter: config.receiptLetter,
				pointOfSale: config.pointOfSale,

				institutionName: config.institutionName,
				institutionCode: config.institutionCode,
				institutionCodeNumber: config.institutionCodeNumber,
				institutionOwner: config.institutionOwner,
				institutionEmail: config.institutionEmail,
				institutionAddress: config.institutionAddress,
				institutionPhone: config.institutionPhone,
				institutionWebsite: config.institutionWebsite,
				institutionTaxStatus: config.taxStatus,
				institutionCuit: config.institutionCuit,
				institutionGrossIncome: config.grossIncome,
				institutionActivityStart: config.activityStartDate,

				signatureLeftLabel: config.signatureLeftLabel,
				signatureRightLabel: config.signatureRightLabel,

				studentId: payment.studentId,
				studentName: `${payment.student.firstName} ${payment.student.lastName}`,
				studentDni: payment.student.dni,
				studentAddress: payment.student.address,

				totalAmount: payment.amount,

				paymentMethod: payment.method,
				paymentReference: payment.reference,

				issuedBy: userId,
				issuedByName: payment.user
					? `${payment.user.firstName} ${payment.user.lastName}`
					: 'Sistema',

				observations: observations || null
			}
		});

		/*
		 * Un ReceiptItem representa lo efectivamente imputado
		 * a ese concepto dentro de este pago.
		 *
		 * Valor: importe nominal de la cuota.
		 * Rec.: recargo.
		 * Desc.: beca/condonación total aplicada.
		 * A pagar: importe imputado en este recibo.
		 */
		for (const allocation of payment.allocations) {
			const charge = allocation.charge;

			if (!charge) continue;

			await tx.receiptItem.create({
				data: {
					receiptId: createdReceipt.id,
					chargeId: charge.id,

					concept: charge.concept.name,
					periodLabel: charge.periodLabel,

					baseAmount: charge.amount,
					lateFeeAmount: charge.lateFeeApplied,
					discountAmount: charge.discountApplied,
					finalAmount: allocation.amount
				}
			});
		}

		await tx.payment.update({
			where: {
				id: paymentId
			},
			data: {
				receiptId: createdReceipt.id
			}
		});

		return createdReceipt;
	});

	return receipt;
}

/**
 * Obtiene el recibo completo para visualización/impresión.
 */
export async function getReceiptById(receiptId: string) {
	const receipt = await prisma.receipt.findUnique({
		where: {
			id: receiptId
		},
		include: {
			items: true,
			payments: true,
			location: true
		}
	});

	if (!receipt) {
		return null;
	}

	const student = await prisma.student.findUnique({
		where: {
			id: receipt.studentId
		},
		include: {
			career: true,
			location: true
		}
	});

	const chargeIds = receipt.items
		.map((item) => item.chargeId)
		.filter((id): id is string => id !== null);

	const charges =
		chargeIds.length > 0
			? await prisma.studentCharge.findMany({
					where: {
						id: {
							in: chargeIds
						}
					},
					include: {
						concept: true
					}
				})
			: [];

	const chargeMap = new Map(charges.map((charge) => [charge.id, charge]));

	return {
		...receipt,

		totalAmount: Number(receipt.totalAmount),

		student,

		items: receipt.items.map((item) => {
			const charge = item.chargeId ? chargeMap.get(item.chargeId) : null;

			return {
				...item,

				baseAmount: Number(item.baseAmount),
				lateFeeAmount: Number(item.lateFeeAmount),
				discountAmount: Number(item.discountAmount),
				finalAmount: Number(item.finalAmount),

				charge: charge
					? {
							id: charge.id,
							concept: charge.concept,
							amount: Number(charge.amount),
							paidAmount: Number(charge.paidAmount),
							finalAmount: Number(charge.finalAmount),
							scholarshipApplied: Number(charge.scholarshipApplied),
							lateFeeApplied: Number(charge.lateFeeApplied),
							discountApplied: Number(charge.discountApplied)
						}
					: null
			};
		}),

		payments: receipt.payments.map((payment) => ({
			...payment,
			amount: Number(payment.amount)
		}))
	};
}
