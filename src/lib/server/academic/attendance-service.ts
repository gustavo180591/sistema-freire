import { error } from '@sveltejs/kit';

import { prisma } from '../db/prisma';
import { teacherAcademicService } from './teacher-academic-service';
import { calculateAttendancePercent, updateAttendanceStatus } from './plan-logic';

export type AttendanceEntryStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';

export interface AttendanceFormData {
	recordId: string | null;
	subjectId: string;
	subjectName: string;
	subjectCode: string;
	commissionId: string;
	commissionName: string;
	classScheduleId: string;
	classDate: Date;
	students: Array<{
		studentId: string;
		enrollmentId: string;
		firstName: string;
		lastName: string;
		dni: string;
		status: AttendanceEntryStatus;
		notes: string | null;
	}>;
}

export interface AttendanceEntryInput {
	studentId: string;
	status: AttendanceEntryStatus;
	notes?: string | null;
}

function normalizeStatus(entry: {
	status: AttendanceEntryStatus | null;
	present: boolean;
}): AttendanceEntryStatus {
	return entry.status ?? (entry.present ? 'PRESENT' : 'ABSENT');
}

function statusCountsAsLegacyPresent(status: AttendanceEntryStatus): boolean {
	return status === 'PRESENT' || status === 'LATE';
}

export class AttendanceService {
	async getAttendanceFormData(
		teacherId: string,
		subjectId: string,
		commissionId: string,
		classScheduleId: string,
		classDate: Date
	): Promise<AttendanceFormData> {
		await teacherAcademicService.assertTeacherCanAccessCommission(teacherId, commissionId);

		const schedule = await prisma.classSchedule.findUnique({
			where: { id: classScheduleId },
			include: {
				subject: true,
				commission: true
			}
		});

		if (!schedule) {
			throw error(404, 'Horario de clase no encontrado');
		}

		if (!schedule.active) {
			throw error(400, 'El horario de clase no está activo');
		}

		if (schedule.subjectId !== subjectId) {
			throw error(400, 'El horario no pertenece a la materia seleccionada');
		}

		if (schedule.commissionId !== commissionId) {
			throw error(400, 'El horario no pertenece a la comisión seleccionada');
		}

		if (schedule.teacherId !== teacherId) {
			throw error(403, 'No tenés acceso a este horario');
		}

		if (!schedule.commission) {
			throw error(400, 'El horario no tiene una comisión válida');
		}

		const existingRecord = await prisma.attendanceRecord.findFirst({
			where: {
				classScheduleId,
				classDate
			},
			include: {
				entries: true
			}
		});

		const students = await teacherAcademicService.getCommissionStudents(commissionId);

		const entriesMap = new Map<
			string,
			{
				status: AttendanceEntryStatus;
				notes: string | null;
			}
		>();

		if (existingRecord) {
			for (const entry of existingRecord.entries) {
				entriesMap.set(entry.studentId, {
					status: normalizeStatus(entry),
					notes: entry.notes
				});
			}
		}

		return {
			recordId: existingRecord?.id ?? null,
			subjectId,
			subjectName: schedule.subject.name,
			subjectCode: schedule.subject.code,
			commissionId,
			commissionName: schedule.commission.code,
			classScheduleId,
			classDate,
			students: students.map((student) => ({
				studentId: student.studentId,
				enrollmentId: student.enrollmentId,
				firstName: student.firstName,
				lastName: student.lastName,
				dni: student.dni,
				status: entriesMap.get(student.studentId)?.status ?? 'PRESENT',
				notes: entriesMap.get(student.studentId)?.notes ?? null
			}))
		};
	}

	async createOrUpdateAttendanceRecord(
		teacherId: string,
		subjectId: string,
		commissionId: string,
		classScheduleId: string,
		classDate: Date,
		createdByUserId: string,
		entries: AttendanceEntryInput[]
	): Promise<string> {
		await teacherAcademicService.assertTeacherCanAccessCommission(teacherId, commissionId);

		const schedule = await prisma.classSchedule.findUnique({
			where: { id: classScheduleId }
		});

		if (!schedule) {
			throw error(404, 'Horario de clase no encontrado');
		}

		if (
			!schedule.active ||
			schedule.teacherId !== teacherId ||
			schedule.subjectId !== subjectId ||
			schedule.commissionId !== commissionId
		) {
			throw error(403, 'El horario seleccionado no es válido');
		}

		const validStudents = await teacherAcademicService.getCommissionStudents(commissionId);

		const validStudentIds = new Set(validStudents.map((student) => student.studentId));

		if (
			entries.length !== validStudentIds.size ||
			entries.some((entry) => !validStudentIds.has(entry.studentId))
		) {
			throw error(
				400,
				'La lista de estudiantes no coincide con los alumnos activos de la comisión'
			);
		}

		const existingRecord = await prisma.attendanceRecord.findFirst({
			where: {
				classScheduleId,
				classDate
			}
		});

		const recordId = await prisma.$transaction(async (tx) => {
			const record = existingRecord
				? existingRecord
				: await tx.attendanceRecord.create({
						data: {
							subjectId,
							commissionId,
							classScheduleId,
							classDate,
							createdByUserId
						}
					});

			await tx.attendanceEntry.deleteMany({
				where: {
					attendanceId: record.id
				}
			});

			await tx.attendanceEntry.createMany({
				data: entries.map((entry) => ({
					attendanceId: record.id,
					studentId: entry.studentId,
					status: entry.status,
					present: statusCountsAsLegacyPresent(entry.status),
					notes: entry.notes?.trim() || null
				}))
			});

			return record.id;
		});

		for (const entry of entries) {
			await updateAttendanceStatus(entry.studentId, subjectId);
		}

		return recordId;
	}

	async recalculateAttendancePercent(studentId: string, subjectId: string): Promise<number> {
		const attendancePercent = await calculateAttendancePercent(studentId, subjectId);

		await updateAttendanceStatus(studentId, subjectId);

		return attendancePercent;
	}

	async getStudentAttendanceHistory(studentId: string, subjectId?: string) {
		const entries = await prisma.attendanceEntry.findMany({
			where: {
				studentId,
				...(subjectId
					? {
							attendance: {
								subjectId
							}
						}
					: {})
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
		});

		return entries.map((entry) => ({
			id: entry.id,
			classDate: entry.attendance.classDate,
			subjectId: entry.attendance.subjectId,
			subjectName: entry.attendance.subject.name,
			subjectCode: entry.attendance.subject.code,
			commissionCode: entry.attendance.commission?.code ?? null,
			classScheduleId: entry.attendance.classScheduleId,
			status: normalizeStatus(entry),
			notes: entry.notes
		}));
	}

	async getStudentAttendanceSummary(studentId: string) {
		const statuses = await prisma.studentSubjectStatus.findMany({
			where: {
				studentId
			},
			include: {
				subject: true
			}
		});

		return Promise.all(
			statuses.map(async (subjectStatus) => {
				const entries = await prisma.attendanceEntry.findMany({
					where: {
						studentId,
						attendance: {
							subjectId: subjectStatus.subjectId
						}
					},
					select: {
						status: true,
						present: true
					}
				});

				const normalized = entries.map(normalizeStatus);

				const presentCount = normalized.filter((status) => status === 'PRESENT').length;

				const lateCount = normalized.filter((status) => status === 'LATE').length;

				const absentCount = normalized.filter((status) => status === 'ABSENT').length;

				const justifiedCount = normalized.filter((status) => status === 'JUSTIFIED').length;

				return {
					subjectId: subjectStatus.subjectId,
					subjectName: subjectStatus.subject.name,
					subjectCode: subjectStatus.subject.code,
					attendancePercent: Number(subjectStatus.attendancePercent),
					regularityStatus: subjectStatus.regularityStatus,
					academicStatus: subjectStatus.academicStatus,
					presentCount,
					lateCount,
					absentCount,
					justifiedCount,
					totalClasses: normalized.length
				};
			})
		);
	}
}

export const attendanceService = new AttendanceService();
