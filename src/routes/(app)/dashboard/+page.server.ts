import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

const REGULARITY_THRESHOLD = 75;

export const load: PageServerLoad = async () => {
	// Comprobación segura por si los modelos financieros aún no existen en schema.prisma
	const financialSummary =
		'studentCharge' in prisma
			? await (prisma as any).studentCharge
					.aggregate({ _sum: { amount: true, paidAmount: true } })
					.catch(() => null)
			: null;

	const studentsWithDebt =
		'studentCharge' in prisma
			? await (prisma as any).studentCharge
					.groupBy({ by: ['studentId'], _sum: { amount: true, paidAmount: true } })
					.catch(() => [])
			: [];

	const [activeStudents, lowRegularityCount, activeCommissions, recentAuditLogs, activeTerms] =
		await Promise.all([
			prisma.student.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
			prisma.studentSubjectStatus.count({ where: { regularityStatus: 'LIBRE' } }).catch(() => 0),
			prisma.commission.count({ where: { active: true } }).catch(() => 0),
			prisma.auditLog
				.findMany({
					take: 5,
					orderBy: { createdAt: 'desc' },
					include: { user: { select: { firstName: true, lastName: true, email: true } } }
				})
				.catch(() => []),
			prisma.academicTerm
				.findMany({
					where: { active: true },
					select: { id: true, name: true, year: true, startDate: true, endDate: true },
					orderBy: [{ year: 'desc' }, { startDate: 'desc' }]
				})
				.catch(() => [])
		]);

	const totalDebt = Number(financialSummary?._sum?.amount ?? 0);
	const totalPaid = Number(financialSummary?._sum?.paidAmount ?? 0);
	const outstandingDebt = Math.max(0, totalDebt - totalPaid);

	const blockedStudentsCount = studentsWithDebt.filter((item: any) => {
		const amount = Number(item._sum.amount ?? 0);
		const paid = Number(item._sum.paidAmount ?? 0);
		return amount - paid > 0;
	}).length;

	const attendanceRiskCount = await prisma.studentSubjectStatus
		.count({
			where: { attendancePercent: { lt: REGULARITY_THRESHOLD } }
		})
		.catch(() => 0);

	const pendingExamRecords =
		'examRegistration' in prisma
			? await (prisma as any).examRegistration
					.count({ where: { status: 'PENDING' } })
					.catch(() => 0)
			: 0;

	return {
		metrics: {
			activeStudents,
			blockedStudentsCount,
			lowRegularityCount,
			activeCommissions,
			outstandingDebt,
			attendanceRiskCount,
			pendingExamRecords
		},
		activeTerms,
		recentAuditLogs: recentAuditLogs.map((log: any) => ({
			id: log.id,
			action: log.action,
			entityType: log.entityType,
			description: log.description,
			createdAt: log.createdAt,
			user: log.user
				? {
						fullName: `${log.user.firstName} ${log.user.lastName}`.trim(),
						email: log.user.email
					}
				: null
		}))
	};
};
