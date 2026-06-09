import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	const [charges, payments] = await Promise.all([
		prisma.studentCharge.findMany({
			where: {
				student: {
					career: {
						locations: {
							some: {
								locationId: { in: allowedLocationIds }
							}
						}
					}
				}
			},
			include: {
				student: {
					include: {
						career: {
							select: {
								name: true
							}
						}
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		}),
		prisma.payment.findMany({
			where: {
				student: {
					career: {
						locations: {
							some: {
								locationId: { in: allowedLocationIds }
							}
						}
					}
				}
			},
			select: {
				amount: true
			}
		})
	]);

	const financeRows = charges.map((charge) => {
		const debt = Number(charge.amount) - Number(charge.paidAmount);

		return {
			id: charge.id,
			student: `${charge.student.firstName} ${charge.student.lastName}`.trim(),
			career: charge.student.career.name,
			period: charge.periodLabel,
			debt,
			status: debt > 0 ? 'Con deuda' : 'Al día'
		};
	});

	const studentsWithDebt = financeRows.filter((row) => row.debt > 0).length;
	const totalDebt = financeRows.reduce((acc, row) => acc + row.debt, 0);
	const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

	return {
		financeRows,
		metrics: {
			studentsWithDebt,
			totalDebt,
			paymentsCount: payments.length,
			totalCollected
		}
	};
};
