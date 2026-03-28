import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
    const career = await prisma.career.findUnique({
        where: {
            id: params.id
        },
        include: {
            students: {
                select: {
                    id: true
                }
            },
            studyPlans: {
                where: {
                    active: true
                },
                include: {
                    subjects: {
                        select: {
                            subjectId: true
                        }
                    }
                },
                orderBy: {
                    version: 'desc'
                }
            }
        }
    });

    if (!career) {
        throw error(404, 'Carrera no encontrada');
    }

    const normalizedCareer = {
        id: career.id,
        code: career.code,
        name: career.name,
        active: career.active,
        students: career.students.length,
        plans: career.studyPlans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            version: plan.version,
            active: plan.active,
            subjects: plan.subjects.length
        }))
    };

    return {
        career: normalizedCareer,
        metrics: {
            totalStudents: normalizedCareer.students,
            totalPlans: normalizedCareer.plans.length,
            totalSubjects: normalizedCareer.plans.reduce(
                (acc, plan) => acc + plan.subjects,
                0
            )
        }
    };
};
