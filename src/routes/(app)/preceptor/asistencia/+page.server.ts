import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['PRECEPTOR']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener estudiantes activos
	const students = await prisma.student.findMany({
		where: { status: 'ACTIVE' },
		include: {
			user: true,
			career: true
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	// Obtener comisiones
	const commissions = await prisma.commission.findMany({
		include: {
			subject: true,
			term: true
		},
		orderBy: { name: 'asc' }
	});

	// Obtener registros de asistencia recientes
	const recentAttendance = await prisma.attendanceRecord.findMany({
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
			commission: {
				include: {
					subject: true
				}
			}
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
		commissions,
		recentAttendance: recentAttendance.map(r => ({
			id: r.id,
			date: r.classDate,
			commission: r.commission.name,
			subject: r.commission.subject.name,
			totalStudents: r.entries.length,
			presentStudents: r.entries.filter((e: any) => e.present).length
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const commissionId = data.get('commissionId')?.toString();
		const date = data.get('date')?.toString();
		const attendanceData = data.get('attendanceData')?.toString();

		if (!commissionId || !date || !attendanceData) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			const attendance = JSON.parse(attendanceData) as Array<{ studentId: string; present: boolean; notes?: string }>;

			// Obtener datos de la comisión para auditoría
			const commission = await prisma.commission.findUnique({
				where: { id: commissionId },
				include: { subject: true }
			});

			await prisma.$transaction(async (tx) => {
				// Crear registro de asistencia
				const attendanceRecord = await tx.attendanceRecord.create({
					data: {
						commissionId,
						classDate: new Date(date),
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

			// Registrar en auditoría
			await auditLog({
				userId: locals.user!.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE',
				entityId: commissionId,
				description: `Registro de asistencia para ${commission?.subject.name} (${commission?.name}) el ${date} - ${attendance.length} estudiantes`
			});

			return { success: 'Asistencia registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar asistencia:', error);
			return { error: 'Error al registrar la asistencia' };
		}
	}
};
