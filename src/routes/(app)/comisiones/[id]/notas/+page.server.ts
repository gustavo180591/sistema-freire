import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireCommissionAccess } from '$lib/server/auth/commission-access';

export const load: PageServerLoad = async ({ params, locals }) => {
    await requireCommissionAccess(locals.user, params.id);

    const commission = await prisma.commission.findUniqueOrThrow({
        where: { id: params.id },
        include: {
            subject: true,
            enrollments: {
                include: {
                    student: true
                }
            },
            grades: true
        }
    });

    return {
        commission
    };
};