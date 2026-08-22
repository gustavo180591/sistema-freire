import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

import { prisma } from '$lib/server/db/prisma';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';

function normalizeStatus(entry: { status: string | null; present: boolean }): AttendanceStatus {
	if (
		entry.status === 'PRESENT' ||
		entry.status === 'ABSENT' ||
		entry.status === 'LATE' ||
		entry.status === 'JUSTIFIED'
	) {
		return entry.status;
	}

	return entry.present ? 'PRESENT' : 'ABSENT';
}

function calculatePercentage(statuses: AttendanceStatus[]) {
	if (statuses.length === 0) {
		return 0;
	}

	const computable = statuses.filter((status) => status !== 'JUSTIFIED');

	if (computable.length === 0) {
		return 100;
	}

	const attended = computable.filter((status) => status === 'PRESENT' || status === 'LATE').length;

	return Math.round((attended / computable.length) * 10000) / 100;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user || !user.roles.includes('ALUMNO')) {
		throw redirect(303, '/login');
	}

	const student = await getCurrentStudentForUser(user.id);

	const studentData = await prisma.student.findUnique({
		where: {
			id: student.id
		}
	});

	if (!studentData) {
		throw error(404, 'No se encontraron datos del estudiante');
	}

	const [subjectStatuses, attendanceEntries] = await Promise.all([
		prisma.studentSubjectStatus.findMany({
			where: {
				studentId: student.id
			},
			include: {
				subject: true
			}
		}),
		prisma.attendanceEntry.findMany({
			where: {
				studentId: student.id
			},
			include: {
				attendance: {
					include: {
						subject: true,
						commission: true,
						classSchedule: true
					}
				}
			},
			orderBy: {
				attendance: {
					classDate: 'desc'
				}
			}
		})
	]);

	const statusBySubject = new Map(subjectStatuses.map((status) => [status.subjectId, status]));

	const grouped = new Map<string, any>();

	for (const entry of attendanceEntries) {
		const subject = entry.attendance.subject;

		const status = normalizeStatus(entry);

		if (!grouped.has(subject.id)) {
			grouped.set(subject.id, {
				subjectId: subject.id,
				subjectCode: subject.code,
				subjectName: subject.name,
				entries: []
			});
		}

		grouped.get(subject.id).entries.push({
			id: entry.id,
			date: entry.attendance.classDate,
			commission: entry.attendance.commission?.code ?? null,
			startTime: entry.attendance.classSchedule?.startTime ?? null,
			endTime: entry.attendance.classSchedule?.endTime ?? null,
			status,
			notes: entry.notes
		});
	}

	const subjects = [...grouped.values()].map((subject) => {
		const statuses: AttendanceStatus[] = subject.entries.map(
			(entry: { status: AttendanceStatus }) => entry.status
		);

		const subjectStatus = statusBySubject.get(subject.subjectId);

		return {
			...subject,
			percentage: subjectStatus
				? Number(subjectStatus.attendancePercent)
				: calculatePercentage(statuses),
			regularityStatus: subjectStatus?.regularityStatus ?? 'LIBRE',
			total: statuses.length,
			present: statuses.filter((status) => status === 'PRESENT').length,
			late: statuses.filter((status) => status === 'LATE').length,
			absent: statuses.filter((status) => status === 'ABSENT').length,
			justified: statuses.filter((status) => status === 'JUSTIFIED').length
		};
	});

	const allStatuses = attendanceEntries.map(normalizeStatus);

	return {
		student: {
			id: studentData.id,
			firstName: studentData.firstName,
			lastName: studentData.lastName
		},
		subjects,
		totalClasses: attendanceEntries.length,
		overallAttendance: calculatePercentage(allStatuses)
	};
};
