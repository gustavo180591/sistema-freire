import { prisma } from '$lib/server/db/prisma';

export type FinancialReportRow = {
	id: string;
	student: string;
	career: string;
	periodLabel: string;
	concept: string;
	pending: number;
};

export type FinancialReportResult = {
	rows: FinancialReportRow[];
	metrics: {
		studentsWithDebt: number;
		totalDebt: number;
		paymentsCount: number;
		totalCollected: number;
	};
};

export async function getFinancialReport(): Promise<FinancialReportResult> {
	const [charges, payments] = await Promise.all([
		prisma.studentCharge.findMany({
			include: {
				student: {
					include: {
						career: {
							select: {
								name: true
							}
						}
					}
				},
				concept: {
					select: {
						name: true
					}
				}
			},
			orderBy: [{ createdAt: 'desc' }]
		}),
		prisma.payment.findMany({
			select: {
				amount: true
			}
		})
	]);

	const rows: FinancialReportRow[] = charges.map((charge) => {
		const pending = Number(charge.amount) - Number(charge.paidAmount);

		return {
			id: charge.id,
			student: `${charge.student.firstName} ${charge.student.lastName}`.trim(),
			career: charge.student.career.name,
			periodLabel: charge.periodLabel,
			concept: charge.concept.name,
			pending
		};
	});

	return {
		rows,
		metrics: {
			studentsWithDebt: rows.filter((row) => row.pending > 0).length,
			totalDebt: rows.reduce((acc, row) => acc + row.pending, 0),
			paymentsCount: payments.length,
			totalCollected: payments.reduce((acc, payment) => acc + Number(payment.amount), 0)
		}
	};
}
