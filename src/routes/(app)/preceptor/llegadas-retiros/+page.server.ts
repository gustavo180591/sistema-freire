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
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	// Obtener materias
	const subjects = await prisma.subject.findMany({
		include: {
			careerSubjects: {
				include: {
					career: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	// Obtener registros recientes de llegadas tarde y retiros
	const recentRecords = await prisma.attendanceEntry.findMany({
		where: {
			OR: [{ notes: { contains: 'LLEGADA_TARDE' } }, { notes: { contains: 'RETIRO_ANTICIPADO' } }]
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			attendance: {
				include: {
					subject: true
				}
			}
		},
		orderBy: {
			attendance: {
				classDate: 'desc'
			}
		},
		take: 20
	});

	return {
		students: students.map((s) => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name
		})),
		subjects: subjects.map((s) => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map((cs) => cs.career.name)
		})),
		recentRecords: recentRecords.map((r) => ({
			id: r.id,
			studentName: `${r.student.lastName}, ${r.student.firstName}`,
			studentDni: r.student.dni,
			date: r.attendance.classDate,
			subject: r.attendance.subject.name,
			notes: r.notes
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const studentId = data.get('studentId')?.toString();
		const subjectId = data.get('subjectId')?.toString();
		const date = data.get('date')?.toString();
		const type = data.get('type')?.toString(); // 'LLEGADA_TARDE' o 'RETIRO_ANTICIPADO'
		const time = data.get('time')?.toString();
		const notes = data.get('notes')?.toString();

		if (!studentId || !subjectId || !date || !type || !time) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Obtener datos del estudiante y materia para auditoría
			const student = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			// Buscar o crear el registro de asistencia
			const attendanceRecord = await prisma.attendanceRecord.findFirst({
				where: {
					subjectId,
					classDate: new Date(date)
				}
			});

			let attendanceId: string;

			if (attendanceRecord) {
				attendanceId = attendanceRecord.id;
			} else {
				const newRecord = await prisma.attendanceRecord.create({
					data: {
						subjectId,
						classDate: new Date(date),
						createdByUserId: locals.user!.id
					}
				});
				attendanceId = newRecord.id;
			}

			// Buscar o crear la entrada de asistencia del estudiante
			const existingEntry = await prisma.attendanceEntry.findFirst({
				where: {
					attendanceId,
					studentId
				}
			});

			const notePrefix = type === 'LLEGADA_TARDE' ? 'LLEGADA_TARDE' : 'RETIRO_ANTICIPADO';
			const fullNotes = `${notePrefix}: ${time}${notes ? ' - ' + notes : ''}`;

			if (existingEntry) {
				await prisma.attendanceEntry.update({
					where: { id: existingEntry.id },
					data: {
						notes: existingEntry.notes ? `${existingEntry.notes} | ${fullNotes}` : fullNotes
					}
				});
			} else {
				await prisma.attendanceEntry.create({
					data: {
						attendanceId,
						studentId,
						present: true, // Si llegó tarde o se retiró, estuvo presente
						notes: fullNotes
					}
				});
			}

			// Registrar en auditoría
			await auditLog({
				userId: locals.user!.id,
				action: AuditAction.CREATE,
				entityType: 'ATTENDANCE_ENTRY',
				entityId: studentId,
				description: `Registro de ${type === 'LLEGADA_TARDE' ? 'llegada tarde' : 'retiro anticipado'}: ${student?.firstName} ${student?.lastName} en ${subject?.name} a las ${time} el ${date}`
			});

			return { success: 'Registro guardado exitosamente' };
		} catch (error) {
			console.error('Error al registrar:', error);
			return { error: 'Error al registrar el evento' };
		}
	}
};
