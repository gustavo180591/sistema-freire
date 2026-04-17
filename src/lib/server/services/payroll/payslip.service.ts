// src/lib/server/services/payroll/payslip.service.ts
import { prisma } from '$lib/server/db/prisma';

export type PayslipListResult = {
    payslips: {
        id: string;
        period: string;
        teacher: string;
        amount: number;
        status: string;
    }[];
    metrics: {
        total: number;
        paid: number;
        pending: number;
        totalAmount: number;
    };
};

export async function getPayslipsForUser(user?: {
    id: string;
    role?: string;
}): Promise<PayslipListResult> {
    const isTeacher = user?.role === 'TEACHER';

    const payslips = await prisma.payslip.findMany({
        where: isTeacher
            ? {
                teacher: {
                    userId: user.id
                }
            }
            : undefined,
        include: {
            teacher: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }]
    });

    const normalized = payslips.map((slip) => ({
        id: slip.id,
        period: `${String(slip.periodMonth).padStart(2, '0')}/${slip.periodYear}`,
        teacher: `${slip.teacher.user.firstName} ${slip.teacher.user.lastName}`.trim(),
        amount: Number(slip.amount),
        status: slip.status
    }));

    return {
        payslips: normalized,
        metrics: {
            total: normalized.length,
            paid: normalized.filter((p) => p.status === 'PAID').length,
            pending: normalized.filter((p) => p.status === 'PENDING').length,
            totalAmount: normalized.reduce((acc, p) => acc + p.amount, 0)
        }
    };
}

export async function getPayslipById(id: string) {
    return prisma.payslip.findUnique({
        where: { id },
        include: {
            teacher: {
                select: {
                    id: true,
                    userId: true
                }
            }
        }
    });
}