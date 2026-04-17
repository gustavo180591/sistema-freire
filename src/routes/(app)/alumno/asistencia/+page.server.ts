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
            attendanceEntries: {
                include: {
                    attendance: {
                        include: {
                            commission: {
                                include: {
                                    subject: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    attendance: {
                        classDate: 'desc'
                    }
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

    // Agrupar asistencias por comisión/materia
    const attendanceBySubject = new Map();
    
    for (const entry of student.attendanceEntries) {
        const subjectName = entry.attendance.commission.subject?.name || 'Sin materia';
        const commissionName = entry.attendance.commission.name;
        const key = `${subjectName} - ${commissionName}`;
        
        if (!attendanceBySubject.has(key)) {
            attendanceBySubject.set(key, {
                subject: subjectName,
                commission: commissionName,
                entries: [],
                present: 0,
                absent: 0,
                total: 0
            });
        }
        
        const data = attendanceBySubject.get(key);
        data.entries.push({
            date: entry.attendance.classDate,
            present: entry.present,
            notes: entry.notes
        });
        data.total++;
        if (entry.present) {
            data.present++;
        } else {
            data.absent++;
        }
    }

    // Calcular porcentajes
    const subjects = Array.from(attendanceBySubject.values()).map(s => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
    }));

    return {
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName
        },
        subjects,
        totalClasses: student.attendanceEntries.length,
        overallAttendance: student.attendanceEntries.length > 0 
            ? Math.round((student.attendanceEntries.filter(e => e.present).length / student.attendanceEntries.length) * 100)
            : 0
    };
};
