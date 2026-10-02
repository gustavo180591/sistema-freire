import { AttendanceStatus, AuditAction, EnrollmentStatus, Prisma } from '@prisma/client';

import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';
import { auditLog } from '$lib/server/audit';
import { prisma } from '$lib/server/db/prisma';
import { getPreceptorScope } from '$lib/server/preceptor/preceptor-scope-service';

const MAX_NOTES_LENGTH = 500;

type PreceptorAttendanceErrorCode =
	| 'INVALID_DATE'
	| 'INVALID_ATTENDANCE_DATA'
	| 'INVALID_NOTES'
	| 'SUBJECT_NOT_AVAILABLE'
	| 'COMMISSION_NOT_AVAILABLE'
	| 'LOCATION_REQUIRED'
	| 'LOCATION_NOT_AVAILABLE'
	| 'NO_ELIGIBLE_STUDENTS'
	| 'STUDENT_SET_CHANGED'
	| 'ATTENDANCE_ALREADY_EXISTS';

export class PreceptorAttendanceError extends Error {
	readonly status: number;
	readonly code: PreceptorAttendanceErrorCode;

	constructor(status: number, code: PreceptorAttendanceErrorCode, message: string) {
		super(message);

		this.name = 'PreceptorAttendanceError';
		this.status = status;
		this.code = code;
	}
}

export interface PreceptorAttendanceDraft {
	studentId: string;
	present: boolean;
	notes?: string;
}

export interface CreatePreceptorAttendanceInput {
	subjectId: string;
	commissionId: string | null;
	locationId: string | null;
	classDate: string;
	attendanceRaw: string;
}

export interface CreatePreceptorAttendanceResult {
	attendanceRecordId: string;
	warning?: string;
}

function parseClassDate(value: string): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new PreceptorAttendanceError(400, 'INVALID_DATE', 'La fecha seleccionada no es válida');
	}

	const parsed = new Date(`${value}T00:00:00.000Z`);

	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
		throw new PreceptorAttendanceError(400, 'INVALID_DATE', 'La fecha seleccionada no es válida');
	}

	return parsed;
}

function parseAttendanceData(raw: string): PreceptorAttendanceDraft[] {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new PreceptorAttendanceError(
			400,
			'INVALID_ATTENDANCE_DATA',
			'La lista de asistencia no es válida'
		);
	}

	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new PreceptorAttendanceError(
			400,
			'INVALID_ATTENDANCE_DATA',
			'La lista de asistencia no es válida'
		);
	}

	const attendance: PreceptorAttendanceDraft[] = [];

	for (const item of parsed) {
		if (
			typeof item !== 'object' ||
			item === null ||
			!('studentId' in item) ||
			!('present' in item)
		) {
			throw new PreceptorAttendanceError(
				400,
				'INVALID_ATTENDANCE_DATA',
				'La lista de asistencia no es válida'
			);
		}

		const studentId = Reflect.get(item, 'studentId');
		const present = Reflect.get(item, 'present');
		const rawNotes = Reflect.get(item, 'notes');

		if (typeof studentId !== 'string' || !studentId.trim() || typeof present !== 'boolean') {
			throw new PreceptorAttendanceError(
				400,
				'INVALID_ATTENDANCE_DATA',
				'La lista de asistencia no es válida'
			);
		}

		if (rawNotes !== undefined && typeof rawNotes !== 'string') {
			throw new PreceptorAttendanceError(
				400,
				'INVALID_ATTENDANCE_DATA',
				'La lista de asistencia no es válida'
			);
		}

		const notes = typeof rawNotes === 'string' ? rawNotes.trim() : '';

		if (notes.length > MAX_NOTES_LENGTH) {
			throw new PreceptorAttendanceError(
				400,
				'INVALID_NOTES',
				`Las observaciones no pueden superar los ${MAX_NOTES_LENGTH} caracteres`
			);
		}

		attendance.push({
			studentId: studentId.trim(),
			present,
			notes: notes || undefined
		});
	}

	const ids = attendance.map((entry) => entry.studentId);

	if (new Set(ids).size !== ids.length) {
		throw new PreceptorAttendanceError(
			400,
			'INVALID_ATTENDANCE_DATA',
			'La lista de asistencia contiene alumnos repetidos'
		);
	}

	return attendance;
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

function buildDeduplicationKey(input: {
	subjectId: string;
	commissionId: string | null;
	locationId: string;
	classDate: string;
}): string {
	if (input.commissionId) {
		return `COMMISSION:${input.subjectId}:${input.commissionId}:${input.classDate}`;
	}

	return `LOCATION:${input.subjectId}:${input.locationId}:${input.classDate}`;
}

export async function createPreceptorAttendance(
	userId: string,
	input: CreatePreceptorAttendanceInput
): Promise<CreatePreceptorAttendanceResult> {
	const classDate = parseClassDate(input.classDate);
	const attendance = parseAttendanceData(input.attendanceRaw);

	const scope = await getPreceptorScope(userId);

	const subject = await prisma.subject.findFirst({
		where: {
			id: input.subjectId,
			active: true
		},
		select: {
			id: true,
			name: true
		}
	});

	if (!subject) {
		throw new PreceptorAttendanceError(
			404,
			'SUBJECT_NOT_AVAILABLE',
			'La materia seleccionada no existe o está inactiva'
		);
	}

	let resolvedLocationId: string;

	if (input.commissionId) {
		const commission = await prisma.subjectCommission.findFirst({
			where: {
				id: input.commissionId,
				subjectId: input.subjectId,
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

		if (!commission?.locationId) {
			throw new PreceptorAttendanceError(
				403,
				'COMMISSION_NOT_AVAILABLE',
				'La comisión seleccionada no está disponible dentro de tu ámbito'
			);
		}

		resolvedLocationId = commission.locationId;
	} else {
		if (!input.locationId) {
			throw new PreceptorAttendanceError(
				400,
				'LOCATION_REQUIRED',
				'Seleccioná la sede correspondiente a la asistencia'
			);
		}

		if (!scope.locationIds.includes(input.locationId)) {
			throw new PreceptorAttendanceError(
				403,
				'LOCATION_NOT_AVAILABLE',
				'No tenés acceso a la sede seleccionada'
			);
		}

		const location = await prisma.location.findFirst({
			where: {
				id: input.locationId,
				active: true
			},
			select: {
				id: true
			}
		});

		if (!location) {
			throw new PreceptorAttendanceError(
				400,
				'LOCATION_NOT_AVAILABLE',
				'La sede seleccionada ya no se encuentra activa'
			);
		}

		resolvedLocationId = location.id;
	}

	const eligibleEnrollments = await prisma.subjectEnrollment.findMany({
		where: {
			subjectId: input.subjectId,
			commissionId: input.commissionId,
			status: EnrollmentStatus.ACTIVE,
			student: {
				is: {
					status: 'ACTIVE',
					locationId: resolvedLocationId
				}
			}
		},
		select: {
			studentId: true
		}
	});

	const eligibleStudentIds = eligibleEnrollments.map((enrollment) => enrollment.studentId);

	if (eligibleStudentIds.length === 0) {
		throw new PreceptorAttendanceError(
			400,
			'NO_ELIGIBLE_STUDENTS',
			'No hay alumnos activos inscriptos para registrar asistencia'
		);
	}

	const submittedStudentIds = attendance.map((entry) => entry.studentId);

	if (!sameStudentSet(submittedStudentIds, eligibleStudentIds)) {
		throw new PreceptorAttendanceError(
			409,
			'STUDENT_SET_CHANGED',
			'La nómina de alumnos cambió o contiene alumnos fuera de tu alcance. Recargá la página e intentá nuevamente.'
		);
	}

	const deduplicationKey = buildDeduplicationKey({
		subjectId: input.subjectId,
		commissionId: input.commissionId,
		locationId: resolvedLocationId,
		classDate: input.classDate
	});

	let attendanceRecordId: string;

	try {
		attendanceRecordId = await prisma.$transaction(async (tx) => {
			if (input.commissionId) {
				const commission = await tx.subjectCommission.findFirst({
					where: {
						id: input.commissionId,
						subjectId: input.subjectId,
						active: true,
						locationId: resolvedLocationId
					},
					select: {
						id: true
					}
				});

				if (!commission) {
					throw new PreceptorAttendanceError(
						409,
						'COMMISSION_NOT_AVAILABLE',
						'La comisión cambió mientras registrabas la asistencia. Recargá la página.'
					);
				}
			} else {
				const location = await tx.location.findFirst({
					where: {
						id: resolvedLocationId,
						active: true
					},
					select: {
						id: true
					}
				});

				if (!location) {
					throw new PreceptorAttendanceError(
						409,
						'LOCATION_NOT_AVAILABLE',
						'La sede cambió mientras registrabas la asistencia. Recargá la página.'
					);
				}
			}

			const transactionalEnrollments = await tx.subjectEnrollment.findMany({
				where: {
					subjectId: input.subjectId,
					commissionId: input.commissionId,
					status: EnrollmentStatus.ACTIVE,
					student: {
						is: {
							status: 'ACTIVE',
							locationId: resolvedLocationId
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
				throw new PreceptorAttendanceError(
					409,
					'STUDENT_SET_CHANGED',
					'Los datos académicos cambiaron mientras registrabas la asistencia. Recargá la página e intentá nuevamente.'
				);
			}

			const existingRecord = await tx.attendanceRecord.findUnique({
				where: {
					deduplicationKey
				},
				select: {
					id: true
				}
			});

			if (existingRecord) {
				throw new PreceptorAttendanceError(
					409,
					'ATTENDANCE_ALREADY_EXISTS',
					'Ya existe un registro de asistencia para esta materia, fecha y ámbito'
				);
			}

			const attendanceRecord = await tx.attendanceRecord.create({
				data: {
					subjectId: input.subjectId,
					classDate,
					commissionId: input.commissionId,
					locationId: resolvedLocationId,
					deduplicationKey,
					createdByUserId: userId
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
					notes: entry.notes ?? null
				}))
			});

			return attendanceRecord.id;
		});
	} catch (caught) {
		if (caught instanceof PreceptorAttendanceError) {
			throw caught;
		}

		if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === 'P2002') {
			throw new PreceptorAttendanceError(
				409,
				'ATTENDANCE_ALREADY_EXISTS',
				'Ya existe un registro de asistencia para esta materia, fecha y ámbito'
			);
		}

		throw caught;
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
			const statusUpdate = await updateAttendanceStatus(entry.studentId, input.subjectId);

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
				subjectId: input.subjectId,
				error: caught
			});
		}
	}

	let auditFailed = false;

	try {
		await auditLog({
			userId,
			action: AuditAction.CREATE,
			entityType: 'ATTENDANCE',
			entityId: attendanceRecordId,
			description:
				`Registro de asistencia para ${subject.name} ` +
				`el ${input.classDate} - ${attendance.length} estudiantes`,
			metadata: {
				subjectId: input.subjectId,
				commissionId: input.commissionId,
				locationId: resolvedLocationId,
				studentCount: attendance.length,
				deduplicationKey
			}
		});

		for (const update of regularityUpdates) {
			await auditLog({
				userId,
				action: AuditAction.UPDATE,
				entityType: 'STUDENT_SUBJECT_STATUS',
				entityId: `${update.studentId}_${input.subjectId}`,
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

	const warnings: string[] = [];

	if (regularityRecalculationFailed) {
		warnings.push('No se pudo recalcular la regularidad de uno o más estudiantes.');
	}

	if (auditFailed) {
		warnings.push('No se pudo completar la auditoría del registro.');
	}

	return {
		attendanceRecordId,
		warning: warnings.length > 0 ? warnings.join(' ') : undefined
	};
}
