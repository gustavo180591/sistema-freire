import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole, getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

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
			// Verificar que la evaluación pertenezca al docente
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

			if (evaluation.createdByUserId !== locals.user.id) {
				return { error: 'No tenés permiso para cargar calificaciones en esta evaluación' };
			}

			if (evaluation.isClosed) {
				return { error: 'La evaluación está cerrada y no acepta nuevas calificaciones' };
			}

			// Verificar que la materia pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id }
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const subjectTeacher = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId: evaluation.subjectId,
						teacherId: teacher.id
					}
				}
			});

			if (!subjectTeacher) {
				return { error: 'No tenés permiso para cargar calificaciones en esta materia' };
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

			const results = [];
			const errors = [];

			// Procesar cada calificación del Map
			for (const [studentId, gradeData] of gradesMap.entries()) {
				try {
					// Validar que el alumno esté inscripto
					const enrollment = enrolledStudents.find((e) => e.studentId === studentId);
					if (!enrollment) {
						errors.push({
							studentId: studentId,
							error: 'Alumno no inscripto en esta materia/comisión'
						});
						continue;
					}

					// Validar reglas de estado
					if (gradeData.status === 'PRESENT' && gradeData.value === null) {
						errors.push({
							studentId: studentId,
							error: 'PRESENT requiere una nota'
						});
						continue;
					}

					if (
						(gradeData.status === 'ABSENT' || gradeData.status === 'EXCUSED') &&
						gradeData.value !== null
					) {
						errors.push({
							studentId: studentId,
							error: 'ABSENT y EXCUSED requieren nota null'
						});
						continue;
					}

					// Validar rango de nota
					if (gradeData.value !== null) {
						const valueNum = Number(gradeData.value);
						const maxScoreNum = Number(evaluation.maxScore);
						if (valueNum < 0 || valueNum > maxScoreNum) {
							errors.push({
								studentId: studentId,
								error: `Nota debe estar entre 0 y ${maxScoreNum}`
							});
							continue;
						}
					}

					// Upsert calificación
					const grade = await prisma.grade.upsert({
						where: {
							evaluationId_studentId: {
								evaluationId: evaluation.id,
								studentId: studentId
							}
						},
						create: {
							evaluationId: evaluation.id,
							studentId: studentId,
							status: gradeData.status as 'PRESENT' | 'ABSENT' | 'EXCUSED',
							value: gradeData.value !== null ? Number(gradeData.value) : null,
							observations: gradeData.observations || null,
							createdByUserId: locals.user.id
						},
						update: {
							status: gradeData.status as 'PRESENT' | 'ABSENT' | 'EXCUSED',
							value: gradeData.value !== null ? Number(gradeData.value) : null,
							observations: gradeData.observations || null,
							updatedByUserId: locals.user.id
						}
					});

					results.push({
						studentId: studentId,
						status: 'success'
					});

					// Registrar en auditoría
					await auditLog({
						userId: locals.user.id,
						action: AuditAction.CREATE,
						entityType: 'GRADE',
						entityId: grade.id,
						description: `Carga de calificación: ${gradeData.status} ${gradeData.value || ''} para alumno ${studentId} en evaluación ${evaluation.title}`
					});
				} catch (error) {
					console.error(`Error al cargar calificación para alumno ${studentId}:`, error);
					errors.push({
						studentId: studentId,
						error: 'Error al procesar calificación'
					});
				}
			}

			return {
				success: `Procesadas ${results.length} calificaciones con ${errors.length} errores`,
				results,
				errors
			};
		} catch (error) {
			console.error('Error en carga masiva:', error);
			return { error: 'Error al procesar la carga masiva' };
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
			// Verificar que la calificación pertenezca al docente
			const existingGrade = await prisma.grade.findUnique({
				where: { id: gradeId },
				include: {
					evaluation: true,
					student: {
						include: { user: true }
					}
				}
			});

			if (!existingGrade) {
				return { error: 'Calificación no encontrada' };
			}

			if (existingGrade.createdByUserId !== locals.user.id) {
				return { error: 'No tenés permiso para editar esta calificación' };
			}

			if (existingGrade.evaluation.isClosed) {
				return { error: 'La evaluación está cerrada y no acepta ediciones' };
			}

			// Validar reglas de estado
			if (status === 'PRESENT' && (!value || value === 'null')) {
				return { error: 'PRESENT requiere una nota' };
			}

			if ((status === 'ABSENT' || status === 'EXCUSED') && value && value !== 'null') {
				return { error: 'ABSENT y EXCUSED requieren nota null' };
			}

			// Actualizar calificación
			await prisma.grade.update({
				where: { id: gradeId },
				data: {
					status: status as any, // Type cast until Prisma Client is regenerated
					value: value && value !== 'null' ? parseFloat(value) : null,
					observations: observations || null,
					updatedByUserId: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'GRADE',
				entityId: gradeId,
				description: `Edición de calificación: ${status} ${value || ''} para ${existingGrade.student.firstName} ${existingGrade.student.lastName} en ${existingGrade.evaluation.title}`
			});

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
			// Verificar que la calificación pertenezca al docente
			const existingGrade = await prisma.grade.findUnique({
				where: { id: gradeId },
				include: {
					evaluation: true,
					student: {
						include: { user: true }
					}
				}
			});

			if (!existingGrade) {
				return { error: 'Calificación no encontrada' };
			}

			if (existingGrade.createdByUserId !== locals.user.id) {
				return { error: 'No tenés permiso para eliminar esta calificación' };
			}

			if (existingGrade.evaluation.isClosed) {
				return { error: 'La evaluación está cerrada y no acepta eliminaciones' };
			}

			// Eliminar calificación
			await prisma.grade.delete({
				where: { id: gradeId }
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.DELETE,
				entityType: 'GRADE',
				entityId: gradeId,
				description: `Eliminación de calificación para ${existingGrade.student.firstName} ${existingGrade.student.lastName} en ${existingGrade.evaluation.title}`
			});

			return { success: 'Calificación eliminada exitosamente' };
		} catch (error) {
			console.error('Error al eliminar calificación:', error);
			return { error: 'Error al eliminar la calificación' };
		}
	}
};
