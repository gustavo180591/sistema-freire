import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        throw redirect(303, '/login');
    }

    // Verificar que sea alumno
    const isStudent = user.roles.includes('ALUMNO');
    if (!isStudent) {
        throw redirect(303, '/dashboard');
    }

    // Buscar el estudiante asociado al usuario
    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
            career: true,
            subjectStatuses: {
                include: {
                    subject: true
                }
            },
            studentCharges: {
                include: {
                    concept: true
                }
            }
        }
    });

    if (!student) {
        throw redirect(303, '/dashboard');
    }

    // Determinar si el alumno es de primer año
    const isFirstYear = student.currentYear === 1;

    // Calcular todas las materias (como en historial)
    let allSubjects = student.subjectStatuses.map((status) => ({
        id: status.id,
        subject: status.subject.name,
        subjectId: status.subject.id,
        yearLevel: status.subject.yearLevel,
        attendancePercent: Number(status.attendancePercent),
        regularityStatus: status.regularityStatus,
        approved: status.approved,
        hasStatus: true
    }));

    // Si es de primer año, agregar todas las materias de primer año de la carrera
    if (isFirstYear && student.careerId) {
        const firstYearSubjects = await prisma.subject.findMany({
            where: {
                active: true,
                yearLevel: 1,
                careerSubjects: {
                    some: {
                        careerId: student.careerId
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Agregar materias que no tienen status asignado
        const subjectIdsWithStatus = new Set(student.subjectStatuses.map(s => s.subjectId));
        const subjectsWithoutStatus = firstYearSubjects
            .filter(s => !subjectIdsWithStatus.has(s.id))
            .map(s => ({
                id: s.id,
                subject: s.name,
                subjectId: s.id,
                yearLevel: s.yearLevel,
                attendancePercent: 0,
                regularityStatus: 'LIBRE' as const,
                approved: false,
                hasStatus: false
            }));

        allSubjects = [...allSubjects, ...subjectsWithoutStatus];
    }

    // Calcular métricas académicas
    const totalSubjects = allSubjects.length;
    const approvedSubjects = allSubjects.filter(s => s.approved).length;
    const regularSubjects = allSubjects.filter(
        s => s.regularityStatus === 'REGULAR'
    ).length;

    // Materias cursadas (aprobadas o regularizadas)
    const completedSubjects = allSubjects.filter(
        s => s.approved || s.regularityStatus === 'REGULAR'
    );

    // Materias cursando (en estado LIBRE)
    const currentSubjects = allSubjects.filter(
        s => s.regularityStatus === 'LIBRE'
    );

    // Calcular deuda total
    const totalDebt = student.studentCharges.reduce(
        (acc, charge) => acc + Number(charge.amount),
        0
    );

    return {
        student: {
            id: student.id,
            dni: student.dni,
            firstName: student.firstName,
            lastName: student.lastName,
            fullName: `${student.firstName} ${student.lastName}`,
            career: student.career?.name || 'Sin carrera',
            status: student.status
        },
        academic: {
            totalSubjects,
            approvedSubjects,
            regularSubjects,
            progress: totalSubjects > 0 ? Math.round((approvedSubjects / totalSubjects) * 100) : 0,
            completedSubjects: completedSubjects.map(s => ({
                id: s.subjectId,
                name: s.subject,
                code: '',
                yearLevel: s.yearLevel,
                regularityStatus: s.regularityStatus,
                approved: s.approved
            })),
            currentSubjects: currentSubjects.map(s => ({
                id: s.subjectId,
                name: s.subject,
                code: '',
                yearLevel: s.yearLevel,
                regularityStatus: s.regularityStatus,
                approved: s.approved
            }))
        },
        finances: {
            totalDebt,
            charges: student.studentCharges.slice(0, 5) // Últimos 5 cargos
        }
    };
};
