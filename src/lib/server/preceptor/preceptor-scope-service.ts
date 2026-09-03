import { error } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';

export interface PreceptorScope {
	locationIds: string[];
}

/**
 * Obtiene el alcance operativo propio del módulo PRECEPTOR.
 *
 * IMPORTANTE:
 * Los otros roles que pueda tener el usuario NO amplían este alcance.
 * Un PRECEPTOR + FINANZAS, por ejemplo, continúa limitado a las sedes
 * asignadas explícitamente mediante UserLocationPermission.
 */
export async function getPreceptorScope(userId: string): Promise<PreceptorScope> {
	const user = await prisma.user.findUnique({
		where: {
			id: userId
		},
		select: {
			status: true,
			roles: {
				select: {
					role: {
						select: {
							code: true
						}
					}
				}
			},
			locationPermissions: {
				select: {
					locationId: true,
					location: {
						select: {
							active: true
						}
					}
				}
			}
		}
	});

	if (
		!user ||
		user.status !== 'ACTIVE' ||
		!user.roles.some(({ role }) => role.code === 'PRECEPTOR')
	) {
		throw error(403, 'No tenés acceso al módulo de preceptor');
	}

	const locationIds = [
		...new Set(
			user.locationPermissions
				.filter((permission) => permission.location.active)
				.map((permission) => permission.locationId)
		)
	];

	return {
		locationIds
	};
}

/**
 * Filtro reutilizable para consultas de alumnos dentro del ámbito
 * operativo del preceptor.
 */
export function getPreceptorStudentWhere(scope: PreceptorScope): Prisma.StudentWhereInput {
	return {
		locationId: {
			in: scope.locationIds
		}
	};
}

/**
 * Verifica ownership/alcance sobre un alumno.
 */
export async function requirePreceptorStudentAccess(userId: string, studentId: string) {
	const scope = await getPreceptorScope(userId);

	const student = await prisma.student.findFirst({
		where: {
			id: studentId,
			locationId: {
				in: scope.locationIds
			}
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			dni: true,
			locationId: true,
			careerId: true,
			status: true
		}
	});

	if (!student) {
		throw error(403, 'No tenés acceso a este alumno');
	}

	return student;
}

/**
 * Verifica que una comisión pertenezca a una sede asignada
 * al preceptor.
 */
export async function requirePreceptorCommissionAccess(userId: string, commissionId: string) {
	const scope = await getPreceptorScope(userId);

	const commission = await prisma.subjectCommission.findFirst({
		where: {
			id: commissionId,
			locationId: {
				in: scope.locationIds
			}
		},
		select: {
			id: true,
			code: true,
			subjectId: true,
			careerId: true,
			locationId: true,
			active: true
		}
	});

	if (!commission) {
		throw error(403, 'No tenés acceso a esta comisión');
	}

	return commission;
}

/**
 * Verifica que una entrada de asistencia pertenezca a un alumno
 * dentro del ámbito del preceptor.
 */
export async function requirePreceptorAttendanceEntryAccess(userId: string, entryId: string) {
	const scope = await getPreceptorScope(userId);

	const entry = await prisma.attendanceEntry.findFirst({
		where: {
			id: entryId,
			student: {
				locationId: {
					in: scope.locationIds
				}
			}
		},
		include: {
			student: true,
			attendance: {
				include: {
					subject: true
				}
			}
		}
	});

	if (!entry) {
		throw error(403, 'No tenés acceso a este registro de asistencia');
	}

	return entry;
}
