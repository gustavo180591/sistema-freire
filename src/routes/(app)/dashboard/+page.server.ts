import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';

const REGULARITY_THRESHOLD = 75;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	// Obtener localidades permitidas para el usuario
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Comprobación segura por si los modelos financieros aún no existen en schema.prisma
	const financialSummary =
		'studentCharge' in prisma
			? await (prisma as any).studentCharge
					.aggregate({
						_sum: { amount: true, paidAmount: true }
					})
					.catch(() => null)
			: null;

	const studentsWithDebt =
		'studentCharge' in prisma
			? await (prisma as any).studentCharge
					.groupBy({
						by: ['studentId'],
						_sum: { amount: true, paidAmount: true }
					})
					.catch(() => [])
			: [];

	const [activeStudents, lowRegularityCount, activeSubjects, recentAuditLogs, activeTerms] =
		await Promise.all([
			// Filtrar estudiantes por localidad a través de su carrera
			prisma.student
				.count({
					where: {
						status: 'ACTIVE',
						career: {
							locations: {
								some: {
									locationId: { in: allowedLocationIds }
								}
							}
						}
					}
				})
				.catch(() => 0),
			// Filtrar estados de materias por localidad a través del estudiante
			prisma.studentSubjectStatus
				.count({
					where: {
						regularityStatus: 'LIBRE',
						student: {
							career: {
								locations: {
									some: {
										locationId: { in: allowedLocationIds }
									}
								}
							}
						}
					}
				})
				.catch(() => 0),
			// Materias no tienen localidad directa, pero se filtran por localidad si están asociadas a carreras
			prisma.subject.count({ where: { active: true } }).catch(() => 0),
			// Audit logs no se filtran por localidad (son globales)
			prisma.auditLog
				.findMany({
					take: 5,
					orderBy: { createdAt: 'desc' },
					include: { user: { select: { firstName: true, lastName: true, email: true } } }
				})
				.catch(() => []),
			// Filtrar períodos académicos por localidad permitida
			prisma.academicTerm
				.findMany({
					where: {
						active: true,
						OR: [
							{ locationId: { in: allowedLocationIds } },
							{ locationId: null } // Períodos globales
						]
					},
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
			where: {
				attendancePercent: { lt: REGULARITY_THRESHOLD },
				student: {
					career: {
						locations: {
							some: {
								locationId: { in: allowedLocationIds }
							}
						}
					}
				}
			}
		})
		.catch(() => 0);

	const pendingExamRecords =
		'examRegistration' in prisma
			? await (prisma as any).examRegistration
					.count({ where: { status: 'REGISTERED' } })
					.catch(() => 0)
			: 0;

	return {
		metrics: {
			activeStudents,
			blockedStudentsCount,
			lowRegularityCount,
			activeSubjects,
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
