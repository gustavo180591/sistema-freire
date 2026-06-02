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
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['PRECEPTOR']);

		const data = await request.formData();
		const studentId = data.get('studentId')?.toString();
		const subjectId = data.get('subjectId')?.toString();
		const grade = data.get('grade')?.toString();
		const evaluationType = data.get('evaluationType')?.toString();
		const notes = data.get('notes')?.toString();

		if (!studentId || !subjectId || !grade) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Obtener datos del estudiante para auditoría
			const student = await prisma.student.findUnique({
				where: { id: studentId },
				include: { user: true }
			});

			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			await prisma.grade.create({
				data: {
					studentId,
					subjectId,
					value: parseFloat(grade),
					gradeType: evaluationType || 'PARCIAL',
					createdByUserId: locals.user!.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user!.id,
				action: AuditAction.CREATE,
				entityType: 'GRADE',
				entityId: studentId,
				description: `Carga de calificación: ${grade} para ${student?.firstName} ${student?.lastName} en ${subject?.name} (${evaluationType || 'PARCIAL'})`
			});

			return { success: 'Calificación registrada exitosamente' };
		} catch (error) {
			console.error('Error al registrar calificación:', error);
			return { error: 'Error al registrar la calificación' };
		}
	}
};
