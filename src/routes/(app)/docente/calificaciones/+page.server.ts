import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { EvaluationService } from '$lib/server/academic/evaluation-service';
import { GradeStatus, QualitativeGrade } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener localidades permitidas para el docente
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id }
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las materias asignadas al docente, filtrando por localidades permitidas
	const subjectTeachers = await prisma.subjectTeacher.findMany({
		where: { teacherId: teacher.id },
		include: {
			subject: {
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
				}
			}
		}
	});

	const subjects = subjectTeachers.map((st) => st.subject);

	// Obtener comisiones del docente
	const commissions = await prisma.subjectCommission.findMany({
		where: {
			teacherId: teacher.id,
			active: true,
			locationId: { in: allowedLocationIds }
		},
		include: {
			subject: true,
			academicTerm: true,
			career: true,
			location: true
		}
	});

	const commissionIds = commissions.map((commission) => commission.id);

	// Obtener evaluaciones de las comisiones asignadas. Las cerradas se envían
	// para consulta, pero la pantalla solo permite editar las abiertas.
	const evaluations = await prisma.evaluation.findMany({
		where: {
			commissionId: { in: commissionIds }
		},
		include: {
			subject: true,
			commission: true
		},
		orderBy: { evaluationDate: 'desc' },
		take: 50
	});

	// Obtener únicamente inscripciones activas.
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			commissionId: { in: commissionIds },
			status: 'ACTIVE'
		},
		include: {
			student: {
				include: {
					user: true
				}
			}
		}
	});

	// Obtener calificaciones existentes para las evaluaciones del docente
	const evaluationIds = evaluations.map((e) => e.id);
	const existingGrades = await prisma.grade.findMany({
		where: {
			evaluationId: { in: evaluationIds }
		},
		include: {
			evaluation: true,
			student: {
				include: {
					user: true
				}
			}
		}
	});

	return {
		subjects: subjects.map((s) => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map((cs) => cs.career.name)
		})),
		commissions: commissions.map((c) => ({
			id: c.id,
			code: c.code,
			name: c.code,
			subject: c.subject.name,
			career: c.career?.name || 'Sin carrera',
			location: c.location?.name || 'Sin sede',
			academicTerm: c.academicTerm?.name || 'Sin período'
		})),
		evaluations: evaluations.map((e) => ({
			id: e.id,
			title: e.title,
			type: e.type,
			evaluationDate: e.evaluationDate,
			maxScore: Number(e.maxScore),
			minPassingScore: Number(e.minPassingScore),
			gradingMode: e.gradingMode,
			participatesInAverage: e.participatesInAverage,
			mandatory: e.mandatory,
			subject: e.subject.name,
			commissionId: e.commissionId,
			isClosed: e.isClosed
		})),
		students: enrollments.map((en) => ({
			id: en.id,
			enrollmentId: en.id,
			studentId: en.student.id,
			dni: en.student.dni,
			firstName: en.student.firstName,
			lastName: en.student.lastName,
			commissionId: en.commissionId
		})),
		existingGrades: existingGrades.map((g) => ({
			id: g.id,
			studentId: g.studentId,
			evaluationId: g.evaluationId,
			value: g.value === null ? null : Number(g.value),
			qualitativeValue: g.qualitativeValue,
			status: g.status,
			observations: g.observations,
			subjectEnrollmentId: g.subjectEnrollmentId
		}))
	};
};

export const actions: Actions = {
	// Carga masiva de calificaciones para una evaluación
	loadGrades: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const evaluationId = data.get('evaluationId')?.toString();

		if (!evaluationId) {
			return { error: 'ID de evaluación requerido' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			// Validar que se puede cargar calificaciones
			const validation = await evaluationService.canLoadGrades(evaluationId, locals.user.id);
			if (validation) {
				return validation;
			}

			// Verificar el contexto institucional actual de la evaluación.
			const evaluation = await prisma.evaluation.findUnique({
				where: { id: evaluationId },
				select: {
					maxScore: true,
					gradingMode: true,
					commissionId: true,
					commission: { select: { locationId: true } }
				}
			});

			if (!evaluation) {
				return { error: 'Evaluación no encontrada' };
			}

			if (!evaluation.commissionId) {
				return { error: 'La evaluación no tiene una comisión asociada' };
			}

			const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);
			if (
				evaluation.commission?.locationId &&
				!allowedLocationIds.includes(evaluation.commission.locationId)
			) {
				return { error: 'No tenés permiso para cargar notas en esta sede' };
			}

			// Parsear únicamente filas modificadas. El identificador del formulario
			// es la inscripción, no el alumno aislado.
			const gradesMap = new Map<
				string,
				{
					dirty: boolean;
					status: string;
					value: string | null;
					qualitativeValue: string | null;
					observations: string;
				}
			>();
			for (const [key, value] of data.entries()) {
				if (key.startsWith('grades[')) {
					const match = key.match(
						/grades\[([^\]]+)\]\.(dirty|status|value|qualitativeValue|observations)/
					);
					if (match) {
						const enrollmentId = match[1];
						const field = match[2];
						if (!gradesMap.has(enrollmentId)) {
							gradesMap.set(enrollmentId, {
								dirty: false,
								status: 'PENDING',
								value: null,
								qualitativeValue: null,
								observations: ''
							});
						}
						const current = gradesMap.get(enrollmentId)!;
						if (field === 'dirty') {
							current.dirty = value.toString() === 'true';
						} else if (field === 'status') {
							current.status = value.toString();
						} else if (field === 'value') {
							current.value = value.toString() === '' ? null : value.toString();
						} else if (field === 'qualitativeValue') {
							current.qualitativeValue = value.toString() === '' ? null : value.toString();
						} else if (field === 'observations') {
							current.observations = value.toString();
						}
					}
				}
			}

			// Validación del lote completo
			const validationErrors: Array<{ enrollmentId: string; error: string }> = [];
			const validGrades: Array<{
				subjectEnrollmentId: string;
				status: GradeStatus;
				value: number | null;
				qualitativeValue: QualitativeGrade | null;
				observations: string | undefined;
			}> = [];

			for (const [enrollmentId, gradeData] of gradesMap.entries()) {
				if (!gradeData.dirty) continue;

				if (!['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'].includes(gradeData.status)) {
					validationErrors.push({
						enrollmentId,
						error: 'Estado inválido'
					});
					continue;
				}

				const numericValue = gradeData.value === null ? null : Number(gradeData.value);
				if (numericValue !== null && !Number.isFinite(numericValue)) {
					validationErrors.push({ enrollmentId, error: 'La nota ingresada no es válida' });
					continue;
				}
				if (
					gradeData.qualitativeValue !== null &&
					!Object.values(QualitativeGrade).includes(gradeData.qualitativeValue as QualitativeGrade)
				) {
					validationErrors.push({ enrollmentId, error: 'El resultado cualitativo no es válido' });
					continue;
				}

				validGrades.push({
					subjectEnrollmentId: enrollmentId,
					status: gradeData.status as GradeStatus,
					value: numericValue,
					qualitativeValue: gradeData.qualitativeValue as QualitativeGrade | null,
					observations: gradeData.observations || undefined
				});
			}

			// Si hay errores de validación, no guardar nada
			if (validationErrors.length > 0) {
				return {
					error: 'Hay errores de validación. No se guardó ninguna calificación.',
					errors: validationErrors
				};
			}
			if (validGrades.length === 0) {
				return { error: 'No hay cambios para guardar' };
			}

			// Delegar al servicio
			const result = await evaluationService.loadGradesBatch({
				evaluationId,
				grades: validGrades,
				userId: locals.user.id
			});

			if ('error' in result) {
				return result;
			}

			return {
				success: `Cargadas exitosamente ${result.length} calificaciones`,
				results: result.map((g) => ({
					subjectEnrollmentId: g.subjectEnrollmentId,
					status: 'success',
					gradeId: g.id
				}))
			};
		} catch (error) {
			console.error('Error en carga masiva:', error);
			return { error: 'Error al procesar la carga masiva. Ninguna calificación fue guardada.' };
		}
	},

	// Edición individual de calificación
	editGrade: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const gradeId = data.get('gradeId')?.toString();
		const status = data.get('status')?.toString();
		const value = data.get('value')?.toString();
		const qualitativeValue = data.get('qualitativeValue')?.toString();
		const observations = data.get('observations')?.toString();

		if (!gradeId || !status || !['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'].includes(status)) {
			return { error: 'Calificación o estado inválido' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			// Validar que se puede editar
			const validation = await evaluationService.canEditGrade(gradeId, locals.user.id);
			if (validation) {
				return validation;
			}

			// Delegar al servicio
			const result = await evaluationService.editGrade({
				gradeId,
				status: status as GradeStatus,
				value: value && value !== 'null' ? parseFloat(value) : null,
				qualitativeValue:
					qualitativeValue && qualitativeValue !== 'null'
						? (qualitativeValue as QualitativeGrade)
						: null,
				observations: observations || undefined,
				userId: locals.user.id
			});

			if ('error' in result) {
				return result;
			}

			return { success: 'Calificación actualizada exitosamente' };
		} catch (error) {
			console.error('Error al editar calificación:', error);
			return { error: 'Error al editar la calificación' };
		}
	},

	// Eliminación de calificación
	deleteGrade: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const gradeId = data.get('gradeId')?.toString();

		if (!gradeId) {
			return { error: 'ID de calificación requerido' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			// Validar que se puede eliminar
			const validation = await evaluationService.canDeleteGrade(gradeId, locals.user.id);
			if (validation) {
				return validation;
			}

			// Delegar al servicio
			await evaluationService.deleteGrade({
				gradeId,
				userId: locals.user.id
			});

			return { success: 'Calificación eliminada exitosamente' };
		} catch (error) {
			console.error('Error al eliminar calificación:', error);
			return { error: 'Error al eliminar la calificación' };
		}
	}
};
