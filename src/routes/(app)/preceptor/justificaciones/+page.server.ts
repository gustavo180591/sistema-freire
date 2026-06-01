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

	// Obtener entradas de asistencia con ausencias sin justificar
	const unexcusedAbsences = await prisma.attendanceEntry.findMany({
		where: { present: false },
		include: {
			student: {
				include: {
					user: true,
					career: true
				}
			},
			attendance: {
				include: {
					commission: {
						include: {
							subject: true
						}
					}
				}
			}
		},
		orderBy: {
			attendance: {
				classDate: 'desc'
			}
		}
	});

	return {
		students: students.map(s => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name
		})),
		unexcusedAbsences: unexcusedAbsences.map(a => ({
			id: a.id,
			studentId: a.studentId,
			studentName: `${a.student.lastName}, ${a.student.firstName}`,
			studentDni: a.student.dni,
			date: a.attendance.classDate,
			commission: a.attendance.commission.name,
			subject: a.attendance.commission.subject.name,
			notes: a.notes
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const entryId = data.get('entryId')?.toString();
		const justification = data.get('justification')?.toString();

		if (!entryId || !justification) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Obtener datos de la entrada para auditoría
			const entry = await prisma.attendanceEntry.findUnique({
				where: { id: entryId },
				include: {
					student: {
						include: { user: true }
					},
					attendance: {
						include: {
							commission: {
								include: { subject: true }
							}
						}
					}
				}
			});

			await prisma.attendanceEntry.update({
				where: { id: entryId },
				data: {
					notes: justification
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user!.id,
				action: AuditAction.UPDATE,
				entityType: 'ATTENDANCE_ENTRY',
				entityId: entryId,
				description: `Justificación de inasistencia: ${entry?.student.firstName} ${entry?.student.lastName} en ${entry?.attendance.commission.subject.name} el ${entry?.attendance.classDate.toLocaleDateString()}`
			});

			return { success: 'Justificación registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar justificación:', error);
			return { error: 'Error al registrar la justificación' };
		}
	}
};
