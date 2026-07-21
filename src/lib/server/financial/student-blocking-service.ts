import { prisma } from '$lib/server/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { getBenefitsConfig } from './benefit-calculator';
import * as DecimalHelpers from './decimal-helpers';

export interface FinancialBlockingConfig {
	blockAfterUnpaidCharges: number;
}

export interface StudentBlockingStatus {
	isBlocked: boolean;
	pendingCharges: number;
	blockingThreshold: number;
	reason: string;
}

/**
 * Obtiene la configuración de bloqueo financiero
 * Nota: El bloqueo financiero por cuotas impagas está desactivado
 */
export async function getFinancialBlockingConfig(): Promise<FinancialBlockingConfig> {
	// Bloqueo financiero desactivado por configuración
	return {
		blockAfterUnpaidCharges: 0
	};
}

/**
 * Cuenta los cargos pendientes de un alumno
 * Solo cuenta cargos con status PENDING y saldo pendiente mayor a 0
 * Prioriza CUOTA_MENSUAL pero puede incluir otros conceptos según configuración
 */
export async function getStudentPendingChargesCount(
	studentId: string,
	includeEnrollment: boolean = false
): Promise<number> {
	const charges = await prisma.studentCharge.findMany({
		where: {
			studentId,
			status: 'PENDING'
		},
		include: {
			concept: true
		}
	});

	let pendingCount = 0;

	for (const charge of charges) {
		const pendingAmount = Decimal.sub(charge.finalAmount, charge.paidAmount);

		// Solo contar si tiene saldo pendiente mayor a 0
		if (
			DecimalHelpers.isLessThan(pendingAmount, DecimalHelpers.zero()) ||
			DecimalHelpers.isEqual(pendingAmount, DecimalHelpers.zero())
		) {
			continue;
		}

		// Contar CUOTA_MENSUAL siempre
		if (charge.concept.code === 'CUOTA_MENSUAL') {
			pendingCount++;
		}
		// Incluir inscripción solo si está configurado
		else if (includeEnrollment && charge.concept.code === 'INSCRIPCION') {
			pendingCount++;
		}
	}

	return pendingCount;
}

/**
 * Determina si un alumno debe estar bloqueado financieramente
 */
export async function shouldBlockStudent(
	studentId: string,
	includeEnrollment: boolean = false
): Promise<StudentBlockingStatus> {
	const config = await getFinancialBlockingConfig();
	const pendingCharges = await getStudentPendingChargesCount(studentId, includeEnrollment);

	// Si el umbral es 0, no se bloquea a nadie
	if (config.blockAfterUnpaidCharges === 0) {
		return {
			isBlocked: false,
			pendingCharges,
			blockingThreshold: config.blockAfterUnpaidCharges,
			reason: 'Bloqueo desactivado por configuración'
		};
	}

	// El alumno está bloqueado si tiene >= al umbral de cuotas impagas
	const isBlocked = pendingCharges >= config.blockAfterUnpaidCharges;

	return {
		isBlocked,
		pendingCharges,
		blockingThreshold: config.blockAfterUnpaidCharges,
		reason: isBlocked
			? `Alumno tiene ${pendingCharges} cuotas/cargos pendientes, superando el límite de ${config.blockAfterUnpaidCharges}`
			: `Alumno tiene ${pendingCharges} cuotas/cargos pendientes, por debajo del límite de ${config.blockAfterUnpaidCharges}`
	};
}

/**
 * Actualiza el estado de bloqueo financiero de un alumno
 * Esta función actualiza el campo financialBlocked en el modelo Student
 */
export async function updateStudentFinancialBlockStatus(
	studentId: string,
	includeEnrollment: boolean = false
): Promise<void> {
	const blockingStatus = await shouldBlockStudent(studentId, includeEnrollment);

	await prisma.student.update({
		where: { id: studentId },
		data: {
			financialBlocked: blockingStatus.isBlocked
		}
	});
}

/**
 * Verifica si un alumno está bloqueado y lanza error si lo está
 * Útil para usar como guard en acciones académicas
 */
export async function assertStudentNotFinanciallyBlocked(
	studentId: string,
	includeEnrollment: boolean = false
): Promise<void> {
	const blockingStatus = await shouldBlockStudent(studentId, includeEnrollment);

	if (blockingStatus.isBlocked) {
		throw new Error(
			`Alumno bloqueado por incumplimiento de pago. Tiene ${blockingStatus.pendingCharges} cuotas/cargos pendientes y el límite configurado es ${blockingStatus.blockingThreshold}. Por favor acercarse a Secretaría para regularizar su situación.`
		);
	}
}

/**
 * Obtiene el mensaje de bloqueo para mostrar al alumno
 */
export async function getStudentBlockingMessage(studentId: string): Promise<string | null> {
	const blockingStatus = await shouldBlockStudent(studentId);

	if (blockingStatus.isBlocked) {
		return 'Alumno bloqueado por incumplimiento de pago. Por favor acercarse a Secretaría para regularizar su situación.';
	}

	return null;
}

/**
 * Recalcula el estado de bloqueo de todos los alumnos
 * Útil cuando cambia la configuración de bloqueo
 */
export async function recalculateAllStudentsBlockingStatus(): Promise<{
	updated: number;
	skipped: number;
}> {
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE'
		}
	});

	let updated = 0;
	let skipped = 0;

	for (const student of students) {
		const blockingStatus = await shouldBlockStudent(student.id);

		if (student.financialBlocked !== blockingStatus.isBlocked) {
			await prisma.student.update({
				where: { id: student.id },
				data: {
					financialBlocked: blockingStatus.isBlocked
				}
			});
			updated++;
		} else {
			skipped++;
		}
	}

	return { updated, skipped };
}
