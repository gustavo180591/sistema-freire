import {
	AttendanceEventType,
	AttendanceStatus,
	AuditAction,
	EnrollmentStatus,
	Prisma
} from '@prisma/client';

import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';
import { auditLog } from '$lib/server/audit';
import { prisma } from '$lib/server/db/prisma';
import { getPreceptorScope } from '$lib/server/preceptor/preceptor-scope-service';

const EVENT_TIME_PATTERN = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
const MAX_NOTES_LENGTH = 500;

type AttendanceEventErrorCode =
	| 'INVALID_DATE'
	| 'INVALID_TIME'
	| 'INVALID_TYPE'
	| 'INVALID_NOTES'
	| 'ENROLLMENT_NOT_AVAILABLE'
	| 'INVALID_LOCATION'
	| 'DUPLICATE_EVENT';

export class PreceptorAttendanceEventError extends Error {
	readonly status: number;
	readonly code: AttendanceEventErrorCode;

	constructor(status: number, code: AttendanceEventErrorCode, message: string) {
		super(message);

		this.name = 'PreceptorAttendanceEventError';
		this.status = status;
		this.code = code;
	}
}

export interface CreatePreceptorAttendanceEventInput {
	subjectEnrollmentId: string;
	type: string;
	eventDate: string;
	eventTime: string;
	notes?: string;
}

export interface CreatePreceptorAttendanceEventResult {
	eventId: string;
	attendanceLinked: boolean;
	attendanceUpdated: boolean;
	warning?: string;
}

function parseEventDate(value: string): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new PreceptorAttendanceEventError(
			400,
			'INVALID_DATE',
			'La fecha seleccionada no es válida'
		);
	}

	const date = new Date(`${value}T00:00:00.000Z`);

	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		throw new PreceptorAttendanceEventError(
			400,
			'INVALID_DATE',
			'La fecha seleccionada no es válida'
		);
	}

	return date;
}

function parseEventTime(value: string): string {
	if (!EVENT_TIME_PATTERN.test(value)) {
		throw new PreceptorAttendanceEventError(
			400,
			'INVALID_TIME',
			'La hora debe tener un formato válido HH:mm'
		);
	}

	return value;
}

function parseEventType(value: string): AttendanceEventType {
	switch (value) {
		case AttendanceEventType.LATE_ARRIVAL:
			return AttendanceEventType.LATE_ARRIVAL;

		case AttendanceEventType.EARLY_DEPARTURE:
			return AttendanceEventType.EARLY_DEPARTURE;

		default:
			throw new PreceptorAttendanceEventError(
				400,
				'INVALID_TYPE',
				'El tipo de evento seleccionado no es válido'
			);
	}
}

function normalizeNotes(value?: string): string | null {
	const notes = value?.trim() ?? '';

	if (notes.length > MAX_NOTES_LENGTH) {
		throw new PreceptorAttendanceEventError(
			400,
			'INVALID_NOTES',
			`Las observaciones no pueden superar los ${MAX_NOTES_LENGTH} caracteres`
		);
	}

	return notes || null;
}

export async function getPreceptorAttendanceEventPageData(userId: string) {
	const scope = await getPreceptorScope(userId);

	const [enrollments, recentEvents] = await Promise.all([
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
						career: {
							select: {
								name: true
							}
						},
						location: {
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
				},
				commission: {
					select: {
						id: true,
						code: true,
						locationId: true,
						location: {
							select: {
								name: true
							}
						}
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

		prisma.studentAttendanceEvent.findMany({
			where: {
				locationId: {
					in: scope.locationIds
				}
			},
			select: {
				id: true,
				type: true,
				eventDate: true,
				eventTime: true,
				notes: true,
				attendanceEntryId: true,
				createdAt: true,
				location: {
					select: {
						name: true
					}
				},
				createdByUser: {
					select: {
						firstName: true,
						lastName: true
					}
				},
				subjectEnrollment: {
					select: {
						student: {
							select: {
								id: true,
								dni: true,
								firstName: true,
								lastName: true
							}
						},
						subject: {
							select: {
								id: true,
								code: true,
								name: true
							}
						},
						commission: {
							select: {
								code: true
							}
						}
					}
				}
			},
			orderBy: [{ eventDate: 'desc' }, { eventTime: 'desc' }, { createdAt: 'desc' }],
			take: 30
		})
	]);

	return {
		enrollments: enrollments.map((enrollment) => ({
			id: enrollment.id,
			studentId: enrollment.studentId,
			subjectId: enrollment.subjectId,
			commissionId: enrollment.commissionId,

			student: {
				id: enrollment.student.id,
				dni: enrollment.student.dni,
				firstName: enrollment.student.firstName,
				lastName: enrollment.student.lastName,
				career: enrollment.student.career.name,
				currentYear: enrollment.student.currentYear
			},

			subject: {
				id: enrollment.subject.id,
				code: enrollment.subject.code,
				name: enrollment.subject.name,
				yearLevel: enrollment.subject.yearLevel
			},

			commissionCode: enrollment.commission?.code ?? null,

			locationName:
				enrollment.commission?.location?.name ??
				enrollment.student.location?.name ??
				'Sin sede asignada'
		})),

		recentEvents: recentEvents.map((event) => ({
			id: event.id,
			type: event.type,
			date: event.eventDate,
			time: event.eventTime,
			notes: event.notes,
			attendanceLinked: event.attendanceEntryId !== null,
			locationName: event.location.name,

			student: {
				id: event.subjectEnrollment.student.id,
				dni: event.subjectEnrollment.student.dni,
				firstName: event.subjectEnrollment.student.firstName,
				lastName: event.subjectEnrollment.student.lastName
			},

			subject: {
				id: event.subjectEnrollment.subject.id,
				code: event.subjectEnrollment.subject.code,
				name: event.subjectEnrollment.subject.name
			},

			commissionCode: event.subjectEnrollment.commission?.code ?? null,

			createdByName: `${event.createdByUser.lastName}, ${event.createdByUser.firstName}`
		}))
	};
}

export async function createPreceptorAttendanceEvent(
	userId: string,
	input: CreatePreceptorAttendanceEventInput
): Promise<CreatePreceptorAttendanceEventResult> {
	const eventDate = parseEventDate(input.eventDate);
	const eventTime = parseEventTime(input.eventTime);
	const eventType = parseEventType(input.type);
	const notes = normalizeNotes(input.notes);

	const scope = await getPreceptorScope(userId);

	let transactionResult: {
		eventId: string;
		studentId: string;
		studentName: string;
		subjectId: string;
		subjectName: string;
		locationId: string;
		attendanceEntryId: string | null;
		attendanceMatchCount: number;
		attendanceUpdated: boolean;
	};

	try {
		transactionResult = await prisma.$transaction(async (tx) => {
			const enrollment = await tx.subjectEnrollment.findFirst({
				where: {
					id: input.subjectEnrollmentId,
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
							firstName: true,
							lastName: true,
							locationId: true
						}
					},

					subject: {
						select: {
							name: true
						}
					},

					commission: {
						select: {
							locationId: true
						}
					}
				}
			});

			if (!enrollment) {
				throw new PreceptorAttendanceEventError(
					403,
					'ENROLLMENT_NOT_AVAILABLE',
					'La inscripción seleccionada no está disponible dentro de tu ámbito'
				);
			}

			const locationId = enrollment.commission?.locationId ?? enrollment.student.locationId;

			if (!locationId || !scope.locationIds.includes(locationId)) {
				throw new PreceptorAttendanceEventError(
					403,
					'INVALID_LOCATION',
					'No tenés acceso a la sede asociada al evento'
				);
			}

			const attendanceEntries = await tx.attendanceEntry.findMany({
				where: {
					studentId: enrollment.studentId,
					attendance: {
						subjectId: enrollment.subjectId,
						commissionId: enrollment.commissionId,
						classDate: eventDate
					}
				},
				select: {
					id: true,
					present: true,
					status: true
				},
				take: 2
			});

			const attendanceEntry = attendanceEntries.length === 1 ? attendanceEntries[0] : null;

			let attendanceUpdated = false;

			if (
				eventType === AttendanceEventType.LATE_ARRIVAL &&
				attendanceEntry &&
				(attendanceEntry.status !== AttendanceStatus.LATE || !attendanceEntry.present)
			) {
				await tx.attendanceEntry.update({
					where: {
						id: attendanceEntry.id
					},
					data: {
						present: true,
						status: AttendanceStatus.LATE
					}
				});

				attendanceUpdated = true;
			}

			const event = await tx.studentAttendanceEvent.create({
				data: {
					subjectEnrollmentId: enrollment.id,
					locationId,
					attendanceEntryId: attendanceEntry?.id ?? null,
					type: eventType,
					eventDate,
					eventTime,
					notes,
					createdByUserId: userId
				},
				select: {
					id: true
				}
			});

			return {
				eventId: event.id,
				studentId: enrollment.studentId,
				studentName: `${enrollment.student.lastName}, ${enrollment.student.firstName}`,
				subjectId: enrollment.subjectId,
				subjectName: enrollment.subject.name,
				locationId,
				attendanceEntryId: attendanceEntry?.id ?? null,
				attendanceMatchCount: attendanceEntries.length,
				attendanceUpdated
			};
		});
	} catch (caught) {
		if (caught instanceof PreceptorAttendanceEventError) {
			throw caught;
		}

		if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === 'P2002') {
			throw new PreceptorAttendanceEventError(
				409,
				'DUPLICATE_EVENT',
				'Ya existe un evento del mismo tipo para esa inscripción, fecha y hora'
			);
		}

		throw caught;
	}

	const warnings: string[] = [];

	if (eventType === AttendanceEventType.LATE_ARRIVAL) {
		if (transactionResult.attendanceMatchCount === 0) {
			warnings.push(
				'El evento quedó registrado, pero todavía no existía una asistencia académica para vincular.'
			);
		}

		if (transactionResult.attendanceMatchCount > 1) {
			warnings.push(
				'El evento quedó registrado, pero existen múltiples asistencias coincidentes y no se modificó ninguna.'
			);
		}
	}

	let regularityUpdate: Awaited<ReturnType<typeof updateAttendanceStatus>> | null = null;

	if (transactionResult.attendanceUpdated) {
		try {
			regularityUpdate = await updateAttendanceStatus(
				transactionResult.studentId,
				transactionResult.subjectId
			);
		} catch (caught) {
			console.error('Error al recalcular regularidad después de llegada tarde:', {
				eventId: transactionResult.eventId,
				studentId: transactionResult.studentId,
				subjectId: transactionResult.subjectId,
				error: caught
			});

			warnings.push(
				'La llegada tarde quedó registrada, pero no se pudo recalcular la regularidad.'
			);
		}
	}

	try {
		await auditLog({
			userId,
			action: AuditAction.CREATE,
			entityType: 'STUDENT_ATTENDANCE_EVENT',
			entityId: transactionResult.eventId,
			description:
				`${eventType === AttendanceEventType.LATE_ARRIVAL ? 'Llegada tarde' : 'Retiro anticipado'} ` +
				`de ${transactionResult.studentName} en ${transactionResult.subjectName}, ` +
				`${input.eventDate} ${eventTime}`,
			metadata: {
				subjectEnrollmentId: input.subjectEnrollmentId,
				subjectId: transactionResult.subjectId,
				locationId: transactionResult.locationId,
				type: eventType,
				eventDate: input.eventDate,
				eventTime,
				attendanceEntryId: transactionResult.attendanceEntryId
			}
		});

		if (transactionResult.attendanceUpdated && transactionResult.attendanceEntryId) {
			await auditLog({
				userId,
				action: AuditAction.UPDATE,
				entityType: 'ATTENDANCE_ENTRY',
				entityId: transactionResult.attendanceEntryId,
				description:
					`Asistencia actualizada a LATE por llegada tarde de ` +
					`${transactionResult.studentName} en ${transactionResult.subjectName}`
			});
		}

		if (regularityUpdate?.statusChanged) {
			await auditLog({
				userId,
				action: AuditAction.UPDATE,
				entityType: 'STUDENT_SUBJECT_STATUS',
				entityId: `${transactionResult.studentId}_${transactionResult.subjectId}`,
				description:
					`Cambio de regularidad por llegada tarde: ` +
					`${regularityUpdate.previousStatus ?? 'SIN_ESTADO'} → ` +
					`${regularityUpdate.regularityStatus} ` +
					`(${regularityUpdate.attendancePercent}%)`
			});
		}
	} catch (caught) {
		console.error('Error al auditar evento de preceptoría:', {
			eventId: transactionResult.eventId,
			error: caught
		});

		warnings.push('El evento se guardó correctamente, pero no se pudo completar la auditoría.');
	}

	return {
		eventId: transactionResult.eventId,
		attendanceLinked: transactionResult.attendanceEntryId !== null,
		attendanceUpdated: transactionResult.attendanceUpdated,
		warning: warnings.length > 0 ? warnings.join(' ') : undefined
	};
}
