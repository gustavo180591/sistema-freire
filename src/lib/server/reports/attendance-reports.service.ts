import { prisma } from '$lib/server/db/prisma';
import type { AttendanceReportMetrics, ReportResult, ReportFilters } from './reports.types';

/**
 * Get attendance report metrics
 */
export async function getAttendanceReportMetrics(
	filters?: ReportFilters
): Promise<ReportResult<AttendanceReportMetrics>> {
	const [
		totalAttendanceRecords,
		totalAttendanceEntries,
		presentCount,
		absentCount,
		justifiedCount,
		unjustifiedCount,
		averageAttendance,
		averageBySubject,
		averageByCommission
	] = await Promise.all([
		getTotalAttendanceRecords(filters),
		getTotalAttendanceEntries(filters),
		getPresentCount(filters),
		getAbsentCount(filters),
		getJustifiedCount(filters),
		getUnjustifiedCount(filters),
		getAverageAttendance(filters),
		getAverageBySubject(filters),
		getAverageByCommission(filters)
	]);

	const metrics: AttendanceReportMetrics = {
		totalAttendanceRecords,
		totalAttendanceEntries,
		presentCount,
		absentCount,
		justifiedCount,
		unjustifiedCount,
		averageAttendance,
		averageBySubject,
		averageByCommission
	};

	return {
		data: metrics,
		generatedAt: new Date(),
		recordCount: 1
	};
}

/**
 * Get total attendance records (classes)
 */
async function getTotalAttendanceRecords(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceRecordWhere(filters);
	return prisma.attendanceRecord.count({ where });
}

/**
 * Get total attendance entries (student attendances)
 */
async function getTotalAttendanceEntries(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceEntryWhere(filters);
	return prisma.attendanceEntry.count({ where });
}

/**
 * Get count of present entries
 */
async function getPresentCount(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceEntryWhere(filters);
	return prisma.attendanceEntry.count({ where: { ...where, present: true } });
}

/**
 * Get count of absent entries
 */
async function getAbsentCount(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceEntryWhere(filters);
	return prisma.attendanceEntry.count({ where: { ...where, present: false } });
}

/**
 * Get count of absences with observations (provisional "justified" criteria)
 * Note: This is a provisional criterion based on presence of notes field.
 * This is NOT a formal justification system - just absences with any observation/notes.
 * A proper justification system would require a dedicated model for justification types.
 */
async function getJustifiedCount(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceEntryWhere(filters);
	return prisma.attendanceEntry.count({
		where: { ...where, present: false, notes: { not: null } }
	});
}

/**
 * Get count of absences without observations (provisional "unjustified" criteria)
 * Note: This is a provisional criterion based on absence of notes field.
 * This is NOT a formal unjustification system - just absences without any observation/notes.
 */
async function getUnjustifiedCount(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceEntryWhere(filters);
	return prisma.attendanceEntry.count({
		where: { ...where, present: false, notes: null }
	});
}

/**
 * Get average attendance percentage
 */
async function getAverageAttendance(filters?: ReportFilters): Promise<number> {
	const where = buildAttendanceEntryWhere(filters);
	const entries = await prisma.attendanceEntry.findMany({
		where,
		select: { present: true }
	});

	if (entries.length === 0) return 0;

	const present = entries.filter((e) => e.present).length;
	return (present / entries.length) * 100;
}

/**
 * Get average attendance by subject
 */
async function getAverageBySubject(filters?: ReportFilters): Promise<Record<string, number>> {
	const records = await prisma.attendanceRecord.findMany({
		select: { id: true, subjectId: true }
	});

	const subjectIds = records.map((r) => r.subjectId);
	const subjects = await prisma.subject.findMany({
		where: { id: { in: subjectIds } },
		select: { id: true, name: true }
	});

	const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
	const averages: Record<string, number> = {};

	for (const record of records) {
		const subjectName = subjectMap.get(record.subjectId) || 'Unknown';
		const entries = await prisma.attendanceEntry.findMany({
			where: { attendanceId: record.id },
			select: { present: true }
		});

		if (entries.length > 0) {
			const present = entries.filter((e) => e.present).length;
			averages[subjectName] = (present / entries.length) * 100;
		}
	}

	return averages;
}

/**
 * Get average attendance by commission
 */
async function getAverageByCommission(filters?: ReportFilters): Promise<Record<string, number>> {
	const records = await prisma.attendanceRecord.findMany({
		select: { id: true, commissionId: true }
	});

	const commissionIds = records.filter((r) => r.commissionId).map((r) => r.commissionId!);
	const commissions = await prisma.subjectCommission.findMany({
		where: { id: { in: commissionIds } },
		select: { id: true, code: true }
	});

	const commissionMap = new Map(commissions.map((c) => [c.id, c.code]));
	const averages: Record<string, number> = {};

	for (const record of records) {
		if (!record.commissionId) continue;

		const commissionCode = commissionMap.get(record.commissionId) || 'Unknown';
		const entries = await prisma.attendanceEntry.findMany({
			where: { attendanceId: record.id },
			select: { present: true }
		});

		if (entries.length > 0) {
			const present = entries.filter((e) => e.present).length;
			averages[commissionCode] = (present / entries.length) * 100;
		}
	}

	return averages;
}

/**
 * Build where clause for attendance records based on filters
 */
function buildAttendanceRecordWhere(filters?: ReportFilters): Record<string, unknown> {
	const where: {
		subjectId?: string;
		commissionId?: string;
		classDate?: { gte?: Date; lte?: Date };
	} = {};

	if (filters?.subjectId) {
		where.subjectId = filters.subjectId;
	}

	if (filters?.commissionId) {
		where.commissionId = filters.commissionId;
	}

	if (filters?.startDate || filters?.endDate) {
		where.classDate = {};
		if (filters.startDate) {
			where.classDate.gte = filters.startDate;
		}
		if (filters.endDate) {
			where.classDate.lte = filters.endDate;
		}
	}

	return where;
}

/**
 * Build where clause for attendance entries based on filters
 */
function buildAttendanceEntryWhere(filters?: ReportFilters): Record<string, unknown> {
	const where: Record<string, unknown> = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters?.subjectId) {
		where.attendance = {
			subjectId: filters.subjectId
		};
	}

	if (filters?.commissionId) {
		where.attendance = {
			...((where.attendance as Record<string, unknown>) || {}),
			commissionId: filters.commissionId
		};
	}

	return where;
}
