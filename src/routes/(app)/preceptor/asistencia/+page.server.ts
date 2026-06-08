import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';
import { updateAttendanceStatus } from '$lib/server/academic/plan-logic';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['PRECEPTOR']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener localidades permitidas para el preceptor
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener estudiantes activos filtrados por localidad
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			career: {
				locations: {
					some: {
						locationId: { in: allowedLocationIds }
					}
				}
			}
		},
		include: {
			user: true,
			career: true
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	// Obtener materias filtradas por localidad
	const subjects = await prisma.subject.findMany({
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
		},
		orderBy: { name: 'asc' }
	});

	// Obtener comisiones para las materias, filtrando por localidades permitidas
	const commissions = await prisma.subjectCommission.findMany({
		where: {
			subjectId: { in: subjects.map(s => s.id) },
			active: true,
			locationId: { in: allowedLocationIds }
		},
		include: {
			subject: true,
			teacher: true,
			location: true
		}
	});

	// Obtener registros de asistencia recientes filtrados por localidad
	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			subject: {
				careerSubjects: {
					some: {
						career: {
							locations: {
								some: {
									locationId: { in: allowedLocationIds }
								}
							}
						}
					}
				}
			}
		},
		include: {
			entries: {
				include: {
					student: {
						include: {
							user: true
						}
					}
				}
			},
			subject: true
		},
		orderBy: { classDate: 'desc' },
		take: 10
	});

	return {
		students: students.map(s => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name,
			currentYear: s.currentYear
		})),
		subjects: subjects.map(s => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map(cs => cs.career.name)
		})),
		commissions: commissions.map(c => ({
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
		recentAttendance: recentAttendance.map(r => ({
			id: r.id,
			date: r.classDate,
			subject: r.subject.name,
			totalStudents: r.entries.length,
			presentStudents: r.entries.filter((e: any) => e.present).length
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const subjectId = data.get('subjectId')?.toString();
		const date = data.get('date')?.toString();
		const commissionId = data.get('commissionId')?.toString();
		const attendanceData = data.get('attendanceData')?.toString();

		if (!subjectId || !date || !attendanceData) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			const attendance = JSON.parse(attendanceData) as Array<{ studentId: string; present: boolean; notes?: string }>;

			// Obtener datos de la materia para auditoría
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			// Verificar si ya existe un registro de asistencia para esta materia, fecha y comisión
			const existingRecord = await prisma.attendanceRecord.findFirst({
				where: {
					subjectId,
					classDate: new Date(date),
					commissionId: commissionId || null
				}
			});

			if (existingRecord) {
				return { error: 'Ya existe un registro de asistencia para esta materia en esta fecha' + (commissionId ? ' y comisión' : '') };
			}

			await prisma.$transaction(async (tx) => {
				// Crear registro de asistencia
				const attendanceRecord = await tx.attendanceRecord.create({
					data: {
						subjectId,
						classDate: new Date(date),
						commissionId: commissionId || null,
						createdByUserId: locals.user!.id
					}
				});

				// Crear entradas de asistencia para cada estudiante
				for (const entry of attendance) {
					await tx.attendanceEntry.create({
						data: {
							attendanceId: attendanceRecord.id,
							studentId: entry.studentId,
							present: entry.present,
							notes: entry.notes || null
						}
					});
				}
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
				userId: locals.user!.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE',
				entityId: subjectId,
				description: `Registro de asistencia para ${subject?.name} el ${date} - ${attendance.length} estudiantes`
			});

			// Registrar cambios de regularidad en auditoría si hubo
			if (regularityUpdates.length > 0) {
				for (const update of regularityUpdates) {
					await auditLog({
						userId: locals.user!.id,
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
	}
};
