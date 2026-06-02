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
            career: true
        }
    });

    if (!student) {
        throw redirect(303, '/dashboard');
    }

    // Obtener entradas de asistencia del estudiante
    const attendanceEntries = await prisma.attendanceEntry.findMany({
        where: {
            studentId: student.id
        },
        include: {
            attendance: {
                include: {
                    subject: true
                }
            }
        },
        orderBy: {
            attendance: {
                classDate: 'desc'
            }
        }
    });

    // Agrupar asistencias por materia
    const attendanceBySubject = new Map();
    
    for (const entry of attendanceEntries) {
        const subjectName = entry.attendance.subject?.name || 'Sin materia';
        const key = subjectName;
        
        if (!attendanceBySubject.has(key)) {
            attendanceBySubject.set(key, {
                subject: subjectName,
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
        totalClasses: attendanceEntries.length,
        overallAttendance: attendanceEntries.length > 0 
            ? Math.round((attendanceEntries.filter(e => e.present).length / attendanceEntries.length) * 100)
            : 0
    };
};
