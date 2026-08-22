import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';

import { getBenefitsConfig } from './benefit-calculator';
import { suspendScholarshipForDebt } from './scholarship-lifecycle-service';

export function getMonthEndFromPeriodLabel(periodLabel: string): Date {
	const [year, month] = periodLabel.split('-').map(Number);

	const lastDay = new Date(year, month, 0);
	lastDay.setHours(23, 59, 59, 999);

	return lastDay;
}

export function getMonthStartFromPeriodLabel(periodLabel: string): Date {
	const [year, month] = periodLabel.split('-').map(Number);

	return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Conservamos por ahora la regla de vencimiento existente.
 * paymentDueGraceDays se usa actualmente como día límite
 * dentro del mes.
 *
 * En la etapa de configuración separaremos:
 * - día de vencimiento;
 * - días reales de gracia para pérdida de beca.
 */
export async function getChargeDueDate(periodLabel: string): Promise<Date> {
	const [year, month] = periodLabel.split('-').map(Number);

	const config = await getBenefitsConfig(prisma);

	const configuredDay = config.paymentDueGraceDays > 0 ? config.paymentDueGraceDays : 10;

	const lastDayOfMonth = new Date(year, month, 0).getDate();

	const day = Math.min(configuredDay, lastDayOfMonth);

	const dueDate = new Date(year, month - 1, day, 23, 59, 59, 999);

	return dueDate;
}

export async function isChargePaidWithinPeriod(charge: {
	paidAmount: { toString: () => string };
	finalAmount: { toString: () => string };
	periodLabel: string;
}): Promise<boolean> {
	const paidAmount = Number(charge.paidAmount);
	const finalAmount = Number(charge.finalAmount);

	const dueDate = await getChargeDueDate(charge.periodLabel);

	return paidAmount >= finalAmount && new Date() <= dueDate;
}

export async function shouldExpireScholarshipForCharge(
	charge: {
		scholarshipApplied: { toString: () => string };
		paidAmount: { toString: () => string };
		finalAmount: { toString: () => string };
		periodLabel: string;
	},
	today: Date = new Date()
): Promise<boolean> {
	const paidAmount = Number(charge.paidAmount);

	const finalAmount = Number(charge.finalAmount);

	if (paidAmount >= finalAmount) {
		return false;
	}

	const dueDate = await getChargeDueDate(charge.periodLabel);

	return today > dueDate;
}

/**
 * Compatibilidad con la API anterior.
 *
 * IMPORTANTE:
 * Esta función ya NO modifica el StudentCharge.
 * Una cuota emitida conserva siempre el beneficio con
 * el que fue creada.
 */
export async function expireScholarshipForCharge(
	_tx: Prisma.TransactionClient,
	_chargeId: string,
	_userId: string,
	_userName: string
): Promise<void> {
	// Intencionalmente no se modifica ninguna cuota histórica.
}

async function findOverdueScholarshipCharge(studentId: string) {
	const charges = await prisma.studentCharge.findMany({
		where: {
			studentId,
			status: {
				in: ['PENDING', 'PARTIAL']
			},
			concept: {
				code: 'CUOTA_MENSUAL'
			}
		},
		orderBy: [
			{
				periodLabel: 'asc'
			},
			{
				createdAt: 'asc'
			}
		]
	});

	for (const charge of charges) {
		if (await shouldExpireScholarshipForCharge(charge)) {
			return charge;
		}
	}

	return null;
}

/**
 * Nombre conservado por compatibilidad.
 *
 * Antes:
 *   expiraba/recalculaba cargos.
 *
 * Ahora:
 *   si encuentra una cuota vencida, suspende la beca global,
 *   conservando intactas todas las cuotas existentes.
 */
export async function expireOverdueScholarshipsForStudent(
	_tx: Prisma.TransactionClient,
	studentId: string,
	userId: string,
	userName: string
): Promise<number> {
	const student = await prisma.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			isBecado: true
		}
	});

	if (!student?.isBecado) {
		return 0;
	}

	const overdueCharge = await findOverdueScholarshipCharge(studentId);

	if (!overdueCharge) {
		return 0;
	}

	const result = await suspendScholarshipForDebt(studentId, overdueCharge.id, {
		userId,
		userName
	});

	return result.suspended ? 1 : 0;
}

export async function expireOverdueScholarshipsGlobally(
	userId: string,
	userName: string
): Promise<{
	processedStudents: number;
	expiredCharges: number;
}> {
	const students = await prisma.student.findMany({
		where: {
			isBecado: true,
			studentCharges: {
				some: {
					status: {
						in: ['PENDING', 'PARTIAL']
					},
					concept: {
						code: 'CUOTA_MENSUAL'
					}
				}
			}
		},
		select: {
			id: true
		}
	});

	let suspendedScholarships = 0;

	for (const student of students) {
		const result = await checkAndExpireScholarshipsForStudent(student.id, userId, userName);

		if (result.scholarshipLost) {
			suspendedScholarships += 1;
		}
	}

	return {
		processedStudents: students.length,

		/*
		 * Se conserva el nombre expiredCharges por compatibilidad
		 * con consumidores existentes. Ahora representa cantidad
		 * de becas suspendidas.
		 */
		expiredCharges: suspendedScholarships
	};
}

export async function checkAndExpireScholarshipsForStudent(
	studentId: string,
	userId: string,
	userName: string
): Promise<{
	expiredCharges: number;
	scholarshipLost: boolean;
}> {
	const student = await prisma.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			isBecado: true
		}
	});

	if (!student?.isBecado) {
		return {
			expiredCharges: 0,
			scholarshipLost: false
		};
	}

	const overdueCharge = await findOverdueScholarshipCharge(studentId);

	if (!overdueCharge) {
		return {
			expiredCharges: 0,
			scholarshipLost: false
		};
	}

	const result = await suspendScholarshipForDebt(studentId, overdueCharge.id, {
		userId,
		userName
	});

	return {
		expiredCharges: result.suspended ? 1 : 0,
		scholarshipLost: result.suspended
	};
}
