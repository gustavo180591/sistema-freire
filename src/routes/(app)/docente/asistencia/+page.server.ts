import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';
import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener localidades permitidas para el docente
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id }
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las materias asignadas al docente, filtrando por localidades permitidas
	const subjectTeachers = await prisma.subjectTeacher.findMany({
		where: { teacherId: teacher.id },
		include: {
			subject: {
				include: {
					careerSubjects: {
						where: {
							career: {
								locations: {
									some: {
										locationId: { in: allowedLocationIds }
									}
								}
							}
						},
						include: {
							career: true
						}
					}
				}
			}
		}
	});

	const subjects = subjectTeachers.map((st) => st.subject);

	// Obtener comisiones para las materias del docente, filtrando por localidades permitidas
	const commissions = await prisma.subjectCommission.findMany({
		where: {
			subjectId: { in: subjects.map((s) => s.id) },
			active: true,
			locationId: { in: allowedLocationIds }
		},
		include: {
			subject: true,
			teacher: true,
			location: true
		}
	});

	// Obtener estudiantes de las carreras de las materias del docente
	const careerIds = subjects.flatMap((s) => s.careerSubjects.map((cs) => cs.career.id));
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			careerId: {
				in: careerIds
			}
		},
		include: {
			user: true,
			career: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	// Obtener registros de asistencia recientes del docente
	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			createdByUserId: locals.user.id,
			subjectId: {
				in: subjects.map((s) => s.id)
			}
		},
		include: {
			subject: true,
			entries: {
				include: {
					student: {
						include: {
							user: true
						}
					}
				}
			}
		},
		orderBy: { classDate: 'desc' },
		take: 20
	});

	return {
		subjects: subjects.map((s) => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map((cs) => cs.career.name)
		})),
		commissions: commissions.map((c) => ({
			id: c.id,
			code: c.code,
			subjectId: c.subjectId,
			subjectName: c.subject.name,
			teacherId: c.teacherId,
			teacherName: c.teacher ? `${c.teacher.lastName}, ${c.teacher.firstName}` : null,
			locationId: c.locationId,
			locationName: c.location?.name || null,
			schedule: c.schedule
		})),
		students: students.map((s) => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name,
			currentYear: s.currentYear
		})),
		recentAttendance: recentAttendance.map((a) => ({
			id: a.id,
			date: a.classDate,
			subject: a.subject.name,
			totalStudents: a.entries.length,
			presentStudents: a.entries.filter((e: any) => e.present).length,
			entries: a.entries.map((e: any) => ({
				studentId: e.studentId,
				studentName: `${e.student.lastName}, ${e.student.firstName}`,
				studentDni: e.student.dni,
				present: e.present,
				notes: e.notes
			}))
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const subjectId = data.get('subjectId')?.toString();
		const date = data.get('date')?.toString();
		const commissionId = data.get('commissionId')?.toString();
		const attendanceData = data.get('attendanceData')?.toString();

		if (!subjectId || !date || !attendanceData) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que la materia pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id }
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const subjectTeacher = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId: teacher.id
					}
				}
			});

			if (!subjectTeacher) {
				return { error: 'No tenés permiso para registrar asistencia en esta materia' };
			}

			// Obtener datos de la materia para auditoría
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			// Parsear datos de asistencia
			const attendance = JSON.parse(attendanceData) as Array<{
				studentId: string;
				present: boolean;
				notes?: string;
			}>;

			// Verificar si ya existe un registro de asistencia para esta materia, fecha y comisión
			const existingRecord = await prisma.attendanceRecord.findFirst({
				where: {
					subjectId,
					classDate: new Date(date),
					commissionId: commissionId || null
				}
			});

			if (existingRecord) {
				return {
					error:
						'Ya existe un registro de asistencia para esta materia en esta fecha' +
						(commissionId ? ' y comisión' : '')
				};
			}

			// Crear registro de asistencia
			const attendanceRecord = await prisma.attendanceRecord.create({
				data: {
					subjectId,
					classDate: new Date(date),
					commissionId: commissionId || null,
					createdByUserId: locals.user.id
				}
			});

			// Crear entradas de asistencia para cada estudiante
			const presentCount = attendance.filter((a) => a.present).length;
			const absentCount = attendance.length - presentCount;

			await prisma.attendanceEntry.createMany({
				data: attendance.map((a) => ({
					attendanceId: attendanceRecord.id,
					studentId: a.studentId,
					present: a.present,
					notes: a.notes || null
				}))
			});

			// Actualizar estado de regularidad para cada estudiante
			const regularityUpdates = [];
			for (const a of attendance) {
				const statusUpdate = await updateAttendanceStatus(a.studentId, subjectId);
				if (statusUpdate.statusChanged) {
					regularityUpdates.push({
						studentId: a.studentId,
						previousStatus: statusUpdate.previousStatus,
						newStatus: statusUpdate.regularityStatus,
						attendancePercent: statusUpdate.attendancePercent
					});
				}
			}

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE_RECORD',
				entityId: attendanceRecord.id,
				description: `Registro de asistencia: ${presentCount} presentes, ${absentCount} ausentes en ${subject?.name} el ${date}`
			});

			// Registrar cambios de regularidad en auditoría si hubo
			if (regularityUpdates.length > 0) {
				for (const update of regularityUpdates) {
					await auditLog({
						userId: locals.user.id,
						action: AuditAction.UPDATE,
						entityType: 'STUDENT_SUBJECT_STATUS',
						entityId: `${update.studentId}_${subjectId}`,
						description: `Cambio de regularidad por asistencia: ${update.previousStatus} → ${update.newStatus} (${update.attendancePercent}%) en ${subject?.name}`
					});
				}
			}

			return { success: 'Asistencia registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar asistencia:', error);
			return { error: 'Error al registrar la asistencia' };
		}
	},

	editAttendance: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const attendanceId = data.get('attendanceId')?.toString();
		const attendanceData = data.get('attendanceData')?.toString();

		if (!attendanceId || !attendanceData) {
			return { error: 'Datos requeridos faltantes' };
		}

		try {
			// Verificar que el registro de asistencia pertenezca al docente
			const attendanceRecord = await prisma.attendanceRecord.findUnique({
				where: { id: attendanceId },
				include: {
					subject: true
				}
			});

			if (!attendanceRecord) {
				return { error: 'Registro de asistencia no encontrado' };
			}

			if (attendanceRecord.createdByUserId !== locals.user.id) {
				return { error: 'No tenés permiso para editar este registro de asistencia' };
			}

			// Parsear datos de asistencia
			const attendance = JSON.parse(attendanceData) as Array<{
				studentId: string;
				present: boolean;
				notes?: string;
			}>;

			// Actualizar o crear entradas de asistencia
			for (const a of attendance) {
				const existingEntry = await prisma.attendanceEntry.findUnique({
					where: {
						attendanceId_studentId: {
							attendanceId,
							studentId: a.studentId
						}
					}
				});

				if (existingEntry) {
					await prisma.attendanceEntry.update({
						where: { id: existingEntry.id },
						data: {
							present: a.present,
							notes: a.notes || null
						}
					});
				} else {
					await prisma.attendanceEntry.create({
						data: {
							attendanceId,
							studentId: a.studentId,
							present: a.present,
							notes: a.notes || null
						}
					});
				}
			}

			const presentCount = attendance.filter((a) => a.present).length;
			const absentCount = attendance.length - presentCount;

			// Actualizar estado de regularidad para cada estudiante
			const regularityUpdates = [];
			for (const a of attendance) {
				const statusUpdate = await updateAttendanceStatus(a.studentId, attendanceRecord.subjectId);
				if (statusUpdate.statusChanged) {
					regularityUpdates.push({
						studentId: a.studentId,
						previousStatus: statusUpdate.previousStatus,
						newStatus: statusUpdate.regularityStatus,
						attendancePercent: statusUpdate.attendancePercent
					});
				}
			}

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'ATTENDANCE_RECORD',
				entityId: attendanceId,
				description: `Edición de asistencia: ${presentCount} presentes, ${absentCount} ausentes en ${attendanceRecord.subject.name} el ${attendanceRecord.classDate.toLocaleDateString('es-AR')}`
			});

			// Registrar cambios de regularidad en auditoría si hubo
			if (regularityUpdates.length > 0) {
				for (const update of regularityUpdates) {
					await auditLog({
						userId: locals.user.id,
						action: AuditAction.UPDATE,
						entityType: 'STUDENT_SUBJECT_STATUS',
						entityId: `${update.studentId}_${attendanceRecord.subjectId}`,
						description: `Cambio de regularidad por asistencia: ${update.previousStatus} → ${update.newStatus} (${update.attendancePercent}%) en ${attendanceRecord.subject.name}`
					});
				}
			}

			return { success: 'Asistencia actualizada exitosamente' };
		} catch (error) {
			console.error('Error al editar asistencia:', error);
			return { error: 'Error al editar la asistencia' };
		}
	}
};
