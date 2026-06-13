import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { EvaluationService } from '$lib/server/academic/evaluation-service';
import { GradeStatus } from '@prisma/client';

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
			active: true
		},
		include: {
			subject: true,
			academicTerm: true
		}
	});

	// Obtener evaluaciones abiertas del docente
	const evaluations = await prisma.evaluation.findMany({
		where: {
			createdByUserId: locals.user.id,
			isClosed: false,
			subjectId: {
				in: subjects.map((s) => s.id)
			}
		},
		include: {
			subject: true,
			commission: true
		},
		orderBy: { evaluationDate: 'desc' },
		take: 50
	});

	// Obtener alumnos inscriptos en las comisiones del docente
	const commissionIds = commissions.map((c) => c.id);
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			commissionId: { in: commissionIds }
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
			career: c.careerId,
			academicTerm: c.academicTerm?.name || 'Sin período'
		})),
		evaluations: evaluations.map((e) => ({
			id: e.id,
			title: e.title,
			type: e.type,
			evaluationDate: e.evaluationDate,
			maxScore: e.maxScore,
			minPassingScore: e.minPassingScore,
			weight: e.weight,
			subject: e.subject.name,
			commissionId: e.commissionId,
			isClosed: e.isClosed
		})),
		students: enrollments.map((en) => ({
			id: en.student.id,
			dni: en.student.dni,
			firstName: en.student.firstName,
			lastName: en.student.lastName,
			commissionId: en.commissionId
		})),
		existingGrades: existingGrades.map((g) => ({
			id: g.id,
			studentId: g.studentId,
			evaluationId: g.evaluationId,
			value: g.value,
			status: g.status,
			observations: g.observations
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

			// Obtener evaluación para validaciones adicionales
			const evaluation = await prisma.evaluation.findUnique({
				where: { id: evaluationId },
				include: {
					subject: true,
					commission: true
				}
			});

			if (!evaluation) {
				return { error: 'Evaluación no encontrada' };
			}

			// Obtener alumnos inscriptos en la comisión de la evaluación
			let enrolledStudents;
			if (evaluation.commissionId) {
				enrolledStudents = await prisma.subjectEnrollment.findMany({
					where: {
						commissionId: evaluation.commissionId,
						status: 'ACTIVE'
					},
					include: {
						student: {
							include: { user: true }
						}
					}
				});
			} else {
				// Si no hay comisión, obtener todos los alumnos de la materia
				enrolledStudents = await prisma.subjectEnrollment.findMany({
					where: {
						subjectId: evaluation.subjectId,
						status: 'ACTIVE'
					},
					include: {
						student: {
							include: { user: true }
						}
					}
				});
			}

			// Parsear datos de calificaciones del formulario
			const gradesMap = new Map<
				string,
				{ status: string; value: string | null; observations: string }
			>();
			for (const [key, value] of data.entries()) {
				if (key.startsWith('grades[')) {
					const match = key.match(/grades\[([^\]]+)\]\.(status|value|observations)/);
					if (match) {
						const studentId = match[1];
						const field = match[2];
						if (!gradesMap.has(studentId)) {
							gradesMap.set(studentId, { status: 'PRESENT', value: null, observations: '' });
						}
						const current = gradesMap.get(studentId)!;
						if (field === 'status') {
							current.status = value.toString();
						} else if (field === 'value') {
							current.value = value.toString() === '' ? null : value.toString();
						} else if (field === 'observations') {
							current.observations = value.toString();
						}
					}
				}
			}

			// Validación del lote completo
			const validationErrors: Array<{ studentId: string; error: string }> = [];
			const validGrades: Array<{
				studentId: string;
				status: GradeStatus;
				value: number | null;
				observations: string | undefined;
			}> = [];

			for (const [studentId, gradeData] of gradesMap.entries()) {
				// Validar que el alumno esté inscripto
				const enrollment = enrolledStudents.find((e) => e.studentId === studentId);
				if (!enrollment) {
					validationErrors.push({
						studentId,
						error: 'Alumno no inscripto en esta materia/comisión'
					});
					continue;
				}

				// Validar reglas de estado
				if (gradeData.status === 'PRESENT' && gradeData.value === null) {
					validationErrors.push({
						studentId,
						error: 'PRESENT requiere una nota'
					});
					continue;
				}

				if (
					(gradeData.status === 'ABSENT' || gradeData.status === 'EXCUSED') &&
					gradeData.value !== null
				) {
					validationErrors.push({
						studentId,
						error: 'ABSENT y EXCUSED requieren nota null'
					});
					continue;
				}

				// Validar rango de nota
				if (gradeData.value !== null) {
					const valueNum = Number(gradeData.value);
					const maxScoreNum = Number(evaluation.maxScore);
					if (isNaN(valueNum) || valueNum < 0 || valueNum > maxScoreNum) {
						validationErrors.push({
							studentId,
							error: `Nota debe estar entre 0 y ${maxScoreNum}`
						});
						continue;
					}
				}

				// Validar estado válido
				if (!['PRESENT', 'ABSENT', 'EXCUSED'].includes(gradeData.status)) {
					validationErrors.push({
						studentId,
						error: 'Estado inválido'
					});
					continue;
				}

				// Si pasa todas las validaciones, agregar a la lista de válidos
				validGrades.push({
					studentId,
					status: gradeData.status as GradeStatus,
					value: gradeData.value !== null ? Number(gradeData.value) : null,
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

			// Delegar al servicio
			const result = await evaluationService.loadGradesBatch({
				evaluationId,
				grades: validGrades.map(g => ({
					...g,
					observations: g.observations || undefined
				})),
				userId: locals.user.id
			});

			if ('error' in result) {
				return result;
			}

			return {
				success: `Cargadas exitosamente ${result.length} calificaciones`,
				results: result.map((g) => ({ studentId: g.studentId, status: 'success', gradeId: g.id }))
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
		const observations = data.get('observations')?.toString();

		if (!gradeId) {
			return { error: 'ID de calificación requerido' };
		}

		try {
			const evaluationService = new EvaluationService(prisma);

			// Validar que se puede editar
			const validation = await evaluationService.canEditGrade(gradeId, locals.user.id);
			if (validation) {
				return validation;
			}

			// Validar reglas de estado
			if (status === 'PRESENT' && (!value || value === 'null')) {
				return { error: 'PRESENT requiere una nota' };
			}

			if ((status === 'ABSENT' || status === 'EXCUSED') && value && value !== 'null') {
				return { error: 'ABSENT y EXCUSED requieren nota null' };
			}

			// Delegar al servicio
			const result = await evaluationService.editGrade({
				gradeId,
				status: status as GradeStatus,
				value: value && value !== 'null' ? parseFloat(value) : null,
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
