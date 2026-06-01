import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id },
		include: {
			commissions: {
				include: {
					commission: {
						include: {
							subject: true,
							term: true
						}
					}
				}
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las comisiones asignadas al docente
	const commissions = teacher.commissions.map(ct => ct.commission);

	// Obtener estudiantes de las comisiones del docente
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			enrollments: {
				some: {
					commissionId: {
						in: commissions.map(c => c.id)
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

	// Obtener registros de asistencia recientes del docente
	const recentAttendance = await prisma.attendanceRecord.findMany({
		where: {
			createdByUserId: locals.user.id,
			commissionId: {
				in: commissions.map(c => c.id)
			}
		},
		include: {
			commission: {
				include: {
					subject: true
				}
			},
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
		commissions: commissions.map(c => ({
			id: c.id,
			name: c.name,
			subject: c.subject.name,
			term: c.term.name,
			active: c.active
		})),
		students: students.map(s => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name,
			currentYear: s.currentYear
		})),
		recentAttendance: recentAttendance.map(a => ({
			id: a.id,
			date: a.classDate,
			subject: a.commission.subject.name,
			commission: a.commission.name,
			totalStudents: a.entries.length,
			presentStudents: a.entries.filter((e: any) => e.present).length,
			entries: a.entries.map((e: any) => ({
				studentId: e.studentId,
				studentName: `${e.student.lastName}, ${e.student.firstName}`,
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
		const commissionId = data.get('commissionId')?.toString();
		const date = data.get('date')?.toString();
		const attendanceData = data.get('attendanceData')?.toString();

		if (!commissionId || !date || !attendanceData) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que la comisión pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id },
				include: {
					commissions: true
				}
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const teacherCommissionIds = teacher.commissions.map(ct => ct.commissionId);
			if (!teacherCommissionIds.includes(commissionId)) {
				return { error: 'No tenés permiso para registrar asistencia en esta comisión' };
			}

			// Obtener datos de la comisión para auditoría
			const commission = await prisma.commission.findUnique({
				where: { id: commissionId },
				include: { subject: true }
			});

			// Parsear datos de asistencia
			const attendance = JSON.parse(attendanceData) as Array<{ studentId: string; present: boolean; notes?: string }>;

			// Crear registro de asistencia
			const attendanceRecord = await prisma.attendanceRecord.create({
				data: {
					commissionId,
					classDate: new Date(date),
					createdByUserId: locals.user.id
				}
			});

			// Crear entradas de asistencia para cada estudiante
			const presentCount = attendance.filter(a => a.present).length;
			const absentCount = attendance.length - presentCount;

			await prisma.attendanceEntry.createMany({
				data: attendance.map(a => ({
					attendanceId: attendanceRecord.id,
					studentId: a.studentId,
					present: a.present,
					notes: a.notes || null
				}))
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE_RECORD',
				entityId: attendanceRecord.id,
				description: `Registro de asistencia: ${presentCount} presentes, ${absentCount} ausentes en ${commission?.subject.name} el ${date}`
			});

			return { success: 'Asistencia registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar asistencia:', error);
			return { error: 'Error al registrar la asistencia' };
		}
	}
};
