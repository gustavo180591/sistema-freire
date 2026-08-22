import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { AuditAction } from '@prisma/client';

import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds, requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';

const VALID_STATUSES = new Set<AttendanceStatus>(['PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED']);

function legacyPresent(status: AttendanceStatus): boolean {
	return status === 'PRESENT' || status === 'LATE';
}

function normalizeStatus(entry: { status: string | null; present: boolean }): AttendanceStatus {
	if (
		entry.status === 'PRESENT' ||
		entry.status === 'ABSENT' ||
		entry.status === 'LATE' ||
		entry.status === 'JUSTIFIED'
	) {
		return entry.status;
	}

	return entry.present ? 'PRESENT' : 'ABSENT';
}

function parseClassDate(value: string): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error('Fecha inválida');
	}

	const date = new Date(`${value}T12:00:00.000Z`);

	if (Number.isNaN(date.getTime())) {
		throw new Error('Fecha inválida');
	}

	return date;
}

function getWeekDay(value: string) {
	const date = parseClassDate(value);

	const days = [
		'SUNDAY',
		'MONDAY',
		'TUESDAY',
		'WEDNESDAY',
		'THURSDAY',
		'FRIDAY',
		'SATURDAY'
	] as const;

	return days[date.getUTCDay()];
}

function todayInArgentina(): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Argentina/Buenos_Aires',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());

	const year = parts.find((part) => part.type === 'year')?.value;
	const month = parts.find((part) => part.type === 'month')?.value;
	const day = parts.find((part) => part.type === 'day')?.value;

	return `${year}-${month}-${day}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const teacher = await prisma.teacher.findUnique({
		where: {
			userId: locals.user.id
		},
		select: {
			id: true,
			firstName: true,
			lastName: true
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener TODAS las materias asignadas al docente mediante SubjectTeacher.
	// Esto permite mostrarlas aunque todavía no tengan horario cargado.
	const subjectAssignments = await prisma.subjectTeacher.findMany({
		where: {
			teacherId: teacher.id
		},
		include: {
			subject: true
		},
		orderBy: {
			subject: {
				name: 'asc'
			}
		}
	});

	const schedules = await prisma.classSchedule.findMany({
		where: {
			teacherId: teacher.id,
			active: true,
			commissionId: {
				not: null
			},
			OR: [
				{
					locationId: null
				},
				{
					locationId: {
						in: allowedLocationIds
					}
				}
			]
		},
		include: {
			subject: true,
			commission: {
				include: {
					career: true,
					location: true,
					academicTerm: true
				}
			},
			career: true,
			location: true
		},
		orderBy: [
			{
				subject: {
					name: 'asc'
				}
			},
			{
				dayOfWeek: 'asc'
			},
			{
				startTime: 'asc'
			}
		]
	});

	const commissionIds = [
		...new Set(
			schedules.map((schedule) => schedule.commissionId).filter((id): id is string => Boolean(id))
		)
	];

	const enrollments = commissionIds.length
		? await prisma.subjectEnrollment.findMany({
				where: {
					commissionId: {
						in: commissionIds
					},
					status: 'ACTIVE',
					student: {
						status: 'ACTIVE'
					}
				},
				include: {
					student: {
						include: {
							career: true
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
			})
		: [];

	const studentsByCommission: Record<string, any[]> = {};

	for (const enrollment of enrollments) {
		if (!enrollment.commissionId) continue;

		studentsByCommission[enrollment.commissionId] ??= [];

		studentsByCommission[enrollment.commissionId].push({
			id: enrollment.student.id,
			enrollmentId: enrollment.id,
			dni: enrollment.student.dni,
			firstName: enrollment.student.firstName,
			lastName: enrollment.student.lastName,
			career: enrollment.student.career.name,
			currentYear: enrollment.student.currentYear
		});
	}

	const commissionsMap = new Map<
		string,
		{
			id: string;
			code: string;
			subjectId: string;
			career: string | null;
			location: string | null;
			academicTerm: string | null;
		}
	>();

	for (const schedule of schedules) {
		if (schedule.commission) {
			commissionsMap.set(schedule.commission.id, {
				id: schedule.commission.id,
				code: schedule.commission.code,
				subjectId: schedule.subjectId,
				career: schedule.commission.career?.name ?? null,
				location: schedule.commission.location?.name ?? null,
				academicTerm: schedule.commission.academicTerm?.name ?? null
			});
		}
	}

	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			createdByUserId: locals.user.id
		},
		include: {
			subject: true,
			commission: true,
			classSchedule: true,
			entries: {
				include: {
					student: true
				}
			}
		},
		orderBy: {
			classDate: 'desc'
		},
		take: 20
	});

	return {
		teacher,
		subjects: subjectAssignments.map((assignment) => ({
			id: assignment.subject.id,
			code: assignment.subject.code,
			name: assignment.subject.name
		})),
		commissions: [...commissionsMap.values()],
		schedules: schedules.map((schedule) => ({
			id: schedule.id,
			subjectId: schedule.subjectId,
			commissionId: schedule.commissionId,
			dayOfWeek: schedule.dayOfWeek,
			startTime: schedule.startTime,
			endTime: schedule.endTime,
			classroom: schedule.classroom,
			location: schedule.location?.name ?? null,
			career: schedule.career.name
		})),
		studentsByCommission,
		recentAttendance: recentAttendance.map((record) => {
			const entries = record.entries.map((entry) => ({
				studentId: entry.studentId,
				studentName: `${entry.student.lastName}, ${entry.student.firstName}`,
				studentDni: entry.student.dni,
				status: normalizeStatus(entry),
				notes: entry.notes
			}));

			return {
				id: record.id,
				date: record.classDate,
				subject: record.subject.name,
				commission: record.commission?.code ?? null,
				startTime: record.classSchedule?.startTime ?? null,
				endTime: record.classSchedule?.endTime ?? null,
				totalStudents: entries.length,
				presentStudents: entries.filter((entry) => entry.status === 'PRESENT').length,
				lateStudents: entries.filter((entry) => entry.status === 'LATE').length,
				absentStudents: entries.filter((entry) => entry.status === 'ABSENT').length,
				justifiedStudents: entries.filter((entry) => entry.status === 'JUSTIFIED').length,
				entries
			};
		})
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		const formData = await request.formData();

		const subjectId = formData.get('subjectId')?.toString();

		const commissionId = formData.get('commissionId')?.toString();

		const classScheduleId = formData.get('classScheduleId')?.toString();

		const date = formData.get('date')?.toString();

		const rawAttendance = formData.get('attendanceData')?.toString();

		if (!subjectId || !commissionId || !classScheduleId || !date || !rawAttendance) {
			return fail(400, {
				error: 'Completá materia, comisión, clase y fecha'
			});
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: {
					userId: locals.user.id
				}
			});

			if (!teacher) {
				return fail(404, {
					error: 'Docente no encontrado'
				});
			}

			const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

			const schedule = await prisma.classSchedule.findUnique({
				where: {
					id: classScheduleId
				},
				include: {
					subject: true,
					commission: true
				}
			});

			if (
				!schedule ||
				!schedule.active ||
				!schedule.commission ||
				schedule.teacherId !== teacher.id ||
				schedule.subjectId !== subjectId ||
				schedule.commissionId !== commissionId
			) {
				return fail(403, {
					error: 'La clase seleccionada no corresponde al docente, materia o comisión'
				});
			}

			if (schedule.locationId && !allowedLocationIds.includes(schedule.locationId)) {
				return fail(403, {
					error: 'No tenés permiso para registrar asistencia en esa sede'
				});
			}

			if (date > todayInArgentina()) {
				return fail(400, {
					error: 'No se puede registrar asistencia para una fecha futura'
				});
			}

			if (getWeekDay(date) !== schedule.dayOfWeek) {
				return fail(400, {
					error: 'La fecha seleccionada no coincide con el día programado de esta clase'
				});
			}

			const attendance = JSON.parse(rawAttendance) as Array<{
				studentId: string;
				status: AttendanceStatus;
				notes?: string;
			}>;

			if (!Array.isArray(attendance)) {
				return fail(400, {
					error: 'Datos de asistencia inválidos'
				});
			}

			if (attendance.some((entry) => !entry.studentId || !VALID_STATUSES.has(entry.status))) {
				return fail(400, {
					error: 'Hay estados de asistencia inválidos'
				});
			}

			const activeEnrollments = await prisma.subjectEnrollment.findMany({
				where: {
					commissionId,
					status: 'ACTIVE',
					student: {
						status: 'ACTIVE'
					}
				},
				select: {
					studentId: true
				}
			});

			const validStudentIds = new Set(activeEnrollments.map((enrollment) => enrollment.studentId));

			const submittedStudentIds = new Set(attendance.map((entry) => entry.studentId));

			if (
				attendance.length !== validStudentIds.size ||
				submittedStudentIds.size !== validStudentIds.size ||
				attendance.some((entry) => !validStudentIds.has(entry.studentId))
			) {
				return fail(400, {
					error: 'La nómina enviada no coincide con los alumnos activos de la comisión'
				});
			}

			const classDate = parseClassDate(date);

			const existingRecord = await prisma.attendanceRecord.findFirst({
				where: {
					classScheduleId,
					classDate
				}
			});

			if (existingRecord) {
				return fail(400, {
					error: 'Ya existe asistencia registrada para esta clase y fecha'
				});
			}

			const record = await prisma.$transaction(async (tx) => {
				const attendanceRecord = await tx.attendanceRecord.create({
					data: {
						subjectId,
						commissionId,
						classScheduleId,
						classDate,
						createdByUserId: locals.user!.id
					}
				});

				await tx.attendanceEntry.createMany({
					data: attendance.map((entry) => ({
						attendanceId: attendanceRecord.id,
						studentId: entry.studentId,
						status: entry.status,
						present: legacyPresent(entry.status),
						notes: entry.notes?.trim() || null
					}))
				});

				return attendanceRecord;
			});

			for (const entry of attendance) {
				await updateAttendanceStatus(entry.studentId, subjectId);
			}

			const presentCount = attendance.filter((entry) => entry.status === 'PRESENT').length;

			const lateCount = attendance.filter((entry) => entry.status === 'LATE').length;

			const absentCount = attendance.filter((entry) => entry.status === 'ABSENT').length;

			const justifiedCount = attendance.filter((entry) => entry.status === 'JUSTIFIED').length;

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE_RECORD',
				entityId: record.id,
				description:
					`Asistencia ${schedule.subject.name} - ` +
					`${schedule.commission.code}: ` +
					`${presentCount} presentes, ` +
					`${lateCount} tarde, ` +
					`${absentCount} ausentes, ` +
					`${justifiedCount} justificadas`
			});

			return {
				success: 'Asistencia registrada correctamente'
			};
		} catch (error) {
			console.error('Error al registrar asistencia:', error);

			return fail(500, {
				error: 'No se pudo registrar la asistencia'
			});
		}
	},

	editAttendance: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		const formData = await request.formData();

		const attendanceId = formData.get('attendanceId')?.toString();

		const rawAttendance = formData.get('attendanceData')?.toString();

		if (!attendanceId || !rawAttendance) {
			return fail(400, {
				error: 'Faltan datos para actualizar la asistencia'
			});
		}

		try {
			const record = await prisma.attendanceRecord.findUnique({
				where: {
					id: attendanceId
				},
				include: {
					subject: true,
					entries: true
				}
			});

			if (!record) {
				return fail(404, {
					error: 'Registro de asistencia no encontrado'
				});
			}

			if (record.createdByUserId !== locals.user.id) {
				return fail(403, {
					error: 'No tenés permiso para editar este registro'
				});
			}

			const attendance = JSON.parse(rawAttendance) as Array<{
				studentId: string;
				status: AttendanceStatus;
				notes?: string;
			}>;

			if (
				!Array.isArray(attendance) ||
				attendance.some((entry) => !VALID_STATUSES.has(entry.status))
			) {
				return fail(400, {
					error: 'Datos de asistencia inválidos'
				});
			}

			const existingIds = new Set(record.entries.map((entry) => entry.studentId));

			if (
				attendance.length !== existingIds.size ||
				attendance.some((entry) => !existingIds.has(entry.studentId))
			) {
				return fail(400, {
					error: 'No se puede alterar la nómina original del registro'
				});
			}

			await prisma.$transaction(async (tx) => {
				for (const entry of attendance) {
					await tx.attendanceEntry.update({
						where: {
							attendanceId_studentId: {
								attendanceId,
								studentId: entry.studentId
							}
						},
						data: {
							status: entry.status,
							present: legacyPresent(entry.status),
							notes: entry.notes?.trim() || null
						}
					});
				}
			});

			for (const entry of attendance) {
				await updateAttendanceStatus(entry.studentId, record.subjectId);
			}

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'ATTENDANCE_RECORD',
				entityId: attendanceId,
				description: `Asistencia corregida en ${record.subject.name}`
			});

			return {
				success: 'Asistencia actualizada correctamente'
			};
		} catch (error) {
			console.error('Error al editar asistencia:', error);

			return fail(500, {
				error: 'No se pudo actualizar la asistencia'
			});
		}
	}
};
