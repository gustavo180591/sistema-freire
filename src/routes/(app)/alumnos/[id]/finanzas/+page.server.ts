import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireFinancialAccess } from '$lib/server/auth/financial-access';

export const load: PageServerLoad = async ({ params, locals }) => {
    await requireFinancialAccess(locals.user, params.id);

    const student = await prisma.student.findUniqueOrThrow({
        where: { id: params.id },
        include: {
            career: true,
            studentCharges: {
                include: {
                    concept: true
                },
                orderBy: [{ createdAt: 'desc' }]
            },
            payments: {
                orderBy: [{ paidAt: 'desc' }]
            },
            scholarships: {
                where: {
                    active: true
                }
            }
        }
    });

    const charges = student.studentCharges.map((charge) => {
        const pending =
            Number(charge.amount) - Number(charge.paidAmount);

        return {
            id: charge.id,
            concept: charge.concept.name,
            period: charge.periodLabel,
            amount: Number(charge.amount),
            paid: Number(charge.paidAmount),
            pending,
            status: charge.status
        };
    });

    const totalDebt = charges.reduce(
        (acc, charge) => acc + charge.pending,
        0
    );

    const totalPaid = student.payments.reduce(
        (acc, payment) => acc + Number(payment.amount),
        0
    );

    return {
        student: {
            id: student.id,
            fullName: `${student.firstName} ${student.lastName}`,
            dni: student.dni,
            career: student.career.name
        },
        metrics: {
            totalDebt,
            totalPaid,
            pendingCharges: charges.filter((c) => c.pending > 0).length,
            activeScholarships: student.scholarships.length,
            blocked: totalDebt > 0
        },
        charges
    };
};