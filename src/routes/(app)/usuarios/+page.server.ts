import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
	const users = await prisma.user.findMany({
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
		role: user.roles.map((r: any) => r.role.code).join(', ') || 'SIN_ROL',
		status: user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
	}));

	return {
		users: normalizedUsers,
		metrics: {
			total: normalizedUsers.length,
			active: normalizedUsers.filter((u) => u.status === 'Activo').length,
			inactive: normalizedUsers.filter((u) => u.status === 'Inactivo').length
		}
	};
};
