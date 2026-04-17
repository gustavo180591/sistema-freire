import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user || !user.roles.includes('ALUMNO')) {
        throw redirect(303, '/login');
    }

    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
            grades: {
                include: {
                    commission: {
                        include: {
                            subject: true
                        }
                    }
                },
                orderBy: {
                    gradedAt: 'desc'
                }
            },
            subjectStatuses: {
                include: {
                    subject: true
                }
            }
        }
    });

    if (!student) {
        throw redirect(303, '/dashboard');
    }

    // Agrupar calificaciones por materia
    const gradesBySubject = new Map();
    
    for (const grade of student.grades) {
        const subjectName = grade.commission.subject?.name || 'Sin materia';
        const commissionName = grade.commission.name;
        const key = `${subjectName} - ${commissionName}`;
        
        if (!gradesBySubject.has(key)) {
            gradesBySubject.set(key, {
                subject: subjectName,
                commission: commissionName,
                grades: [],
                average: 0
            });
        }
        
        const data = gradesBySubject.get(key);
        data.grades.push({
            value: Number(grade.value),
            type: grade.gradeType,
            date: grade.gradedAt
        });
    }

    // Calcular promedios
    const subjects = Array.from(gradesBySubject.values()).map(s => {
        const sum = s.grades.reduce((acc: number, g: { value: number }) => acc + g.value, 0);
        s.average = s.grades.length > 0 ? Math.round((sum / s.grades.length) * 100) / 100 : 0;
        return s;
    });

    // Incluir materias sin calificaciones pero con estado
    const subjectStatuses = student.subjectStatuses.map(status => ({
        subject: status.subject.name,
        status: status.regularityStatus,
        approved: status.approved,
        attendancePercent: Number(status.attendancePercent)
    }));

    // Calcular promedio general
    const allGrades = student.grades.map(g => Number(g.value));
    const overallAverage = allGrades.length > 0 
        ? Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 100) / 100
        : 0;

    return {
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName
        },
        subjects,
        subjectStatuses,
        overallAverage,
        totalGrades: allGrades.length,
        approvedCount: student.subjectStatuses.filter(s => s.approved).length
    };
};
