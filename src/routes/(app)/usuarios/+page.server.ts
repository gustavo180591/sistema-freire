import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { RoleCode, type Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const PAGE_SIZE = 25;

const USER_MANAGEMENT_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const SECRETARY_HIDDEN_ROLES: RoleCode[] = [
	'SUPERADMIN',
	'SECRETARIA',
	'DIRECTOR',
	'APODERADO',
	'FINANZAS'
];

function parsePage(value: string | null) {
	if (!value) return 1;

	const page = Number.parseInt(value, 10);

	return Number.isInteger(page) && page > 0 ? page : 1;
}

function buildSearchFilters(searchQuery: string): Prisma.UserWhereInput[] {
	const terms = searchQuery
		.split(/\s+/)
		.map((term) => term.trim())
		.filter(Boolean);

	return terms.map((term) => {
		const normalizedRole = term.toUpperCase().replace(/\s+/g, '_');

		const matchingRoleCodes = Object.values(RoleCode).filter((roleCode) =>
			roleCode.includes(normalizedRole)
		);

		const filters: Prisma.UserWhereInput[] = [
			{
				firstName: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				lastName: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				email: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				dni: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				student: {
					is: {
						dni: {
							contains: term,
							mode: 'insensitive'
						}
					}
				}
			},
			{
				teacher: {
					is: {
						dni: {
							contains: term,
							mode: 'insensitive'
						}
					}
				}
			},
			{
				roles: {
					some: {
						role: {
							name: {
								contains: term,
								mode: 'insensitive'
							}
						}
					}
				}
			}
		];

		if (matchingRoleCodes.length > 0) {
			filters.push({
				roles: {
					some: {
						role: {
							code: {
								in: matchingRoleCodes
							}
						}
					}
				}
			});
		}

		return {
			OR: filters
		};
	});
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
	await requirePermission(currentUser, 'USER', 'read');

	const searchQuery = url.searchParams.get('q')?.trim() ?? '';
	const requestedPage = parsePage(url.searchParams.get('page'));

	const isSecretary = currentUser.roles.includes('SECRETARIA');

	const secretaryLocationIds = isSecretary
		? (
				await prisma.userLocationPermission.findMany({
					where: {
						userId: currentUser.id,
						location: {
							active: true
						}
					},
					select: {
						locationId: true
					}
				})
			).map((permission) => permission.locationId)
		: [];

	const scopeWhere: Prisma.UserWhereInput = isSecretary
		? {
				AND: [
					{
						roles: {
							none: {
								role: {
									code: {
										in: SECRETARY_HIDDEN_ROLES
									}
								}
							}
						}
					},
					{
						OR: [
							{
								student: {
									is: {
										locationId: {
											in: secretaryLocationIds
										}
									}
								}
							},
							{
								locationPermissions: {
									some: {
										locationId: {
											in: secretaryLocationIds
										}
									}
								}
							}
						]
					}
				]
			}
		: {};

	const searchFilters = buildSearchFilters(searchQuery);

	const where: Prisma.UserWhereInput =
		searchFilters.length > 0
			? {
					AND: [scopeWhere, ...searchFilters]
				}
			: scopeWhere;

	const [totalItems, totalUsers, activeUsers, inactiveUsers] = await Promise.all([
		prisma.user.count({
			where
		}),
		prisma.user.count({
			where: scopeWhere
		}),
		prisma.user.count({
			where: {
				AND: [scopeWhere, { status: 'ACTIVE' }]
			}
		}),
		prisma.user.count({
			where: {
				AND: [scopeWhere, { status: 'INACTIVE' }]
			}
		})
	]);

	const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);
	const skip = (page - 1) * PAGE_SIZE;

	const users = await prisma.user.findMany({
		where,
		include: {
			roles: {
				include: {
					role: {
						select: {
							code: true,
							name: true
						}
					}
				}
			},
			student: {
				select: {
					dni: true,
					birthDate: true,
					bloodType: true,
					phone: true,
					address: true,
					locality: true,
					postalCode: true,
					careerId: true,
					currentYear: true,
					isBecado: true,
					isRecursante: true,
					status: true
				}
			},
			teacher: {
				select: {
					dni: true,
					status: true,
					hireDate: true,
					observations: true
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
		skip,
		take: PAGE_SIZE
	});

	const normalizedUsers = users.map((user) => ({
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		fullName: `${user.firstName} ${user.lastName}`.trim(),
		email: user.email,
		dni: user.dni || user.student?.dni || user.teacher?.dni || '',
		phone: user.student?.phone || user.phone || '',
		birthDate: user.student?.birthDate ?? null,
		bloodType: user.student?.bloodType ?? null,
		address: user.student?.address ?? null,
		locality: user.student?.locality ?? null,
		postalCode: user.student?.postalCode ?? null,
		careerId: user.student?.careerId ?? null,
		currentYear: user.student?.currentYear ?? null,
		isBecado: user.student?.isBecado ?? null,
		isRecursante: user.student?.isRecursante ?? null,
		studentStatus: user.student?.status ?? null,
		teacherStatus: user.teacher?.status ?? null,
		hireDate: user.teacher?.hireDate ?? null,
		observations: user.teacher?.observations ?? null,
		role: user.roles.map((roleAssignment) => roleAssignment.role.code).join(', ') || 'SIN_ROL',
		status: user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
	}));

	const from = totalItems === 0 ? 0 : skip + 1;
	const to = totalItems === 0 ? 0 : Math.min(skip + normalizedUsers.length, totalItems);

	return {
		users: normalizedUsers,
		searchQuery,
		metrics: {
			total: totalUsers,
			active: activeUsers,
			inactive: inactiveUsers
		},
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			totalItems,
			totalPages,
			from,
			to
		}
	};
};
