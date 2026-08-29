import type { PageServerLoad } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireStudentFinancialReadAccess } from '$lib/server/auth/financial-access';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const studentId = params.id;

	await requireStudentFinancialReadAccess(locals.user, studentId);
	await requirePermission(locals.user, 'PAYMENT', 'read');

	try {
		const report = await financialService.getStudentFinancialReport(studentId);

		// Serialize Decimal values to numbers for JSON serialization
		const serializedReport = {
			...report,
			totalCharges: Number(report.totalCharges),
			totalPaid: Number(report.totalPaid),
			totalPending: Number(report.totalPending),
			overdueDebt: report.overdueDebt ? Number(report.overdueDebt) : 0,
			charges: report.charges.map((charge: any) => ({
				...charge,
				amount: Number(charge.amount),
				paidAmount: Number(charge.paidAmount),
				pendingAmount: Number(charge.pendingAmount)
			})),
			payments: report.payments.map((payment: any) => ({
				...payment,
				amount: Number(payment.amount)
			}))
		};

		return { report: serializedReport };
	} catch (error: any) {
		throw new Error(error.message || 'Error al obtener el reporte financiero');
	}
};
