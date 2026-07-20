import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Servicio para manejar la expiración automática de becas por pago fuera de término
 *
 * Regla: Un alumno becado pierde el beneficio de beca de una cuota si el pago
 * se realiza fuera del mes correspondiente de la cuota.
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
export function isChargePaidWithinPeriod(charge: {
	paidAmount: { toString: () => string };
	finalAmount: { toString: () => string };
	periodLabel: string;
}): boolean {
	const paidAmount = Number(charge.paidAmount);
	const finalAmount = Number(charge.finalAmount);
	const monthEnd = getMonthEndFromPeriodLabel(charge.periodLabel);
	const now = new Date();

	// Si está completamente pagada y la fecha actual está dentro del mes del período
	return paidAmount >= finalAmount && now <= monthEnd;
}

/**
 * Verifica si una cuota debe expirar su beca
 * Condiciones:
 * - Tiene beca aplicada (scholarshipApplied > 0)
 * - No está completamente pagada
 * - Está fuera del mes del período
 */
export function shouldExpireScholarshipForCharge(
	charge: {
		scholarshipApplied: { toString: () => string };
		paidAmount: { toString: () => string };
		finalAmount: { toString: () => string };
		periodLabel: string;
	},
	today: Date = new Date()
): boolean {
	const scholarshipApplied = Number(charge.scholarshipApplied);
	const paidAmount = Number(charge.paidAmount);
	const finalAmount = Number(charge.finalAmount);
	const monthEnd = getMonthEndFromPeriodLabel(charge.periodLabel);

	// No tiene beca aplicada
	if (scholarshipApplied <= 0) {
		return false;
	}

	// Ya está completamente pagada
	if (paidAmount >= finalAmount) {
		return false;
	}

	// Está dentro del mes del período
	if (today <= monthEnd) {
		return false;
	}

	// Fuera del mes, con beca aplicada y no pagada completamente -> debe expirar
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
		if (shouldExpireScholarshipForCharge(charge, today)) {
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
 */
export async function checkAndExpireScholarshipsForStudent(
	studentId: string,
	userId: string,
	userName: string
): Promise<number> {
	return prisma.$transaction(async (tx) => {
		return expireOverdueScholarshipsForStudent(tx, studentId, userId, userName);
	});
}
