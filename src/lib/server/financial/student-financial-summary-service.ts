import { prisma } from '../db/prisma';
import { ChargeStatus } from '@prisma/client';

export type StudentFinancialSummary = {
	totalDebt: number;
	totalPaid: number;
	pendingCharges: number;
	overdueDebt: number;
	overdueCharges: number;
	financialBlocked: boolean;
	blockingMessage: string | null;
};

/**
 * Servicio para calcular el resumen financiero de un alumno
 * Usa la lógica correcta de cálculo de deuda:
 * - Solo considera cargos con status PENDING o PARTIAL
 * - Usa finalAmount en lugar de amount (para incluir becas, descuentos, condonaciones)
 * - pending = finalAmount - paidAmount
 * - Si pending < 0, usa 0
 * - totalDebt = suma de pending
 */
export class StudentFinancialSummaryService {
	/**
	 * Obtiene el resumen financiero de un alumno
	 */
	async getStudentFinancialSummary(studentId: string): Promise<StudentFinancialSummary> {
		// Obtener cargos pendientes y parciales
		const pendingCharges = await prisma.studentCharge.findMany({
			where: {
				studentId,
				status: { in: [ChargeStatus.PENDING, ChargeStatus.PARTIAL] }
			},
			include: {
				concept: true
			}
		});

		// Obtener pagos no anulados
		const payments = await prisma.payment.findMany({
			where: {
				studentId,
				isCancelled: false
			}
		});

		// Calcular deuda total
		let totalDebt = 0;
		let overdueDebt = 0;
		let overdueCharges = 0;
		const now = new Date();

		for (const charge of pendingCharges) {
			const pending = Number(charge.finalAmount) - Number(charge.paidAmount);
			if (pending > 0) {
				totalDebt += pending;

				// Verificar si está vencido
				if (charge.dueDate && charge.dueDate < now) {
					overdueDebt += pending;
					if (charge.concept.code === 'CUOTA_MENSUAL') {
						overdueCharges++;
					}
				}
			}
		}

		// Calcular total pagado
		const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

		// Obtener estado de bloqueo financiero
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: {
				financialBlocked: true
			}
		});

		// Obtener mensaje de bloqueo
		const { getStudentBlockingMessage } = await import('./student-blocking-service');
		const blockingMessage = await getStudentBlockingMessage(studentId);

		return {
			totalDebt,
			totalPaid,
			pendingCharges: pendingCharges.length,
			overdueDebt,
			overdueCharges,
			financialBlocked: student?.financialBlocked || false,
			blockingMessage
		};
	}
}

export const studentFinancialSummaryService = new StudentFinancialSummaryService();
