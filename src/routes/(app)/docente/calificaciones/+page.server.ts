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

	// Obtener calificaciones existentes del docente
	const existingGrades = await prisma.grade.findMany({
		where: {
			createdByUserId: locals.user.id,
			commissionId: {
				in: commissions.map(c => c.id)
			}
		},
		include: {
			student: {
				include: {
					user: true
				}
			},
			commission: {
				include: {
					subject: true
				}
			}
		},
		orderBy: { gradedAt: 'desc' },
		take: 50
	});

	return {
		commissions: commissions.map(c => ({
			id: c.id,
			name: c.name,
			subject: c.subject.name,
			subjectId: c.subject.id,
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
		existingGrades: existingGrades.map(g => ({
			id: g.id,
			studentId: g.studentId,
			studentName: `${g.student.lastName}, ${g.student.firstName}`,
			subject: g.commission.subject.name,
			commissionId: g.commissionId,
			value: g.value,
			gradeType: g.gradeType,
			gradedAt: g.gradedAt
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
		const commissionId = data.get('commissionId')?.toString();
		const grade = data.get('grade')?.toString();
		const evaluationType = data.get('evaluationType')?.toString();
		const notes = data.get('notes')?.toString();

		if (!studentId || !commissionId || !grade) {
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
				return { error: 'No tenés permiso para cargar calificaciones en esta comisión' };
			}

			// Obtener datos del estudiante para auditoría
			const student = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			const commission = await prisma.commission.findUnique({
				where: { id: commissionId },
				include: { subject: true }
			});

			await prisma.grade.create({
				data: {
					studentId,
					commissionId,
					value: parseFloat(grade),
					gradeType: evaluationType || 'PARCIAL',
					createdByUserId: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'GRADE',
				entityId: studentId,
				description: `Carga de calificación: ${grade} para ${student?.firstName} ${student?.lastName} en ${commission?.subject.name} (${evaluationType || 'PARCIAL'})`
			});

			return { success: 'Calificación registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar calificación:', error);
			return { error: 'Error al registrar la calificación' };
		}
	}
};
