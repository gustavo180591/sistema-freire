import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import { getBenefitsConfig } from './benefit-calculator';

/**
 * Servicio para manejar la expiración automática de becas por pago fuera de término
 *
 * Regla: Un alumno becado pierde el beneficio de beca de una cuota si el pago
 * se realiza fuera del mes correspondiente de la cuota más los días de tolerancia configurados.
 */

/**
 * Obtiene la fecha de fin del mes a partir de un periodLabel
 * Ejemplo: "2026-07" -> 2026-07-31T23:59:59.999Z
 */
export function getMonthEndFromPeriodLabel(periodLabel: string): Date {
	const [year, month] = periodLabel.split('-').map(Number);
	const lastDay = new Date(year, month, 0); // Día 0 del mes siguiente = último día del mes actual
	lastDay.setHours(23, 59, 59, 999);
	return lastDay;
}

/**
 * Obtiene la fecha de vencimiento de una cuota considerando los días de tolerancia
 * Ejemplo: "2026-07" con 10 días de tolerancia -> 2026-07-10T23:59:59.999Z
 * La cuota vence el día X del mismo mes del período
 */
export async function getChargeDueDate(periodLabel: string): Promise<Date> {
	const [year, month] = periodLabel.split('-').map(Number);
	const config = await getBenefitsConfig(prisma);
	const graceDays = config.paymentDueGraceDays || 0;

	// La fecha de vencimiento es el día X del mismo mes
	const dueDate = new Date(year, month - 1, graceDays);
	dueDate.setHours(23, 59, 59, 999);
	return dueDate;
}

/**
 * Obtiene la fecha de inicio del mes a partir de un periodLabel
 * Ejemplo: "2026-07" -> 2026-07-01T00:00:00.000Z
 */
export function getMonthStartFromPeriodLabel(periodLabel: string): Date {
	const [year, month] = periodLabel.split('-').map(Number);
	return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Verifica si una cuota está completamente pagada dentro de su período
 */
export async function isChargePaidWithinPeriod(charge: {
	paidAmount: { toString: () => string };
	finalAmount: { toString: () => string };
	periodLabel: string;
}): Promise<boolean> {
	const paidAmount = Number(charge.paidAmount);
	const finalAmount = Number(charge.finalAmount);
	const dueDate = await getChargeDueDate(charge.periodLabel);
	const now = new Date();

	// Si está completamente pagada y la fecha actual está dentro del período de tolerancia
	return paidAmount >= finalAmount && now <= dueDate;
}

/**
 * Verifica si una cuota debe expirar su beca
 * Condiciones:
 * - Tiene beca aplicada (scholarshipApplied > 0)
 * - No está completamente pagada
 * - Está fuera del período de tolerancia
 */
export async function shouldExpireScholarshipForCharge(
	charge: {
		scholarshipApplied: { toString: () => string };
		paidAmount: { toString: () => string };
		finalAmount: { toString: () => string };
		periodLabel: string;
	},
	today: Date = new Date()
): Promise<boolean> {
	const scholarshipApplied = Number(charge.scholarshipApplied);
	const paidAmount = Number(charge.paidAmount);
	const finalAmount = Number(charge.finalAmount);
	const dueDate = await getChargeDueDate(charge.periodLabel);

	// No tiene beca aplicada
	if (scholarshipApplied <= 0) {
		return false;
	}

	// Ya está completamente pagada
	if (paidAmount >= finalAmount) {
		return false;
	}

	// Está dentro del período de tolerancia
	if (today <= dueDate) {
		return false;
	}

	// Fuera del período de tolerancia, con beca aplicada y no pagada completamente -> debe expirar
	return true;
}

/**
 * Expira la beca de una cuota específica
 * Recalcula finalAmount y scholarshipApplied
 */
export async function expireScholarshipForCharge(
	tx: Prisma.TransactionClient,
	chargeId: string,
	userId: string,
	userName: string
): Promise<void> {
	const charge = await tx.studentCharge.findUnique({
		where: { id: chargeId },
		include: { concept: true }
	});

	if (!charge) {
		throw new Error(`Cuota no encontrada: ${chargeId}`);
	}

	const scholarshipApplied = Number(charge.scholarshipApplied);
	const paidAmount = Number(charge.paidAmount);
	const amount = Number(charge.amount);

	// Verificar si tiene beca aplicada
	if (scholarshipApplied <= 0) {
		return;
	}

	// Verificar si ya está completamente pagada
	if (paidAmount >= Number(charge.finalAmount)) {
		return;
	}

	// Recalcular: scholarshipApplied = 0, finalAmount = amount
	const newFinalAmount = amount;
	const newScholarshipApplied = 0;

	// Actualizar la cuota
	await tx.studentCharge.update({
		where: { id: chargeId },
		data: {
			scholarshipApplied: newScholarshipApplied,
			finalAmount: newFinalAmount
		}
	});

	// Registrar movimiento financiero de auditoría
	await tx.financialMovement.create({
		data: {
			studentId: charge.studentId,
			movementType: 'CANCELLATION',
			entityType: 'StudentCharge',
			entityId: chargeId,
			description: 'Pérdida automática de beca por pago fuera del mes',
			amount: scholarshipApplied,
			balanceBefore: charge.finalAmount,
			balanceAfter: newFinalAmount,
			metadata: {
				periodLabel: charge.periodLabel,
				conceptName: charge.concept?.name,
				previousScholarshipApplied: scholarshipApplied,
				newScholarshipApplied: newScholarshipApplied,
				previousFinalAmount: Number(charge.finalAmount),
				newFinalAmount: newFinalAmount,
				paidAmount: paidAmount,
				reason: 'SCHOLARSHIP_EXPIRED_OUT_OF_PERIOD',
				userName
			},
			userId
		}
	});
}

/**
 * Expira becas vencidas para un estudiante específico
 * Recorre todas las cuotas del estudiante y expira las que correspondan
 */
export async function expireOverdueScholarshipsForStudent(
	tx: Prisma.TransactionClient,
	studentId: string,
	userId: string,
	userName: string
): Promise<number> {
	const charges = await tx.studentCharge.findMany({
		where: {
			studentId,
			scholarshipApplied: { gt: 0 },
			status: { in: ['PENDING', 'PARTIAL'] }
		},
		include: { concept: true }
	});

	let expiredCount = 0;
	const today = new Date();

	for (const charge of charges) {
		if (await shouldExpireScholarshipForCharge(charge, today)) {
			await expireScholarshipForCharge(tx, charge.id, userId, userName);
			expiredCount++;
		}
	}

	return expiredCount;
}

/**
 * Expira becas vencidas globalmente (para uso en cron)
 * Recorre todos los estudiantes y sus cuotas
 */
export async function expireOverdueScholarshipsGlobally(
	userId: string,
	userName: string
): Promise<{ processedStudents: number; expiredCharges: number }> {
	const students = await prisma.student.findMany({
		where: {
			studentCharges: {
				some: {
					scholarshipApplied: { gt: 0 },
					status: { in: ['PENDING', 'PARTIAL'] }
				}
			}
		},
		select: { id: true }
	});

	let totalExpiredCharges = 0;

	for (const student of students) {
		await prisma.$transaction(async (tx) => {
			const expired = await expireOverdueScholarshipsForStudent(tx, student.id, userId, userName);
			totalExpiredCharges += expired;
		});
	}

	return {
		processedStudents: students.length,
		expiredCharges: totalExpiredCharges
	};
}

/**
 * Verifica y expira becas vencidas para un estudiante
 * Función de conveniencia para usar en loads/actions
 *
 * Si un alumno becado tiene cuotas vencidas con beca aplicada,
 * pierde la beca globalmente (Student.isBecado = false)
 */
export async function checkAndExpireScholarshipsForStudent(
	studentId: string,
	userId: string,
	userName: string
): Promise<{ expiredCharges: number; scholarshipLost: boolean }> {
	return prisma.$transaction(async (tx) => {
		// Verificar si el alumno es becado
		const student = await tx.student.findUnique({
			where: { id: studentId },
			select: { isBecado: true, isRecursante: true }
		});

		if (!student || !student.isBecado) {
			// Si no es becado, solo expirar becas de cuotas individuales
			const expiredCharges = await expireOverdueScholarshipsForStudent(
				tx,
				studentId,
				userId,
				userName
			);
			return { expiredCharges, scholarshipLost: false };
		}

		// Verificar si tiene cuotas vencidas con beca aplicada
		const overdueCharges = await tx.studentCharge.findMany({
			where: {
				studentId,
				scholarshipApplied: { gt: 0 },
				status: { in: ['PENDING', 'PARTIAL'] },
				concept: { code: 'CUOTA_MENSUAL' }
			},
			include: { concept: true }
		});

		let hasOverdueWithScholarship = false;
		const today = new Date();

		for (const charge of overdueCharges) {
			if (await shouldExpireScholarshipForCharge(charge, today)) {
				hasOverdueWithScholarship = true;
				break;
			}
		}

		if (!hasOverdueWithScholarship) {
			// No tiene cuotas vencidas con beca, solo expirar las que correspondan
			const expiredCharges = await expireOverdueScholarshipsForStudent(
				tx,
				studentId,
				userId,
				userName
			);
			return { expiredCharges, scholarshipLost: false };
		}

		// Tiene cuotas vencidas con beca -> perder beca globalmente
		await tx.student.update({
			where: { id: studentId },
			data: { isBecado: false }
		});

		// Recalcular todas las cuotas pendientes como normales
		const pendingCharges = await tx.studentCharge.findMany({
			where: {
				studentId,
				status: { in: ['PENDING', 'PARTIAL'] },
				concept: { code: 'CUOTA_MENSUAL' }
			},
			include: { concept: true }
		});

		let recalculatedCount = 0;
		const benefitsConfig = await getBenefitsConfig(tx);

		for (const charge of pendingCharges) {
			const scholarshipApplied = Number(charge.scholarshipApplied);
			if (scholarshipApplied > 0) {
				// Recalcular como alumno normal
				const newFinalAmount = Number(charge.amount);
				await tx.studentCharge.update({
					where: { id: charge.id },
					data: {
						scholarshipApplied: 0,
						discountApplied: 0,
						finalAmount: newFinalAmount,
						benefitType: 'NORMAL',
						benefitReason: 'Beca perdida por pago fuera de término'
					}
				});

				// Registrar movimiento
				await tx.financialMovement.create({
					data: {
						studentId,
						movementType: 'CANCELLATION',
						entityType: 'StudentCharge',
						entityId: charge.id,
						description: 'Pérdida de beca global por pago fuera de término',
						amount: scholarshipApplied,
						balanceBefore: Number(charge.finalAmount),
						balanceAfter: newFinalAmount,
						metadata: {
							periodLabel: charge.periodLabel,
							conceptName: charge.concept?.name,
							previousScholarshipApplied: scholarshipApplied,
							newScholarshipApplied: 0,
							previousFinalAmount: Number(charge.finalAmount),
							newFinalAmount: newFinalAmount,
							reason: 'SCHOLARSHIP_LOST_GLOBAL',
							userName
						},
						userId
					}
				});

				recalculatedCount++;
			}
		}

		// Registrar seguimiento del cambio de tipo de alumno
		await tx.studentFollowUp.create({
			data: {
				studentId,
				type: 'WARNING',
				title: 'Pérdida de beca',
				description: `Pérdida automática de beca por pago fuera de término. Tipo anterior: BECADO, Tipo nuevo: NORMAL. Cuotas recalculadas: ${recalculatedCount}. Responsable: ${userName}`,
				date: new Date(),
				createdBy: userId,
				isAlert: true,
				isResolved: true,
				resolvedAt: new Date(),
				resolvedBy: userId
			}
		});

		return { expiredCharges: recalculatedCount, scholarshipLost: true };
	});
}
