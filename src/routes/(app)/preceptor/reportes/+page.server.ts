import { FollowUpType } from '@prisma/client';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import {
	getPreceptorScope,
	getPreceptorStudentWhere
} from '$lib/server/preceptor/preceptor-scope-service';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, ['PRECEPTOR']);

	await Promise.all([
		requirePermission(currentUser, 'STUDENT', 'read'),
		requirePermission(currentUser, 'ATTENDANCE', 'read'),
		requirePermission(currentUser, 'STUDENT_FOLLOW_UP', 'read'),
		requirePermission(currentUser, 'CAREER', 'read')
	]);

	const scope = await getPreceptorScope(currentUser.id);
	const studentWhere = getPreceptorStudentWhere(scope);

	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

	const [
		scopeLocations,
		totalAttendance,
		presentAttendance,
		incidentCount,
		activeStudentCount,
		studentsByCareer,
		followUpsByType
	] = await Promise.all([
		prisma.location.findMany({
			where: {
				id: {
					in: scope.locationIds
				},
				active: true
			},
			select: {
				id: true,
				name: true
			},
			orderBy: {
				name: 'asc'
			}
		}),

		prisma.attendanceEntry.count({
			where: {
				student: {
					is: studentWhere
				},
				attendance: {
					classDate: {
						gte: thirtyDaysAgo
					}
				}
			}
		}),

		prisma.attendanceEntry.count({
			where: {
				present: true,
				student: {
					is: studentWhere
				},
				attendance: {
					classDate: {
						gte: thirtyDaysAgo
					}
				}
			}
		}),

		prisma.studentFollowUp.count({
			where: {
				type: FollowUpType.INCIDENT,
				createdAt: {
					gte: thirtyDaysAgo
				},
				student: {
					is: studentWhere
				}
			}
		}),

		prisma.student.count({
			where: {
				...studentWhere,
				status: 'ACTIVE'
			}
		}),

		prisma.student.groupBy({
			by: ['careerId'],
			_count: true,
			where: {
				...studentWhere,
				status: 'ACTIVE'
			}
		}),

		prisma.studentFollowUp.groupBy({
			by: ['type'],
			_count: true,
			where: {
				createdAt: {
					gte: thirtyDaysAgo
				},
				student: {
					is: studentWhere
				}
			}
		})
	]);

	const careerIds = studentsByCareer.map((stat) => stat.careerId);

	const careers =
		careerIds.length > 0
			? await prisma.career.findMany({
					where: {
						id: {
							in: careerIds
						}
					},
					select: {
						id: true,
						name: true
					}
				})
			: [];

	const careerNameById = new Map(careers.map((career) => [career.id, career.name]));

	const careerStats = studentsByCareer
		.map((stat) => ({
			careerId: stat.careerId,
			careerName: careerNameById.get(stat.careerId) ?? 'Carrera no disponible',
			count: stat._count
		}))
		.sort((a, b) => a.careerName.localeCompare(b.careerName, 'es'));

	const attendanceRate =
		totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

	return {
		scope: {
			locations: scopeLocations
		},
		stats: {
			attendanceRate,
			totalAttendance,
			presentAttendance,
			incidentCount,
			activeStudentCount,
			careerStats,
			followUpsByType: followUpsByType
				.map((followUp) => ({
					type: followUp.type,
					count: followUp._count
				}))
				.sort((a, b) => a.type.localeCompare(b.type))
		}
	};
};
