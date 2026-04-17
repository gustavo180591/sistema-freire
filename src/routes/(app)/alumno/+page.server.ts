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
            },
            enrollments: {
                include: {
                    commission: {
                        include: {
                            subject: true
                        }
                    }
                }
            }
        }
    });

    if (!student) {
        throw redirect(303, '/dashboard');
    }

    // Calcular métricas académicas
    const totalSubjects = student.subjectStatuses.length;
    const approvedSubjects = student.subjectStatuses.filter(s => s.approved).length;
    const regularSubjects = student.subjectStatuses.filter(
        s => s.regularityStatus === 'REGULAR'
    ).length;

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
            progress: totalSubjects > 0 ? Math.round((approvedSubjects / totalSubjects) * 100) : 0
        },
        finances: {
            totalDebt,
            charges: student.studentCharges.slice(0, 5) // Últimos 5 cargos
        },
        enrollments: student.enrollments.map(e => ({
            id: e.id,
            commission: e.commission.name,
            subject: e.commission.subject?.name || 'Sin materia',
            year: e.commission.subject?.yearLevel || 0
        }))
    };
};
