import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
    const career = await prisma.career.findUnique({
        where: {
            id: params.id
        },
        include: {
            studyPlans: {
                orderBy: {
                    version: 'desc'
                },
                include: {
                    subjects: {
                        include: {
                            subject: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    yearLevel: true
                                }
                            }
                        },
                        orderBy: {
                            sortOrder: 'asc'
                        }
                    }
                }
            }
        }
    });

    if (!career) {
        throw error(404, 'Carrera no encontrada');
    }

    // Agrupar materias por año
    const plansWithSubjectsByYear = career.studyPlans.map((plan) => {
        const subjectsByYear: Record<number, typeof plan.subjects> = {};
        
        plan.subjects.forEach((ps) => {
            const year = ps.subject.yearLevel;
            if (!subjectsByYear[year]) {
                subjectsByYear[year] = [];
            }
            subjectsByYear[year].push(ps);
        });

        return {
            id: plan.id,
            name: plan.name,
            version: plan.version,
            active: plan.active,
            durationYears: plan.durationYears,
            subjectsByYear,
            totalSubjects: plan.subjects.length
        };
    });

    return {
        career: {
            id: career.id,
            code: career.code,
            name: career.name,
            active: career.active
        },
        plans: plansWithSubjectsByYear
    };
};
