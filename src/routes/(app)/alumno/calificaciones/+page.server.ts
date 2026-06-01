import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';
import { CorrelativeType } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user || !user.roles.includes('ALUMNO')) {
        throw redirect(303, '/login');
    }

    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
            career: true,
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

    // Obtener materias que puede cursar basado en correlatividades
    const approvedSubjectIds = student.subjectStatuses
        .filter(s => s.approved)
        .map(s => s.subjectId);
    
    const regularSubjectIds = student.subjectStatuses
        .filter(s => s.regularityStatus === 'REGULAR')
        .map(s => s.subjectId);

    // Obtener todas las materias de la carrera para el año actual del alumno
    const careerSubjects = await prisma.careerSubject.findMany({
        where: {
            careerId: student.careerId,
            yearLevel: student.currentYear
        },
        include: {
            subject: {
                include: {
                    correlatives: {
                        where: {
                            careerId: student.careerId,
                            isActive: true
                        }
                    }
                }
            }
        },
        orderBy: {
            yearLevel: 'asc'
        }
    });

    // Determinar qué materias puede cursar
    const availableSubjects = careerSubjects
        .filter(cs => {
            // Excluir materias ya aprobadas
            if (approvedSubjectIds.includes(cs.subjectId)) return false;
            
            // Verificar correlatividades
            const canEnroll = cs.subject.correlatives.every((correlative: any) => {
                const requiredSubjectId = correlative.requiredSubjectId;
                
                switch (correlative.correlativeType) {
                    case CorrelativeType.REGULAR:
                        return regularSubjectIds.includes(requiredSubjectId);
                    case CorrelativeType.APROBADO:
                    case CorrelativeType.APROBADO_APROBAR:
                        return approvedSubjectIds.includes(requiredSubjectId);
                    default:
                        return true;
                }
            });
            
            return canEnroll;
        })
        .map(cs => ({
            id: cs.subject.id,
            name: cs.subject.name,
            code: cs.subject.code,
            yearLevel: cs.yearLevel,
            isMandatory: cs.isMandatory,
            accreditationMode: cs.subject.accreditationMode,
            correlatives: cs.subject.correlatives.map((c: any) => ({
                type: c.correlativeType,
                requiredSubjectId: c.requiredSubjectId
            }))
        }));

    return {
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            currentYear: student.currentYear
        },
        subjects,
        subjectStatuses,
        overallAverage,
        totalGrades: allGrades.length,
        approvedCount: student.subjectStatuses.filter(s => s.approved).length,
        availableSubjects
    };
};
