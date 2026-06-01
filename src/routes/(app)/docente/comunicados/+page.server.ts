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

	// Obtener comunicados recientes del docente
	const recentCommunications = await prisma.studentFollowUp.findMany({
		where: {
			createdBy: locals.user.id,
			type: {
				in: ['MEETING', 'NOTE']
			},
			student: {
				enrollments: {
					some: {
						commissionId: {
							in: commissions.map(c => c.id)
						}
					}
				}
			}
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			creator: true
		},
		orderBy: { date: 'desc' },
		take: 50
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
		recentCommunications: recentCommunications.map(c => ({
			id: c.id,
			studentId: c.studentId,
			studentName: `${c.student.lastName}, ${c.student.firstName}`,
			type: c.type,
			title: c.title,
			description: c.description,
			date: c.date,
			creatorName: `${c.creator.firstName} ${c.creator.lastName}`
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
		const studentId = data.get('studentId')?.toString();
		const type = data.get('type')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();

		if (!studentId || !type || !title || !description) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que el estudiante pertenezca a las comisiones del docente
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
			const studentEnrollment = await prisma.enrollment.findFirst({
				where: {
					studentId,
					commissionId: {
						in: teacherCommissionIds
					}
				}
			});

			if (!studentEnrollment) {
				return { error: 'No tenés permiso para enviar comunicados a este estudiante' };
			}

			// Obtener datos del estudiante para auditoría
			const student = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			await prisma.studentFollowUp.create({
				data: {
					studentId,
					type: type as any,
					title,
					description,
					createdBy: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'COMMUNICATION',
				entityId: studentId,
				description: `Comunicado: ${type} - ${title} para ${student?.firstName} ${student?.lastName}`
			});

			return { success: 'Comunicado enviado exitosamente' };
		} catch (error) {
			console.error('Error al enviar comunicado:', error);
			return { error: 'Error al enviar el comunicado' };
		}
	}
};
