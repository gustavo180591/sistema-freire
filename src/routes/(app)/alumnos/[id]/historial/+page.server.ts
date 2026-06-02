import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
    await requireStudentAccess(locals.user, params.id);

    const student = await prisma.student.findUnique({
        where: { id: params.id },
        include: {
            career: true,
            subjectStatuses: {
                include: {
                    subject: true
                }
            },
            studentCharges: true
        }
    });

    if (!student) {
        throw error(404, 'Alumno no encontrado');
    }

    // Determinar si el alumno es de primer año
    const isFirstYear = student.currentYear === 1;

    let subjects = student.subjectStatuses.map((status) => ({
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

        subjects = [...subjects, ...subjectsWithoutStatus];
    }

    return {
        student: {
            id: student.id,
            fullName: `${student.firstName} ${student.lastName}`,
            dni: student.dni,
            status: student.status,
            career: student.career.name
        },
        academic: {
            totalSubjects: subjects.length,
            approvedSubjects: subjects.filter((s) => s.approved).length,
            regularSubjects: subjects.filter(
                (s) => s.regularityStatus === 'REGULAR'
            ).length,
            progress: 75,
            subjects
        },
        financial: {
            totalDebt: 0
        }
    };
};