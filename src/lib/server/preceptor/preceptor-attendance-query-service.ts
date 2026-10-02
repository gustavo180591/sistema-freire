import { EnrollmentStatus } from '@prisma/client';

import { prisma } from '$lib/server/db/prisma';
import { getPreceptorScope } from '$lib/server/preceptor/preceptor-scope-service';

export async function getPreceptorAttendancePageData(userId: string) {
	const scope = await getPreceptorScope(userId);

	const [enrollments, commissions, locations] = await Promise.all([
		prisma.subjectEnrollment.findMany({
			where: {
				status: EnrollmentStatus.ACTIVE,
				subject: {
					is: {
						active: true
					}
				},
				student: {
					is: {
						status: 'ACTIVE',
						locationId: {
							in: scope.locationIds
						}
					}
				},
				OR: [
					{
						commissionId: null
					},
					{
						commission: {
							is: {
								active: true,
								locationId: {
									in: scope.locationIds
								}
							}
						}
					}
				]
			},
			select: {
				id: true,
				studentId: true,
				subjectId: true,
				commissionId: true,
				student: {
					select: {
						id: true,
						dni: true,
						firstName: true,
						lastName: true,
						currentYear: true,
						locationId: true,
						location: {
							select: {
								name: true
							}
						},
						career: {
							select: {
								name: true
							}
						}
					}
				},
				subject: {
					select: {
						id: true,
						code: true,
						name: true,
						yearLevel: true
					}
				}
			},
			orderBy: [
				{
					student: {
						lastName: 'asc'
					}
				},
				{
					student: {
						firstName: 'asc'
					}
				}
			]
		}),

		prisma.subjectCommission.findMany({
			where: {
				active: true,
				locationId: {
					in: scope.locationIds
				},
				enrollments: {
					some: {
						status: EnrollmentStatus.ACTIVE,
						student: {
							status: 'ACTIVE',
							locationId: {
								in: scope.locationIds
							}
						}
					}
				}
			},
			select: {
				id: true,
				code: true,
				subjectId: true,
				locationId: true,
				schedule: true,
				subject: {
					select: {
						name: true
					}
				},
				teacher: {
					select: {
						firstName: true,
						lastName: true
					}
				},
				location: {
					select: {
						name: true
					}
				}
			},
			orderBy: {
				code: 'asc'
			}
		}),

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
		})
	]);

	const subjectsById = new Map<
		string,
		{
			id: string;
			code: string;
			name: string;
			yearLevel: number;
		}
	>();

	for (const enrollment of enrollments) {
		subjectsById.set(enrollment.subject.id, enrollment.subject);
	}

	return {
		subjects: [...subjectsById.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')),

		commissions: commissions.map((commission) => ({
			id: commission.id,
			code: commission.code,
			subjectId: commission.subjectId,
			subjectName: commission.subject.name,
			teacherName: commission.teacher
				? `${commission.teacher.lastName}, ${commission.teacher.firstName}`
				: null,
			locationId: commission.locationId,
			locationName: commission.location?.name ?? null,
			schedule: commission.schedule
		})),

		enrollments: enrollments.map((enrollment) => ({
			id: enrollment.id,
			subjectId: enrollment.subjectId,
			commissionId: enrollment.commissionId,
			student: {
				id: enrollment.student.id,
				dni: enrollment.student.dni,
				firstName: enrollment.student.firstName,
				lastName: enrollment.student.lastName,
				career: enrollment.student.career.name,
				currentYear: enrollment.student.currentYear,
				locationId: enrollment.student.locationId,
				locationName: enrollment.student.location?.name ?? 'Sin sede'
			}
		})),

		locations
	};
}
