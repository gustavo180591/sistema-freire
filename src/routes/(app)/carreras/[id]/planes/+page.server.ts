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
                }
            },
            careerSubjects: {
                where: {
                    isMandatory: true
                },
                include: {
                    subject: {
                        include: {
                            correlatives: {
                                where: {
                                    OR: [
                                        { careerId: null },
                                        { careerId: params.id }
                                    ]
                                },
                                include: {
                                    requiredSubject: {
                                        select: {
                                            id: true,
                                            code: true,
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    yearLevel: 'asc'
                }
            }
        }
    });

    if (!career) {
        throw error(404, 'Carrera no encontrada');
    }

    // Agrupar materias por año
    const subjectsByYear: Record<number, typeof career.careerSubjects> = {};
    
    career.careerSubjects.forEach((cs) => {
        const year = cs.yearLevel;
        if (!subjectsByYear[year]) {
            subjectsByYear[year] = [];
        }
        subjectsByYear[year].push(cs);
    });

    // Calcular totales
    const totalSubjects = career.careerSubjects.length;
    const totalCorrelatives = career.careerSubjects.reduce(
        (acc, cs) => acc + cs.subject.correlatives.length, 
        0
    );

    return {
        career: {
            id: career.id,
            code: career.code,
            name: career.name,
            trainingField: career.trainingField,
            resolution: career.resolution,
            durationYears: career.durationYears,
            active: career.active
        },
        subjectsByYear,
        totalSubjects,
        totalCorrelatives,
        plans: career.studyPlans
    };
};
