import { isHttpError, json, type RequestEvent } from '@sveltejs/kit';
import { requireRole } from '$lib/server/auth/authorization';
import { teacherAcademicService } from '$lib/server/academic/teacher-academic-service';
import { gradeService } from '$lib/server/academic/grade-service';

export async function POST({ request, locals }: RequestEvent) {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		return json({ error: 'No autenticado' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { evaluationId } = body;

		if (!evaluationId) {
			return json({ error: 'Evaluation ID requerido' }, { status: 400 });
		}

		const teacher = await teacherAcademicService.getCurrentTeacherForUser(locals.user.id);

		if (!teacher) {
			return json({ error: 'Docente no encontrado' }, { status: 404 });
		}

		const evaluation = await gradeService.getEvaluationWithGrades(evaluationId, teacher.id);

		return json({ evaluation });
	} catch (err) {
		if (isHttpError(err)) {
			return json(
				{
					error: err.body.message
				},
				{
					status: err.status
				}
			);
		}

		console.error('Error loading evaluation grades:', err);

		return json(
			{
				error: 'Error al cargar calificaciones'
			},
			{
				status: 500
			}
		);
	}
}
