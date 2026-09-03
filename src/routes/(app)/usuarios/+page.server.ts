import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { RoleCode } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const USER_MANAGEMENT_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const SECRETARY_HIDDEN_ROLES: RoleCode[] = [
	'SUPERADMIN',
	'SECRETARIA',
	'DIRECTOR',
	'APODERADO',
	'FINANZAS'
];

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
	await requirePermission(currentUser, 'USER', 'read');

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

	const users = await prisma.user.findMany({
		where: isSecretary
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
										locationId: {
											in: secretaryLocationIds
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
			: undefined,
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
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
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

	return {
		users: normalizedUsers,
		metrics: {
			total: normalizedUsers.length,
			active: normalizedUsers.filter((user) => user.status === 'Activo').length,
			inactive: normalizedUsers.filter((user) => user.status === 'Inactivo').length
		}
	};
};
