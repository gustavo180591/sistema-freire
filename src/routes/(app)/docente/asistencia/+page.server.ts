import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { AuditAction, Prisma } from '@prisma/client';

import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds, requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';
import {
	buildTeacherAttendanceDeduplicationKey,
	getTeacherAttendanceContext
} from '$lib/server/academic/teacher-attendance-scope-service';

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

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user);

	const attendanceContext = await getTeacherAttendanceContext(teacher.id, allowedLocationIds);

	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			createdByUserId: locals.user.id
		},
		include: {
			subject: true,
			commission: true,
			classSchedule: true,
			location: true,
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
		subjects: attendanceContext.subjects,
		attendanceScopes: attendanceContext.scopes,
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
				location: record.location?.name ?? null,
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
	saveAttendance: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		const formData = await request.formData();

		const subjectId = formData.get('subjectId')?.toString();
		const scopeKey = formData.get('scopeKey')?.toString();
		const date = formData.get('date')?.toString();
		const rawAttendance = formData.get('attendanceData')?.toString();

		if (!subjectId || !scopeKey || !date || !rawAttendance) {
			return fail(400, {
				error: 'Completá la materia, el grupo y la fecha'
			});
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: {
					userId: locals.user.id
				},
				select: {
					id: true
				}
			});

			if (!teacher) {
				return fail(404, {
					error: 'Docente no encontrado'
				});
			}

			const allowedLocationIds = await getUserAllowedLocationIds(locals.user);

			const attendanceContext = await getTeacherAttendanceContext(teacher.id, allowedLocationIds);

			const assignedSubject = attendanceContext.subjects.find(
				(subject) => subject.id === subjectId
			);

			if (!assignedSubject) {
				return fail(403, {
					error: 'No tenés permiso para tomar asistencia en esta materia'
				});
			}

			const scope = attendanceContext.scopes.find(
				(candidate) => candidate.key === scopeKey && candidate.subjectId === subjectId
			);

			if (!scope) {
				return fail(403, {
					error: 'El grupo seleccionado no está habilitado para este docente'
				});
			}

			if (date > todayInArgentina()) {
				return fail(400, {
					error: 'No se puede registrar asistencia para una fecha futura'
				});
			}

			let attendance: Array<{
				studentId: string;
				status: AttendanceStatus;
				notes?: string;
			}>;

			try {
				attendance = JSON.parse(rawAttendance);
			} catch {
				return fail(400, {
					error: 'Los datos de asistencia son inválidos'
				});
			}

			if (!Array.isArray(attendance) || attendance.length === 0) {
				return fail(400, {
					error: 'El grupo no tiene alumnos activos para registrar'
				});
			}

			if (attendance.some((entry) => !entry.studentId || !VALID_STATUSES.has(entry.status))) {
				return fail(400, {
					error: 'Hay estados de asistencia inválidos'
				});
			}

			const validStudentIds = new Set(scope.students.map((student) => student.id));
			const submittedStudentIds = new Set(attendance.map((entry) => entry.studentId));

			if (
				attendance.length !== validStudentIds.size ||
				submittedStudentIds.size !== validStudentIds.size ||
				attendance.some((entry) => !validStudentIds.has(entry.studentId))
			) {
				return fail(400, {
					error: 'La nómina enviada no coincide con los alumnos habilitados para este grupo'
				});
			}

			const classDate = parseClassDate(date);

			/*
			 * Compatibilidad con registros históricos sin deduplicationKey:
			 * una comisión puede tener una asistencia por materia/fecha;
			 * los grupos sin comisión se diferencian por localidad.
			 */
			const existingRecord = await prisma.attendanceRecord.findFirst({
				where: scope.commissionId
					? {
							subjectId,
							classDate,
							commissionId: scope.commissionId
						}
					: {
							subjectId,
							classDate,
							commissionId: null,
							OR: [{ locationId: scope.locationId }, { locationId: null }]
						},
				select: {
					id: true
				}
			});

			if (existingRecord) {
				return fail(400, {
					error: 'Ya existe asistencia registrada para este grupo y fecha'
				});
			}

			const deduplicationKey = buildTeacherAttendanceDeduplicationKey({
				subjectId,
				commissionId: scope.commissionId,
				locationId: scope.locationId,
				date
			});

			const record = await prisma.$transaction(async (tx) => {
				const attendanceRecord = await tx.attendanceRecord.create({
					data: {
						subjectId,
						classDate,
						createdByUserId: locals.user!.id,
						commissionId: scope.commissionId,
						locationId: scope.locationId,
						deduplicationKey
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
					`Asistencia ${assignedSubject.name} (${scope.label}): ` +
					`${presentCount} presentes, ` +
					`${lateCount} tarde, ` +
					`${absentCount} ausentes, ` +
					`${justifiedCount} justificadas`
			});

			return {
				success: 'Asistencia registrada correctamente'
			};
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
				return fail(400, {
					error: 'Ya existe asistencia registrada para este grupo y fecha'
				});
			}

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
