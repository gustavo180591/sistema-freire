import { AttendanceStatus, AuditAction, EnrollmentStatus } from '@prisma/client';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';
import { auditLog } from '$lib/server/audit';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import {
	getPreceptorScope,
	requirePreceptorCommissionAccess
} from '$lib/server/preceptor/preceptor-scope-service';

const NO_COMMISSION = '__NO_COMMISSION__';

interface AttendanceDraft {
	studentId: string;
	present: boolean;
	notes?: string;
}

function parseAttendanceData(raw: string): AttendanceDraft[] | null {
	try {
		const parsed: unknown = JSON.parse(raw);

		if (!Array.isArray(parsed)) {
			return null;
		}

		const attendance: AttendanceDraft[] = [];

		for (const item of parsed) {
			if (
				typeof item !== 'object' ||
				item === null ||
				!('studentId' in item) ||
				!('present' in item)
			) {
				return null;
			}

			const studentId = Reflect.get(item, 'studentId');
			const present = Reflect.get(item, 'present');
			const notes = Reflect.get(item, 'notes');

			if (typeof studentId !== 'string' || !studentId.trim() || typeof present !== 'boolean') {
				return null;
			}

			if (notes !== undefined && typeof notes !== 'string') {
				return null;
			}

			attendance.push({
				studentId: studentId.trim(),
				present,
				notes: typeof notes === 'string' ? notes.trim() : undefined
			});
		}

		return attendance;
	} catch {
		return null;
	}
}

function sameStudentSet(submittedIds: string[], eligibleIds: string[]): boolean {
	if (submittedIds.length !== eligibleIds.length) {
		return false;
	}

	const submitted = new Set(submittedIds);

	if (submitted.size !== submittedIds.length) {
		return false;
	}

	return eligibleIds.every((id) => submitted.has(id));
}

function parseClassDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}

	const parsed = new Date(`${value}T00:00:00.000Z`);

	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	if (parsed.toISOString().slice(0, 10) !== value) {
		return null;
	}

	return parsed;
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, ['PRECEPTOR']);

	await Promise.all([
		requirePermission(currentUser, 'ATTENDANCE', 'read'),
		requirePermission(currentUser, 'SUBJECT_ENROLLMENT', 'read'),
		requirePermission(currentUser, 'SUBJECT_COMMISSION', 'read')
	]);

	const scope = await getPreceptorScope(currentUser.id);

	const [enrollments, commissions, recentAttendance] = await Promise.all([
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

		prisma.attendanceRecord.findMany({
			where: {
				OR: [
					{
						commission: {
							is: {
								locationId: {
									in: scope.locationIds
								}
							}
						}
					},
					{
						commissionId: null,
						entries: {
							some: {
								student: {
									locationId: {
										in: scope.locationIds
									}
								}
							}
						}
					}
				]
			},
			select: {
				id: true,
				classDate: true,
				subject: {
					select: {
						name: true
					}
				},
				commission: {
					select: {
						code: true
					}
				},
				entries: {
					where: {
						student: {
							locationId: {
								in: scope.locationIds
							}
						}
					},
					select: {
						present: true,
						status: true
					}
				}
			},
			orderBy: {
				classDate: 'desc'
			},
			take: 10
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
				currentYear: enrollment.student.currentYear
			}
		})),

		recentAttendance: recentAttendance.map((record) => {
			const presentStudents = record.entries.filter(
				(entry) =>
					entry.status === AttendanceStatus.PRESENT || (entry.status === null && entry.present)
			).length;

			return {
				id: record.id,
				date: record.classDate,
				subject: record.subject.name,
				commissionCode: record.commission?.code ?? null,
				totalStudents: record.entries.length,
				presentStudents
			};
		})
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, {
				error: 'No autorizado'
			});
		}

		requireRole(currentUser, ['PRECEPTOR']);

		await requirePermission(currentUser, 'ATTENDANCE', 'create');

		const data = await request.formData();

		const subjectId = data.get('subjectId')?.toString().trim() ?? '';

		const date = data.get('date')?.toString().trim() ?? '';

		const commissionToken = data.get('commissionId')?.toString().trim() ?? '';

		const attendanceRaw = data.get('attendanceData')?.toString() ?? '';

		if (!subjectId || !date || !attendanceRaw) {
			return fail(400, {
				error: 'Por favor completá todos los campos requeridos'
			});
		}

		const classDate = parseClassDate(date);

		if (!classDate) {
			return fail(400, {
				error: 'La fecha seleccionada no es válida'
			});
		}

		const attendance = parseAttendanceData(attendanceRaw);

		if (!attendance || attendance.length === 0) {
			return fail(400, {
				error: 'La lista de asistencia no es válida'
			});
		}

		const submittedStudentIds = attendance.map((entry) => entry.studentId);

		if (new Set(submittedStudentIds).size !== submittedStudentIds.length) {
			return fail(400, {
				error: 'La lista de asistencia contiene alumnos repetidos'
			});
		}

		const scope = await getPreceptorScope(currentUser.id);

		const commissionId =
			commissionToken && commissionToken !== NO_COMMISSION ? commissionToken : null;

		let commissionLocationId: string | null = null;

		if (commissionId) {
			const commission = await requirePreceptorCommissionAccess(currentUser.id, commissionId);

			if (!commission.active) {
				return fail(400, {
					error: 'La comisión seleccionada ya no se encuentra activa'
				});
			}

			if (commission.subjectId !== subjectId) {
				return fail(400, {
					error: 'La comisión no corresponde a la materia seleccionada'
				});
			}

			if (!commission.locationId) {
				return fail(400, {
					error: 'La comisión no tiene una sede válida asignada'
				});
			}

			commissionLocationId = commission.locationId;
		}

		const subject = await prisma.subject.findFirst({
			where: {
				id: subjectId,
				active: true
			},
			select: {
				id: true,
				name: true
			}
		});

		if (!subject) {
			return fail(404, {
				error: 'La materia seleccionada no existe o está inactiva'
			});
		}

		const eligibleEnrollments = await prisma.subjectEnrollment.findMany({
			where: {
				subjectId,
				commissionId,
				status: EnrollmentStatus.ACTIVE,
				student: {
					is: {
						status: 'ACTIVE',
						locationId: commissionLocationId
							? commissionLocationId
							: {
									in: scope.locationIds
								}
					}
				}
			},
			select: {
				studentId: true
			}
		});

		const eligibleStudentIds = eligibleEnrollments.map((enrollment) => enrollment.studentId);

		if (eligibleStudentIds.length === 0) {
			return fail(400, {
				error: 'No hay alumnos activos inscriptos para registrar asistencia'
			});
		}

		if (!sameStudentSet(submittedStudentIds, eligibleStudentIds)) {
			return fail(409, {
				error:
					'La nómina de alumnos cambió o contiene alumnos fuera de tu alcance. Recargá la página e intentá nuevamente.'
			});
		}

		let attendanceRecordId: string;

		try {
			attendanceRecordId = await prisma.$transaction(async (tx) => {
				/*
				 * Revalidación dentro de la transacción.
				 * No confiamos solamente en las verificaciones
				 * realizadas antes de comenzar la escritura.
				 */
				if (commissionId) {
					const validCommission = await tx.subjectCommission.findFirst({
						where: {
							id: commissionId,
							subjectId,
							active: true,
							locationId: {
								in: scope.locationIds
							}
						},
						select: {
							id: true,
							locationId: true
						}
					});

					if (!validCommission) {
						throw new Error('COMMISSION_SCOPE_CHANGED');
					}
				}

				const transactionalEnrollments = await tx.subjectEnrollment.findMany({
					where: {
						subjectId,
						commissionId,
						status: EnrollmentStatus.ACTIVE,
						student: {
							is: {
								status: 'ACTIVE',
								locationId: commissionLocationId
									? commissionLocationId
									: {
											in: scope.locationIds
										}
							}
						}
					},
					select: {
						studentId: true
					}
				});

				const transactionalStudentIds = transactionalEnrollments.map(
					(enrollment) => enrollment.studentId
				);

				if (!sameStudentSet(submittedStudentIds, transactionalStudentIds)) {
					throw new Error('ENROLLMENT_SET_CHANGED');
				}

				const existingRecord = await tx.attendanceRecord.findFirst({
					where: {
						subjectId,
						classDate,
						commissionId
					},
					select: {
						id: true
					}
				});

				if (existingRecord) {
					throw new Error('ATTENDANCE_ALREADY_EXISTS');
				}

				const attendanceRecord = await tx.attendanceRecord.create({
					data: {
						subjectId,
						classDate,
						commissionId,
						createdByUserId: currentUser.id
					},
					select: {
						id: true
					}
				});

				await tx.attendanceEntry.createMany({
					data: attendance.map((entry) => ({
						attendanceId: attendanceRecord.id,
						studentId: entry.studentId,
						present: entry.present,
						status: entry.present ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
						notes: entry.notes?.trim() || null
					}))
				});

				return attendanceRecord.id;
			});
		} catch (caught) {
			if (caught instanceof Error && caught.message === 'ATTENDANCE_ALREADY_EXISTS') {
				return fail(409, {
					error: 'Ya existe un registro de asistencia para esta materia, fecha y comisión'
				});
			}

			if (
				caught instanceof Error &&
				['COMMISSION_SCOPE_CHANGED', 'ENROLLMENT_SET_CHANGED'].includes(caught.message)
			) {
				return fail(409, {
					error:
						'Los datos académicos cambiaron mientras registrabas la asistencia. Recargá la página e intentá nuevamente.'
				});
			}

			console.error('Error al registrar asistencia:', caught);

			return fail(500, {
				error: 'Error al registrar la asistencia'
			});
		}

		const regularityUpdates: Array<{
			studentId: string;
			previousStatus?: 'REGULAR' | 'LIBRE';
			newStatus: 'REGULAR' | 'LIBRE';
			attendancePercent: number;
		}> = [];

		let regularityRecalculationFailed = false;

		for (const entry of attendance) {
			try {
				const statusUpdate = await updateAttendanceStatus(entry.studentId, subjectId);

				if (statusUpdate.statusChanged) {
					regularityUpdates.push({
						studentId: entry.studentId,
						previousStatus: statusUpdate.previousStatus,
						newStatus: statusUpdate.regularityStatus,
						attendancePercent: statusUpdate.attendancePercent
					});
				}
			} catch (caught) {
				regularityRecalculationFailed = true;

				console.error('Error al recalcular regularidad por asistencia:', {
					studentId: entry.studentId,
					subjectId,
					error: caught
				});
			}
		}

		let auditFailed = false;

		try {
			await auditLog({
				userId: currentUser.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE',
				entityId: attendanceRecordId,
				description:
					`Registro de asistencia para ${subject.name} ` +
					`el ${date} - ${attendance.length} estudiantes`,
				metadata: {
					subjectId,
					commissionId,
					studentCount: attendance.length
				}
			});

			for (const update of regularityUpdates) {
				await auditLog({
					userId: currentUser.id,
					action: AuditAction.UPDATE,
					entityType: 'STUDENT_SUBJECT_STATUS',
					entityId: `${update.studentId}_${subjectId}`,
					description:
						`Cambio de regularidad por asistencia: ` +
						`${update.previousStatus ?? 'SIN_ESTADO'} → ` +
						`${update.newStatus} ` +
						`(${update.attendancePercent}%) en ${subject.name}`
				});
			}
		} catch (caught) {
			auditFailed = true;

			console.error('Error al auditar registro de asistencia:', caught);
		}

		const hasWarning = regularityRecalculationFailed || auditFailed;

		return {
			success: 'Asistencia registrada exitosamente',
			warning: hasWarning
				? 'La asistencia quedó registrada, pero una tarea secundaria no pudo completarse. Revisá los logs del servidor.'
				: undefined
		};
	}
};
