import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user || !user.roles.includes('ALUMNO')) {
		throw redirect(303, '/login');
	}

	// Obtener el estudiante asociado al usuario (por userId o DNI)
	const student = await getCurrentStudentForUser(user.id);

	// Cargar datos adicionales del estudiante
	const studentWithRelations = await prisma.student.findUnique({
		where: { id: student.id },
		include: {
			career: true
		}
	});

	if (!studentWithRelations) {
		throw error(404, 'No se encontraron datos del estudiante');
	}

	// Obtener estados de materia del estudiante (incluye attendancePercent y regularityStatus calculados)
	const subjectStatuses = await prisma.studentSubjectStatus.findMany({
		where: {
			studentId: studentWithRelations.id
		},
		include: {
			subject: true
		}
	});

	// Obtener entradas de asistencia del estudiante (historial completo)
	const attendanceEntries = await prisma.attendanceEntry.findMany({
		where: {
			studentId: studentWithRelations.id
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

	// Agrupar asistencias por materia con datos reales de StudentSubjectStatus
	const attendanceBySubject = new Map();

	// Inicializar mapa con datos de StudentSubjectStatus
	for (const status of subjectStatuses) {
		const subjectId = status.subjectId;
		attendanceBySubject.set(subjectId, {
			subjectId: status.subjectId,
			subjectName: status.subject.name,
			subjectCode: status.subject.code,
			attendancePercent: Number(status.attendancePercent),
			regularityStatus: status.regularityStatus,
			entries: [],
			present: 0,
			absent: 0,
			total: 0
		});
	}

	// Agregar entradas de asistencia
	for (const entry of attendanceEntries) {
		const subjectId = entry.attendance.subjectId;

		if (!attendanceBySubject.has(subjectId)) {
			// Si no hay StudentSubjectStatus, crear entrada temporal
			attendanceBySubject.set(subjectId, {
				subjectId: entry.attendance.subjectId,
				subjectName: entry.attendance.subject?.name || 'Sin materia',
				subjectCode: entry.attendance.subject?.code || '',
				attendancePercent: 0,
				regularityStatus: 'LIBRE',
				entries: [],
				present: 0,
				absent: 0,
				total: 0
			});
		}

		const data = attendanceBySubject.get(subjectId);
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

	// Convertir a array y agregar alertas de asistencia crítica
	const subjects = Array.from(attendanceBySubject.values()).map((s) => {
		const isCritical = s.attendancePercent < 75 && s.total > 0;
		return {
			...s,
			isCritical,
			percentage:
				s.attendancePercent > 0
					? s.attendancePercent
					: s.total > 0
						? Math.round((s.present / s.total) * 100)
						: 0
		};
	});

	// Calcular estadísticas generales
	const totalClasses = attendanceEntries.length;
	const overallAttendance =
		subjectStatuses.length > 0
			? Math.round(
					subjectStatuses.reduce((sum, s) => sum + Number(s.attendancePercent), 0) /
						subjectStatuses.length
				)
			: totalClasses > 0
				? Math.round((attendanceEntries.filter((e) => e.present).length / totalClasses) * 100)
				: 0;

	return {
		student: {
			id: studentWithRelations.id,
			firstName: studentWithRelations.firstName,
			lastName: studentWithRelations.lastName
		},
		subjects,
		totalClasses,
		overallAttendance,
		recentEntries: attendanceEntries.slice(0, 10).map((e) => ({
			date: e.attendance.classDate,
			subject: e.attendance.subject?.name || 'Sin materia',
			subjectCode: e.attendance.subject?.code || '',
			present: e.present,
			notes: e.notes
		}))
	};
};
