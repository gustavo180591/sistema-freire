import { json, type RequestEvent } from '@sveltejs/kit';
import { requireRole } from '$lib/server/auth/authorization';
import { teacherAcademicService } from '$lib/server/academic/teacher-academic-service';

export async function POST({ request, locals }: RequestEvent) {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		return json({ error: 'No autenticado' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { commissionId } = body;

		if (!commissionId) {
			return json({ error: 'Commission ID requerido' }, { status: 400 });
		}

		const teacher = await teacherAcademicService.getCurrentTeacherForUser(locals.user.id);
		if (!teacher) {
			return json({ error: 'Docente no encontrado' }, { status: 404 });
		}

		// Verify teacher can access this commission
		await teacherAcademicService.assertTeacherCanAccessCommission(teacher.id, commissionId);

		const students = await teacherAcademicService.getCommissionStudents(commissionId);

		return json({ students });
	} catch (error) {
		console.error('Error loading commission students:', error);
		return json({ error: 'Error al cargar estudiantes' }, { status: 500 });
	}
}
