import { prisma } from '$lib/server/db/prisma';
import { getChargeDueDate } from '$lib/server/financial/scholarship-expiration-service';

/**
 * Servicio de consulta para validar elegibilidad financiera
 * de alumnos para rendir exámenes.
 *
 * IMPORTANTE:
 * Este servicio es deliberadamente de solo lectura.
 * Consultar elegibilidad nunca debe modificar becas,
 * cargos ni bloqueos financieros.
 */

export interface ExamEligibilityResult {
	canTakeExam: boolean;
	blockingCharges: BlockingCharge[];
	totalOverdueDebt: number;
	message: string;
}

export interface BlockingCharge {
	id: string;
	conceptName: string;
	periodLabel: string;
	dueDate: string | null;
	amount: number;
	paidAmount: number;
	balance: number;
	status: string;
}

/**
 * Obtiene las cuotas mensuales vencidas que bloquean
 * la posibilidad de rendir.
 *
 * El vencimiento se calcula desde periodLabel utilizando
 * la misma regla financiera que el resto del sistema.
 *
 * No dependemos de StudentCharge.dueDate porque existen
 * cargos históricos y generadores que almacenan null.
 */
export async function getBlockingOverdueCharges(studentId: string): Promise<BlockingCharge[]> {
	const today = new Date();

	const charges = await prisma.studentCharge.findMany({
		where: {
			studentId,
			concept: {
				code: 'CUOTA_MENSUAL'
			},
			status: {
				in: ['PENDING', 'PARTIAL']
			}
		},
		include: {
			concept: true
		},
		orderBy: [{ periodLabel: 'asc' }, { createdAt: 'asc' }]
	});

	const blockingCharges: BlockingCharge[] = [];

	for (const charge of charges) {
		const dueDate = await getChargeDueDate(charge.periodLabel);
		const balance = Math.max(Number(charge.finalAmount) - Number(charge.paidAmount), 0);

		if (today <= dueDate || balance <= 0) {
			continue;
		}

		blockingCharges.push({
			id: charge.id,
			conceptName: charge.concept?.name || 'Sin concepto',
			periodLabel: charge.periodLabel,
			dueDate: dueDate.toISOString(),
			amount: Number(charge.amount),
			paidAmount: Number(charge.paidAmount),
			balance,
			status: charge.status
		});
	}

	return blockingCharges;
}

/**
 * Consulta si el alumno cumple la condición financiera
 * para rendir.
 *
 * Los parámetros userId/userName se conservan temporalmente
 * por compatibilidad con posibles consumidores existentes,
 * pero ya no provocan mutaciones.
 */
export async function getStudentFinancialExamEligibility(
	studentId: string,
	_userId?: string,
	_userName?: string
): Promise<ExamEligibilityResult> {
	const blockingCharges = await getBlockingOverdueCharges(studentId);

	const totalOverdueDebt = blockingCharges.reduce((sum, charge) => sum + charge.balance, 0);

	const canTakeExam = blockingCharges.length === 0;

	const message = canTakeExam
		? 'El alumno está al día con sus cuotas y puede rendir exámenes.'
		: `No podés rendir porque registrás ${blockingCharges.length} cuota(s) vencida(s) pendiente(s) por un total de $${totalOverdueDebt.toFixed(
				2
			)}. Por favor regularizá tu situación en Secretaría.`;

	return {
		canTakeExam,
		blockingCharges,
		totalOverdueDebt,
		message
	};
}

export async function assertStudentCanTakeExam(
	studentId: string,
	userId?: string,
	userName?: string
): Promise<void> {
	const eligibility = await getStudentFinancialExamEligibility(studentId, userId, userName);

	if (!eligibility.canTakeExam) {
		throw new Error(eligibility.message);
	}
}

export async function hasOverdueCharges(studentId: string): Promise<boolean> {
	const blockingCharges = await getBlockingOverdueCharges(studentId);
	return blockingCharges.length > 0;
}
