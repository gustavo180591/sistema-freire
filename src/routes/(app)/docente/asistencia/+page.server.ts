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

	const assignedSubjectIds = subjectAssignments.map((assignment) => assignment.subjectId);

	const enrollments = assignedSubjectIds.length
		? await prisma.subjectEnrollment.findMany({
				where: {
					subjectId: {
						in: assignedSubjectIds
					},
					status: 'ACTIVE',
					student: {
						status: 'ACTIVE'
					},
					commission: {
						is: {
							teacherId: teacher.id,
							active: true,
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
						}
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

	type AttendanceStudent = {
		id: string;
		enrollmentId: string;
		dni: string;
		firstName: string;
		lastName: string;
		career: string;
		currentYear: number;
	};

	const studentsBySubject: Record<string, AttendanceStudent[]> = {};
	const studentIdsBySubject = new Map<string, Set<string>>();

	for (const enrollment of enrollments) {
		studentsBySubject[enrollment.subjectId] ??= [];

		const seenStudentIds = studentIdsBySubject.get(enrollment.subjectId) ?? new Set<string>();

		if (seenStudentIds.has(enrollment.studentId)) {
			continue;
		}

		studentsBySubject[enrollment.subjectId].push({
			id: enrollment.student.id,
			enrollmentId: enrollment.id,
			dni: enrollment.student.dni,
			firstName: enrollment.student.firstName,
			lastName: enrollment.student.lastName,
			career: enrollment.student.career.name,
			currentYear: enrollment.student.currentYear
		});

		seenStudentIds.add(enrollment.studentId);
		studentIdsBySubject.set(enrollment.subjectId, seenStudentIds);
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
		studentsBySubject,
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
		const date = formData.get('date')?.toString();
		const rawAttendance = formData.get('attendanceData')?.toString();

		if (!subjectId || !date || !rawAttendance) {
			return fail(400, {
				error: 'Completá la materia y la fecha'
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

			const subjectAssignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId: teacher.id
					}
				},
				select: {
					subject: {
						select: {
							name: true
						}
					}
				}
			});

			if (!subjectAssignment) {
				return fail(403, {
					error: 'No tenés permiso para tomar asistencia en esta materia'
				});
			}

			if (date > todayInArgentina()) {
				return fail(400, {
					error: 'No se puede registrar asistencia para una fecha futura'
				});
			}

			const attendance = JSON.parse(rawAttendance) as Array<{
				studentId: string;
				status: AttendanceStatus;
				notes?: string;
			}>;

			if (!Array.isArray(attendance) || attendance.length === 0) {
				return fail(400, {
					error: 'La materia no tiene alumnos activos para registrar'
				});
			}

			if (attendance.some((entry) => !entry.studentId || !VALID_STATUSES.has(entry.status))) {
				return fail(400, {
					error: 'Hay estados de asistencia inválidos'
				});
			}

			const allowedLocationIds = await getUserAllowedLocationIds(locals.user);

			const activeEnrollments = await prisma.subjectEnrollment.findMany({
				where: {
					subjectId,
					status: 'ACTIVE',
					student: {
						status: 'ACTIVE'
					},
					commission: {
						is: {
							teacherId: teacher.id,
							active: true,
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
						}
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
					error: 'La nómina enviada no coincide con los alumnos que cursan actualmente la materia'
				});
			}

			const classDate = parseClassDate(date);

			const existingRecord = await prisma.attendanceRecord.findFirst({
				where: {
					subjectId,
					classDate,
					createdByUserId: locals.user.id
				},
				select: {
					id: true
				}
			});

			if (existingRecord) {
				return fail(400, {
					error: 'Ya existe asistencia registrada para esta materia y fecha'
				});
			}

			const record = await prisma.$transaction(async (tx) => {
				const attendanceRecord = await tx.attendanceRecord.create({
					data: {
						subjectId,
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
					`Asistencia ${subjectAssignment.subject.name}: ` +
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
