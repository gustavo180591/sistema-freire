import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
    const careers = await prisma.career.findMany({
        where: {
            active: true
        },
        include: {
            studyPlans: {
                select: {
                    id: true
                }
            },
            students: {
                select: {
                    id: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    const normalizedCareers = careers.map((career) => ({
        id: career.id,
        code: career.code,
        name: career.name,
        active: career.active,
        plans: career.studyPlans.length,
        students: career.students.length
    }));

    const totalPlans = normalizedCareers.reduce((acc, item) => acc + item.plans, 0);
    const totalStudents = normalizedCareers.reduce((acc, item) => acc + item.students, 0);

    return {
        careers: normalizedCareers,
        metrics: {
            activeCareers: normalizedCareers.length,
            totalPlans,
            totalStudents
        }
    };
};
