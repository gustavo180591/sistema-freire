import { prisma } from '$lib/server/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Servicio para generar y gestionar recibos de pagos de alumnos
 */

/**
 * Genera el siguiente número de recibo secuencial para el año actual
 */
export async function getNextReceiptNumber(): Promise<{ number: number; year: number }> {
	const currentYear = new Date().getFullYear();

	const receiptNumber = await prisma.receiptNumber.findUnique({
		where: { year: currentYear }
	});

	if (receiptNumber) {
		const nextNumber = receiptNumber.lastNumber + 1;
		await prisma.receiptNumber.update({
			where: { year: currentYear },
			data: { lastNumber: nextNumber }
		});
		return { number: nextNumber, year: currentYear };
	} else {
		await prisma.receiptNumber.create({
			data: { year: currentYear, lastNumber: 1 }
		});
		return { number: 1, year: currentYear };
	}
}

/**
 * Datos institucionales para el encabezado del recibo
 * TODO: Mover a configuración institucional cuando esté disponible
 */
export const INSTITUTIONAL_DATA = {
	name: 'Instituto Superior de Formación Docente',
	code: 'PAULO FREIRE',
	codeNumber: '1117',
	owner: 'SIDEPP',
	email: 'info@isfdpaulofreire.edu.ar',
	address: 'Dirección Institucional',
	taxStatus: 'IVA EXENTO',
	cuit: 'CUIT-PENDIENTE',
	grossIncome: 'Ingresos Brutos-PENDIENTE',
	activityStart: 'Inicio de Actividades-PENDIENTE'
} as const;

/**
 * Crea un recibo con sus items a partir de un pago
 */
export async function createReceiptForPayment(paymentId: string, userId: string) {
	const payment = await prisma.payment.findUnique({
		where: { id: paymentId },
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

	const { number: receiptNumber, year: receiptYear } = await getNextReceiptNumber();

	const receipt = await prisma.$transaction(async (tx) => {
		// Crear el recibo
		const createdReceipt = await tx.receipt.create({
			data: {
				receiptNumber,
				receiptYear,
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
				observations: payment.notes
			}
		});

		// Crear items del recibo por cada allocation
		for (const allocation of payment.allocations) {
			const charge = allocation.charge;
			if (!charge) continue;

			const baseAmount = charge.amount;
			const lateFeeAmount = charge.lateFeeApplied || new Decimal(0);
			const discountAmount = charge.scholarshipApplied || new Decimal(0);
			const finalAmount = charge.finalAmount;

			await tx.receiptItem.create({
				data: {
					receiptId: createdReceipt.id,
					chargeId: charge.id,
					concept: charge.concept.name,
					periodLabel: charge.periodLabel,
					baseAmount,
					lateFeeAmount,
					discountAmount,
					finalAmount
				}
			});
		}

		// Asociar el pago al recibo
		await tx.payment.update({
			where: { id: paymentId },
			data: { receiptId: createdReceipt.id }
		});

		return createdReceipt;
	});

	return receipt;
}

/**
 * Obtiene un recibo con todos sus datos para mostrar
 */
export async function getReceiptById(receiptId: string) {
	const receipt = await prisma.receipt.findUnique({
		where: { id: receiptId },
		include: {
			items: true,
			payments: true
		}
	});

	if (!receipt) {
		return null;
	}

	// Obtener información del alumno
	const student = await prisma.student.findUnique({
		where: { id: receipt.studentId },
		include: {
			career: true,
			location: true
		}
	});

	// Obtener información adicional de los cargos
	const chargeIds = receipt.items
		.map((item) => item.chargeId)
		.filter((id): id is string => id !== null);
	const charges =
		chargeIds.length > 0
			? await prisma.studentCharge.findMany({
					where: { id: { in: chargeIds } },
					include: { concept: true }
				})
			: [];

	const chargeMap = new Map(charges.map((charge) => [charge.id, charge]));

	// Serializar Decimales a Number
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
