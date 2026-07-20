import { prisma } from '$lib/server/db/prisma';
import { checkAndExpireScholarshipsForStudent } from '$lib/server/financial/scholarship-expiration-service';

/**
 * Servicio para validar elegibilidad de alumnos para rendir exámenes
 *
 * Regla: Un alumno puede rendir solamente si está al día con sus cuotas vencidas.
 * Se considera "al día" cuando:
 * - No tiene cuotas mensuales vencidas pendientes.
 * - No tiene cuotas mensuales vencidas parcialmente pagadas.
 * - No tiene cargos bloqueantes vencidos.
 *
 * IMPORTANTE: Antes de validar, se ejecuta la expiración de becas vencidas
 * para asegurar que el estado de las cuotas esté actualizado.
 */

/**
 * Resultado de validación de elegibilidad para examen
 */
export interface ExamEligibilityResult {
	canTakeExam: boolean;
	blockingCharges: BlockingCharge[];
	totalOverdueDebt: number;
	message: string;
}

/**
 * Cuota bloqueante
 */
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
 * Obtiene las cuotas vencidas que bloquean el examen
 * Filtra por concepto CUOTA_MENSUAL y que estén vencidas
 */
export async function getBlockingOverdueCharges(studentId: string): Promise<BlockingCharge[]> {
	const today = new Date();

	const charges = await prisma.studentCharge.findMany({
		where: {
			studentId,
			concept: {
				code: 'CUOTA_MENSUAL'
			},
			dueDate: {
				lt: today
			},
			status: {
				in: ['PENDING', 'PARTIAL']
			}
		},
		include: {
			concept: true
		},
		orderBy: {
			dueDate: 'asc'
		}
	});

	return charges.map((charge) => ({
		id: charge.id,
		conceptName: charge.concept?.name || 'Sin concepto',
		periodLabel: charge.periodLabel,
		dueDate: charge.dueDate ? charge.dueDate.toISOString() : null,
		amount: Number(charge.amount),
		paidAmount: Number(charge.paidAmount),
		balance: Number(charge.finalAmount) - Number(charge.paidAmount),
		status: charge.status
	}));
}

/**
 * Obtiene la elegibilidad financiera del alumno para rendir exámenes
 */
export async function getStudentFinancialExamEligibility(
	studentId: string,
	userId?: string,
	userName?: string
): Promise<ExamEligibilityResult> {
	// Primero expirar becas vencidas para asegurar estado actualizado
	if (userId && userName) {
		await checkAndExpireScholarshipsForStudent(studentId, userId, userName);
	}

	const blockingCharges = await getBlockingOverdueCharges(studentId);
	const totalOverdueDebt = blockingCharges.reduce((sum, charge) => sum + charge.balance, 0);

	const canTakeExam = blockingCharges.length === 0;

	let message = '';
	if (canTakeExam) {
		message = 'El alumno está al día con sus cuotas y puede rendir exámenes.';
	} else {
		message = `No podés rendir porque registrás ${blockingCharges.length} cuota(s) vencida(s) pendiente(s) por un total de $${totalOverdueDebt.toFixed(2)}. Por favor regularizá tu situación en Secretaría.`;
	}

	return {
		canTakeExam,
		blockingCharges,
		totalOverdueDebt,
		message
	};
}

/**
 * Valida si el alumno puede rendir exámenes
 * Lanza error si no puede rendir
 */
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

/**
 * Verifica si un alumno tiene cuotas vencidas (sin detallarlas)
 */
export async function hasOverdueCharges(studentId: string): Promise<boolean> {
	const today = new Date();

	const count = await prisma.studentCharge.count({
		where: {
			studentId,
			concept: {
				code: 'CUOTA_MENSUAL'
			},
			dueDate: {
				lt: today
			},
			status: {
				in: ['PENDING', 'PARTIAL']
			}
		}
	});

	return count > 0;
}
