import { prisma } from '$lib/server/db/prisma';
import type { InstitutionalMetrics, ReportResult } from './reports.types';

/**
 * Get institutional metrics summary
 * Returns key KPIs for the entire system
 */
export async function getInstitutionalMetrics(): Promise<ReportResult<InstitutionalMetrics>> {
	const [
		totalStudents,
		activeStudents,
		totalTeachers,
		activeTeachers,
		totalUsers,
		activeUsers,
		totalDocuments,
		documentsByCategory,
		totalCareers,
		activeCareers,
		totalSubjects,
		activeSubjects,
		totalDebt,
		totalCollected,
		totalPending,
		overdueDebt,
		averageAttendance,
		lowAttendanceCount
	] = await Promise.all([
		// Students
		prisma.student.count(),
		prisma.student.count({ where: { status: 'ACTIVE' } }),
		// Teachers
		prisma.teacher.count(),
		prisma.teacher.count({ where: { status: 'ACTIVE' } }),
		// Users
		prisma.user.count(),
		prisma.user.count({ where: { status: 'ACTIVE' } }),
		// Documents
		prisma.document.count(),
		prisma.document.groupBy({ by: ['category'], _count: true }),
		// Careers
		prisma.career.count(),
		prisma.career.count({ where: { active: true } }),
		// Subjects
		prisma.subject.count(),
		prisma.subject.count({ where: { active: true } }),
		// Financial summary
		getTotalDebt(),
		getTotalCollected(),
		getTotalPending(),
		getOverdueDebt(),
		// Attendance summary
		getAverageAttendance(),
		getLowAttendanceCount()
	]);

	const documentsByCategoryMap = documentsByCategory.reduce(
		(acc, item) => {
			acc[item.category] = item._count;
			return acc;
		},
		{} as Record<string, number>
	);

	const metrics: InstitutionalMetrics = {
		totalStudents,
		activeStudents,
		totalTeachers,
		activeTeachers,
		totalUsers,
		activeUsers,
		totalDocuments,
		documentsByCategory: documentsByCategoryMap,
		totalCareers,
		activeCareers,
		totalSubjects,
		activeSubjects,
		totalDebt,
		totalCollected,
		totalPending,
		overdueDebt,
		averageAttendance,
		lowAttendanceCount
	};

	return {
		data: metrics,
		generatedAt: new Date(),
		recordCount: 1
	};
}

/**
 * Get total debt from StudentCharge
 */
async function getTotalDebt(): Promise<number> {
	const result = await prisma.studentCharge.aggregate({
		_sum: { amount: true }
	});
	return Number(result._sum.amount ?? 0);
}

/**
 * Get total collected from Payment
 */
async function getTotalCollected(): Promise<number> {
	const result = await prisma.payment.aggregate({
		_sum: { amount: true }
	});
	return Number(result._sum.amount ?? 0);
}

/**
 * Get total pending debt
 */
async function getTotalPending(): Promise<number> {
	const charges = await prisma.studentCharge.findMany({
		where: { status: { in: ['PENDING', 'PARTIAL'] } },
		select: { amount: true, paidAmount: true }
	});

	return charges.reduce((acc, charge) => {
		return acc + Number(charge.amount) - Number(charge.paidAmount);
	}, 0);
}

/**
 * Get overdue debt
 */
async function getOverdueDebt(): Promise<number> {
	const charges = await prisma.studentCharge.findMany({
		where: {
			status: { in: ['PENDING', 'PARTIAL'] },
			dueDate: { lt: new Date() }
		},
		select: { amount: true, paidAmount: true }
	});

	return charges.reduce((acc, charge) => {
		return acc + Number(charge.amount) - Number(charge.paidAmount);
	}, 0);
}

/**
 * Get average attendance percentage
 */
async function getAverageAttendance(): Promise<number> {
	const statuses = await prisma.studentSubjectStatus.findMany({
		select: { attendancePercent: true }
	});

	if (statuses.length === 0) return 0;

	const total = statuses.reduce((acc, status) => acc + Number(status.attendancePercent ?? 0), 0);
	return total / statuses.length;
}

/**
 * Get count of students with low attendance (< 75%)
 */
async function getLowAttendanceCount(): Promise<number> {
	const THRESHOLD = 75;
	return prisma.studentSubjectStatus.count({
		where: { attendancePercent: { lt: THRESHOLD } }
	});
}
