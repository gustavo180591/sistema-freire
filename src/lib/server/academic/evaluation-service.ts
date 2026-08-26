import {
	PrismaClient,
	GradeStatus,
	EvaluationType,
	AuditAction,
	GradingMode,
	QualitativeGrade
} from '@prisma/client';
import { updateCourseResult, updateStudentSubjectStatus } from './plan-logic';
import { auditLog } from '$lib/server/audit';

export interface EvaluationValidationError {
	error: string;
}

export interface EvaluationCloseData {
	evaluationId: string;
	userId: string;
	reason?: string;
}

export interface EvaluationReopenData {
	evaluationId: string;
	userId: string;
	reason?: string;
}

export interface CreateEvaluationData {
	subjectId: string;
	commissionId?: string;
	careerId?: string;
	locationId?: string;
	title: string;
	description?: string;
	type: EvaluationType;
	evaluationDate: Date;
	maxScore: number;
	minPassingScore?: number;
	gradingMode?: GradingMode;
	participatesInAverage?: boolean;
	mandatory?: boolean;
	displayOrder?: number;
	/** @deprecated Se conserva solo para compatibilidad durante la transición. */
	weight?: number;
	parentEvaluationId?: string;
	userId: string;
}

export interface UpdateEvaluationData {
	evaluationId: string;
	title: string;
	description?: string;
	evaluationDate: Date;
	maxScore: number;
	minPassingScore: number;
	participatesInAverage: boolean;
	mandatory: boolean;
	userId: string;
}

export interface DeleteEvaluationData {
	evaluationId: string;
	userId: string;
}

export interface LoadGradesBatchData {
	evaluationId: string;
	grades: Array<{
		subjectEnrollmentId: string;
		value: number | null;
		qualitativeValue?: QualitativeGrade | null;
		status: GradeStatus;
		observations?: string;
	}>;
	userId: string;
}

export interface EditGradeData {
	gradeId: string;
	value: number | null;
	qualitativeValue?: QualitativeGrade | null;
	status: GradeStatus;
	observations?: string;
	userId: string;
}

export interface DeleteGradeData {
	gradeId: string;
	userId: string;
}

function validateGradeResult(input: {
	status: GradeStatus;
	value: number | null;
	qualitativeValue?: QualitativeGrade | null;
	gradingMode: GradingMode;
	maxScore: number;
}): string | null {
	const qualitativeValue = input.qualitativeValue ?? null;

	if (input.status !== GradeStatus.PRESENT) {
		if (input.value !== null || qualitativeValue !== null) {
			return 'Pendiente, ausente y justificado no deben tener resultado';
		}
		return null;
	}

	if (input.gradingMode === GradingMode.NUMERIC) {
		if (input.value === null) return 'La calificación numérica requiere una nota';
		if (qualitativeValue !== null) return 'Una evaluación numérica no admite resultado cualitativo';
		if (!Number.isFinite(input.value) || input.value < 0 || input.value > input.maxScore) {
			return `La nota debe estar entre 0 y ${input.maxScore}`;
		}
		return null;
	}

	if (input.value !== null) return 'Una evaluación cualitativa no admite nota numérica';
	if (qualitativeValue === null) return 'La calificación cualitativa requiere AP o DES';
	return null;
}

export class EvaluationService {
	constructor(private prisma: PrismaClient) {}

	/**
	 * Verifica si una evaluación está cerrada
	 */
	async isEvaluationClosed(evaluationId: string): Promise<boolean> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true }
		});
		return evaluation?.isClosed ?? false;
	}

	/**
	 * Verifica si el usuario tiene permiso para modificar la evaluación
	 */
	async canUserModifyEvaluation(evaluationId: string, userId: string): Promise<boolean> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { commissionId: true, subjectId: true }
		});

		if (!evaluation) return false;

		const teacher = await this.prisma.teacher.findUnique({
			where: { userId },
			select: { id: true }
		});
		if (!teacher) return false;

		if (evaluation.commissionId) {
			const commission = await this.prisma.subjectCommission.findFirst({
				where: {
					id: evaluation.commissionId,
					teacherId: teacher.id,
					active: true
				},
				select: { id: true }
			});
			return Boolean(commission);
		}

		const assignment = await this.prisma.subjectTeacher.findUnique({
			where: {
				subjectId_teacherId: {
					subjectId: evaluation.subjectId,
					teacherId: teacher.id
				}
			},
			select: { subjectId: true }
		});
		return Boolean(assignment);
	}

	/**
	 * Valida que se puede cargar calificaciones en una evaluación
	 */
	async canLoadGrades(
		evaluationId: string,
		userId: string
	): Promise<EvaluationValidationError | null> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		if (!(await this.canUserModifyEvaluation(evaluationId, userId))) {
			return { error: 'No tenés permiso para cargar calificaciones en esta evaluación' };
		}

		if (evaluation.isClosed) {
			return { error: 'La evaluación está cerrada y no acepta nuevas calificaciones' };
		}

		return null;
	}

	/**
	 * Valida que se puede editar una calificación
	 */
	async canEditGrade(gradeId: string, userId: string): Promise<EvaluationValidationError | null> {
		const grade = await this.prisma.grade.findUnique({
			where: { id: gradeId },
			include: {
				evaluation: {
					select: { isClosed: true }
				}
			}
		});

		if (!grade) {
			return { error: 'Calificación no encontrada' };
		}

		if (!(await this.canUserModifyEvaluation(grade.evaluationId, userId))) {
			return { error: 'No tenés permiso para editar esta calificación' };
		}

		if (grade.evaluation.isClosed) {
			return { error: 'La evaluación está cerrada y no acepta ediciones' };
		}

		return null;
	}

	/**
	 * Valida que se puede eliminar una calificación
	 */
	async canDeleteGrade(gradeId: string, userId: string): Promise<EvaluationValidationError | null> {
		const grade = await this.prisma.grade.findUnique({
			where: { id: gradeId },
			include: {
				evaluation: {
					select: { isClosed: true }
				}
			}
		});

		if (!grade) {
			return { error: 'Calificación no encontrada' };
		}

		if (!(await this.canUserModifyEvaluation(grade.evaluationId, userId))) {
			return { error: 'No tenés permiso para eliminar esta calificación' };
		}

		if (grade.evaluation.isClosed) {
			return { error: 'La evaluación está cerrada y no acepta eliminaciones' };
		}

		return null;
	}

	/**
	 * Cierra una evaluación
	 */
	async closeEvaluation(data: EvaluationCloseData): Promise<void> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: data.evaluationId },
			select: { title: true }
		});

		await this.prisma.evaluation.update({
			where: { id: data.evaluationId },
			data: {
				isClosed: true,
				closedAt: new Date(),
				closedByUserId: data.userId,
				closedReason: data.reason || null
			}
		});

		// Auditoría
		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'Evaluation',
			entityId: data.evaluationId,
			description: `Cerró evaluación "${evaluation?.title}"${data.reason ? `: ${data.reason}` : ''}`,
			userId: data.userId,
			metadata: {
				reason: data.reason
			}
		});
	}

	/**
	 * Reabre una evaluación
	 */
	async reopenEvaluation(data: EvaluationReopenData): Promise<void> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: data.evaluationId },
			select: { title: true }
		});

		await this.prisma.evaluation.update({
			where: { id: data.evaluationId },
			data: {
				isClosed: false,
				closedAt: null,
				closedByUserId: null,
				closedReason: null,
				reopenedAt: new Date(),
				reopenedByUserId: data.userId,
				reopenReason: data.reason || null
			}
		});

		// Auditoría
		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'Evaluation',
			entityId: data.evaluationId,
			description: `Reabrió evaluación "${evaluation?.title}"${data.reason ? `: ${data.reason}` : ''}`,
			userId: data.userId,
			metadata: {
				reason: data.reason
			}
		});
	}

	/**
	 * Valida que se puede cerrar una evaluación
	 */
	async canCloseEvaluation(
		evaluationId: string,
		userId: string
	): Promise<EvaluationValidationError | null> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true, mandatory: true, commissionId: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		if (!(await this.canUserModifyEvaluation(evaluationId, userId))) {
			return { error: 'No tenés permiso para cerrar esta evaluación' };
		}

		if (evaluation.isClosed) {
			return { error: 'La evaluación ya está cerrada' };
		}

		if (evaluation.mandatory && evaluation.commissionId) {
			const [activeEnrollments, completedGrades] = await Promise.all([
				this.prisma.subjectEnrollment.count({
					where: { commissionId: evaluation.commissionId, status: 'ACTIVE' }
				}),
				this.prisma.grade.count({
					where: {
						evaluationId,
						status: { not: GradeStatus.PENDING },
						subjectEnrollment: {
							commissionId: evaluation.commissionId,
							status: 'ACTIVE'
						}
					}
				})
			]);

			if (completedGrades < activeEnrollments) {
				return {
					error: `Faltan completar ${activeEnrollments - completedGrades} calificaciones obligatorias`
				};
			}
		}

		return null;
	}

	/**
	 * Valida que se puede reabrir una evaluación
	 */
	async canReopenEvaluation(
		evaluationId: string,
		userId: string
	): Promise<EvaluationValidationError | null> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		if (!(await this.canUserModifyEvaluation(evaluationId, userId))) {
			return { error: 'No tenés permiso para reabrir esta evaluación' };
		}

		if (!evaluation.isClosed) {
			return { error: 'La evaluación ya está abierta' };
		}

		return null;
	}

	/**
	 * Crea una evaluación
	 */
	async createEvaluation(data: CreateEvaluationData) {
		const gradingMode = data.gradingMode || GradingMode.NUMERIC;
		const courseTypes: EvaluationType[] = [
			EvaluationType.PARCIAL,
			EvaluationType.TRABAJO_PRACTICO,
			EvaluationType.INTEGRADOR,
			EvaluationType.RECUPERATORIO,
			EvaluationType.OTRO
		];

		if (courseTypes.includes(data.type) && !data.commissionId) {
			return { error: 'La comisión es obligatoria para una evaluación de cursada' };
		}

		if (data.commissionId) {
			const commission = await this.prisma.subjectCommission.findUnique({
				where: { id: data.commissionId },
				include: { teacher: { select: { userId: true } } }
			});

			if (!commission || !commission.active) {
				return { error: 'Comisión no encontrada o inactiva' };
			}
			if (commission.subjectId !== data.subjectId) {
				return { error: 'La comisión no corresponde a la materia seleccionada' };
			}
			if (commission.teacher?.userId !== data.userId) {
				return { error: 'No tenés permiso para crear evaluaciones en esta comisión' };
			}
		} else {
			const teacherAssignment = await this.prisma.subjectTeacher.findFirst({
				where: {
					subjectId: data.subjectId,
					teacher: { userId: data.userId }
				},
				select: { subjectId: true }
			});
			if (!teacherAssignment) {
				return { error: 'No tenés permiso para crear evaluaciones en esta materia' };
			}
		}

		// Validar evaluación padre si es recuperatorio
		if (data.type === EvaluationType.RECUPERATORIO && !data.parentEvaluationId) {
			return { error: 'El recuperatorio debe indicar la evaluación original' };
		}
		if (data.parentEvaluationId) {
			const parentEvaluation = await this.prisma.evaluation.findUnique({
				where: { id: data.parentEvaluationId },
				select: { subjectId: true, commissionId: true, type: true, gradingMode: true }
			});

			if (!parentEvaluation) {
				return { error: 'Evaluación original no encontrada' };
			}

			if (parentEvaluation.subjectId !== data.subjectId) {
				return {
					error: 'El recuperatorio debe ser de la misma materia que la evaluación original'
				};
			}

			if (parentEvaluation.commissionId !== data.commissionId) {
				return {
					error: 'El recuperatorio debe ser de la misma comisión que la evaluación original'
				};
			}

			const recoverableTypes: EvaluationType[] = [
				EvaluationType.PARCIAL,
				EvaluationType.TRABAJO_PRACTICO,
				EvaluationType.INTEGRADOR
			];
			if (!recoverableTypes.includes(parentEvaluation.type)) {
				return { error: 'La evaluación seleccionada no admite recuperatorio' };
			}
			if (parentEvaluation.gradingMode !== gradingMode) {
				return { error: 'El recuperatorio debe usar la misma modalidad de calificación' };
			}

			const existingRecovery = await this.prisma.evaluation.findFirst({
				where: { parentEvaluationId: data.parentEvaluationId },
				select: { id: true }
			});
			if (existingRecovery) {
				return { error: 'La evaluación original ya tiene un recuperatorio asociado' };
			}
		}

		/*
		 * Toda instancia evaluativa requiere inscripción del alumno.
		 *
		 * La inscripción abre en el momento de crear la evaluación
		 * y permanece disponible exactamente durante 72 horas.
		 */
		if (data.type === EvaluationType.MESA_EXAMEN) {
			if (!data.careerId || !data.locationId) {
				return {
					error: 'Las mesas de examen requieren carrera y sede/localidad'
				};
			}

			const teacher = await this.prisma.teacher.findUnique({
				where: { userId: data.userId },
				select: { id: true }
			});

			if (!teacher) {
				return { error: 'No se encontró el docente asociado al usuario' };
			}

			const subjectAssignment = await this.prisma.subjectTeacher.findFirst({
				where: {
					subjectId: data.subjectId,
					teacherId: teacher.id
				}
			});

			if (!subjectAssignment) {
				return { error: 'No tenés asignada la materia seleccionada' };
			}

			const careerSubject = await this.prisma.careerSubject.findFirst({
				where: {
					careerId: data.careerId,
					subjectId: data.subjectId
				}
			});

			if (!careerSubject) {
				return {
					error: 'La materia seleccionada no pertenece a la carrera indicada'
				};
			}

			const careerAtLocation = await this.prisma.career.findFirst({
				where: {
					id: data.careerId,
					active: true,
					locations: {
						some: {
							locationId: data.locationId
						}
					}
				},
				select: { id: true }
			});

			if (!careerAtLocation) {
				return {
					error: 'La carrera seleccionada no está habilitada en esa sede/localidad'
				};
			}
		}

		const registrationOpensAt = new Date();
		const registrationClosesAt = new Date(registrationOpensAt.getTime() + 72 * 60 * 60 * 1000);

		if (data.evaluationDate <= registrationClosesAt) {
			return {
				error:
					'La fecha de la evaluación debe ser posterior al cierre de las 72 horas de inscripción'
			};
		}

		const averageTypes: EvaluationType[] = [
			EvaluationType.PARCIAL,
			EvaluationType.TRABAJO_PRACTICO,
			EvaluationType.INTEGRADOR
		];
		const participatesInAverage =
			gradingMode === GradingMode.NUMERIC &&
			averageTypes.includes(data.type) &&
			(data.participatesInAverage ?? true);
		const evaluation = await this.prisma.evaluation.create({
			data: {
				subjectId: data.subjectId,
				commissionId: data.type === EvaluationType.MESA_EXAMEN ? null : data.commissionId,
				careerId: data.type === EvaluationType.MESA_EXAMEN ? data.careerId : null,
				locationId: data.type === EvaluationType.MESA_EXAMEN ? data.locationId : null,
				title: data.title,
				description: data.description,
				type: data.type,
				evaluationDate: data.evaluationDate,
				registrationOpensAt,
				registrationClosesAt,
				maxScore: data.maxScore,
				minPassingScore: data.minPassingScore,
				weight: 1,
				gradingMode,
				participatesInAverage,
				mandatory: data.mandatory ?? true,
				displayOrder: data.displayOrder ?? 0,
				parentEvaluationId: data.parentEvaluationId,
				createdByUserId: data.userId
			}
		});

		// Auditoría
		await auditLog({
			action: AuditAction.CREATE,
			entityType: 'Evaluation',
			entityId: evaluation.id,
			description: `Creó evaluación "${evaluation.title}" (${evaluation.type})`,
			userId: data.userId,
			metadata: {
				subjectId: data.subjectId,
				commissionId: data.commissionId,
				type: data.type,
				gradingMode,
				participatesInAverage,
				mandatory: data.mandatory ?? true,
				maxScore: data.maxScore,
				evaluationDate: data.evaluationDate
			}
		});

		return evaluation;
	}

	/**
	 * Edita los datos configurables de una evaluación.
	 * Con calificaciones cargadas solo admite cambios descriptivos.
	 */
	async updateEvaluation(
		data: UpdateEvaluationData
	): Promise<EvaluationValidationError | { id: string }> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: data.evaluationId },
			select: {
				id: true,
				title: true,
				description: true,
				evaluationDate: true,
				maxScore: true,
				minPassingScore: true,
				gradingMode: true,
				type: true,
				participatesInAverage: true,
				mandatory: true,
				isClosed: true,
				_count: { select: { grades: true } }
			}
		});

		if (!evaluation) return { error: 'Evaluación no encontrada' };
		if (!(await this.canUserModifyEvaluation(data.evaluationId, data.userId))) {
			return { error: 'No tenés permiso para editar esta evaluación' };
		}
		if (evaluation.isClosed) {
			return { error: 'La evaluación está cerrada. Reabrila antes de editarla' };
		}

		if (!data.title.trim()) return { error: 'El título es obligatorio' };
		if (Number.isNaN(data.evaluationDate.getTime())) {
			return { error: 'La fecha de evaluación no es válida' };
		}
		if (
			!Number.isFinite(data.maxScore) ||
			data.maxScore <= 0 ||
			!Number.isFinite(data.minPassingScore) ||
			data.minPassingScore < 0 ||
			data.minPassingScore > data.maxScore
		) {
			return { error: 'Revisá el puntaje máximo y la nota mínima de aprobación' };
		}

		const averageTypes: EvaluationType[] = [
			EvaluationType.PARCIAL,
			EvaluationType.TRABAJO_PRACTICO,
			EvaluationType.INTEGRADOR
		];
		const participatesInAverage =
			evaluation.gradingMode === GradingMode.NUMERIC &&
			averageTypes.includes(evaluation.type) &&
			data.participatesInAverage;

		const scoringChanged =
			Number(evaluation.maxScore) !== data.maxScore ||
			Number(evaluation.minPassingScore) !== data.minPassingScore ||
			evaluation.participatesInAverage !== participatesInAverage;

		if (evaluation._count.grades > 0 && scoringChanged) {
			return {
				error:
					'La evaluación ya tiene calificaciones: solo podés editar título, descripción, fecha y obligatoriedad'
			};
		}

		const updated = await this.prisma.evaluation.update({
			where: { id: data.evaluationId },
			data: {
				title: data.title.trim(),
				description: data.description?.trim() || null,
				evaluationDate: data.evaluationDate,
				maxScore: data.maxScore,
				minPassingScore: data.minPassingScore,
				participatesInAverage,
				mandatory: data.mandatory
			},
			select: { id: true }
		});

		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'Evaluation',
			entityId: data.evaluationId,
			description: `Editó evaluación "${data.title.trim()}"`,
			userId: data.userId,
			metadata: {
				before: {
					title: evaluation.title,
					description: evaluation.description,
					evaluationDate: evaluation.evaluationDate,
					maxScore: Number(evaluation.maxScore),
					minPassingScore: Number(evaluation.minPassingScore),
					participatesInAverage: evaluation.participatesInAverage,
					mandatory: evaluation.mandatory
				},
				after: {
					title: data.title.trim(),
					description: data.description?.trim() || null,
					evaluationDate: data.evaluationDate,
					maxScore: data.maxScore,
					minPassingScore: data.minPassingScore,
					participatesInAverage,
					mandatory: data.mandatory
				}
			}
		});

		return updated;
	}

	/**
	 * Elimina una evaluación abierta que todavía no tenga información dependiente.
	 */
	async deleteEvaluation(
		data: DeleteEvaluationData
	): Promise<EvaluationValidationError | { id: string }> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: data.evaluationId },
			select: {
				id: true,
				title: true,
				isClosed: true,
				_count: { select: { grades: true, recoveryEvaluations: true } }
			}
		});

		if (!evaluation) return { error: 'Evaluación no encontrada' };
		if (!(await this.canUserModifyEvaluation(data.evaluationId, data.userId))) {
			return { error: 'No tenés permiso para eliminar esta evaluación' };
		}
		if (evaluation.isClosed) {
			return { error: 'La evaluación está cerrada. Reabrila antes de eliminarla' };
		}
		if (evaluation._count.grades > 0) {
			return { error: 'No se puede eliminar porque ya tiene calificaciones cargadas' };
		}
		if (evaluation._count.recoveryEvaluations > 0) {
			return { error: 'No se puede eliminar porque tiene un recuperatorio asociado' };
		}

		await this.prisma.evaluation.delete({ where: { id: data.evaluationId } });

		await auditLog({
			action: AuditAction.DELETE,
			entityType: 'Evaluation',
			entityId: data.evaluationId,
			description: `Eliminó evaluación "${evaluation.title}"`,
			userId: data.userId
		});

		return { id: evaluation.id };
	}

	/**
	 * Carga calificaciones en lote con transacción
	 */
	async loadGradesBatch(data: LoadGradesBatchData) {
		const validation = await this.canLoadGrades(data.evaluationId, data.userId);
		if (validation) {
			return validation;
		}

		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: data.evaluationId },
			select: {
				subjectId: true,
				commissionId: true,
				maxScore: true,
				gradingMode: true,
				title: true
			}
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}
		if (!evaluation.commissionId) {
			return { error: 'La evaluación debe pertenecer a una comisión para cargar la cursada' };
		}
		if (data.grades.length === 0) {
			return { error: 'No hay cambios de calificaciones para guardar' };
		}

		const enrollmentIds = [...new Set(data.grades.map((grade) => grade.subjectEnrollmentId))];
		const enrollments = await this.prisma.subjectEnrollment.findMany({
			where: {
				id: { in: enrollmentIds },
				commissionId: evaluation.commissionId,
				subjectId: evaluation.subjectId,
				status: 'ACTIVE'
			},
			select: { id: true, studentId: true }
		});

		if (enrollments.length !== enrollmentIds.length) {
			return { error: 'Una o más inscripciones no pertenecen a la comisión activa' };
		}

		const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));
		for (const gradeData of data.grades) {
			const gradeError = validateGradeResult({
				status: gradeData.status,
				value: gradeData.value,
				qualitativeValue: gradeData.qualitativeValue,
				gradingMode: evaluation.gradingMode,
				maxScore: Number(evaluation.maxScore)
			});
			if (gradeError) return { error: gradeError };
		}

		const { result, changes } = await this.prisma.$transaction(async (tx) => {
			const createdGrades = [];
			const changes: Array<Record<string, unknown>> = [];
			const existingGrades = await tx.grade.findMany({
				where: {
					evaluationId: data.evaluationId,
					studentId: { in: enrollments.map((enrollment) => enrollment.studentId) }
				}
			});
			const existingByStudent = new Map(existingGrades.map((grade) => [grade.studentId, grade]));

			for (const gradeData of data.grades) {
				const enrollment = enrollmentById.get(gradeData.subjectEnrollmentId)!;
				const existing = existingByStudent.get(enrollment.studentId);
				const grade = existing
					? await tx.grade.update({
							where: { id: existing.id },
							data: {
								subjectEnrollmentId: enrollment.id,
								value: gradeData.value,
								qualitativeValue: gradeData.qualitativeValue ?? null,
								status: gradeData.status,
								observations: gradeData.observations,
								updatedByUserId: data.userId
							}
						})
					: await tx.grade.create({
							data: {
								evaluationId: data.evaluationId,
								studentId: enrollment.studentId,
								subjectEnrollmentId: enrollment.id,
								value: gradeData.value,
								qualitativeValue: gradeData.qualitativeValue ?? null,
								status: gradeData.status,
								observations: gradeData.observations,
								createdByUserId: data.userId
							}
						});

				createdGrades.push(grade);
				changes.push({
					subjectEnrollmentId: enrollment.id,
					studentId: enrollment.studentId,
					before: existing
						? {
								value: existing.value === null ? null : Number(existing.value),
								qualitativeValue: existing.qualitativeValue,
								status: existing.status,
								observations: existing.observations
							}
						: null,
					after: {
						value: grade.value === null ? null : Number(grade.value),
						qualitativeValue: grade.qualitativeValue,
						status: grade.status,
						observations: grade.observations
					}
				});
			}

			for (const enrollment of enrollments) {
				await updateCourseResult(enrollment.id, tx);
				await updateStudentSubjectStatus(enrollment.studentId, evaluation.subjectId, tx);
			}

			return { result: createdGrades, changes };
		});

		// Auditoría
		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'Evaluation',
			entityId: data.evaluationId,
			description: `Cargó ${data.grades.length} calificaciones en evaluación "${evaluation.title}"`,
			userId: data.userId,
			metadata: {
				subjectId: evaluation.subjectId,
				commissionId: evaluation.commissionId,
				gradesCount: data.grades.length,
				changes
			}
		});

		return result;
	}

	/**
	 * Edita una calificación
	 */
	async editGrade(data: EditGradeData) {
		const validation = await this.canEditGrade(data.gradeId, data.userId);
		if (validation) {
			return validation;
		}

		const grade = await this.prisma.grade.findUnique({
			where: { id: data.gradeId },
			include: { evaluation: true }
		});

		if (!grade) {
			return { error: 'Calificación no encontrada' };
		}

		const gradeError = validateGradeResult({
			status: data.status,
			value: data.value,
			qualitativeValue: data.qualitativeValue,
			gradingMode: grade.evaluation.gradingMode,
			maxScore: Number(grade.evaluation.maxScore)
		});
		if (gradeError) return { error: gradeError };

		const oldValue = {
			value: grade.value === null ? null : Number(grade.value),
			qualitativeValue: grade.qualitativeValue,
			status: grade.status,
			observations: grade.observations
		};

		const result = await this.prisma.$transaction(async (tx) => {
			const updatedGrade = await tx.grade.update({
				where: { id: data.gradeId },
				data: {
					value: data.value,
					qualitativeValue: data.qualitativeValue ?? null,
					status: data.status,
					observations: data.observations,
					updatedByUserId: data.userId
				}
			});

			if (grade.subjectEnrollmentId) {
				await updateCourseResult(grade.subjectEnrollmentId, tx);
			}
			await updateStudentSubjectStatus(grade.studentId, grade.evaluation.subjectId, tx);

			return updatedGrade;
		});

		// Auditoría
		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'Grade',
			entityId: data.gradeId,
			description: `Editó calificación de alumno ${grade.studentId} en evaluación "${grade.evaluation.title}"`,
			userId: data.userId,
			metadata: {
				evaluationId: grade.evaluationId,
				studentId: grade.studentId,
				oldValue,
				newValue: {
					value: data.value,
					qualitativeValue: data.qualitativeValue ?? null,
					status: data.status,
					observations: data.observations
				}
			}
		});

		return result;
	}

	/**
	 * Elimina una calificación
	 */
	async deleteGrade(data: DeleteGradeData) {
		const validation = await this.canDeleteGrade(data.gradeId, data.userId);
		if (validation) {
			return validation;
		}

		const grade = await this.prisma.grade.findUnique({
			where: { id: data.gradeId },
			include: { evaluation: true }
		});

		if (!grade) {
			return { error: 'Calificación no encontrada' };
		}

		const deletedValue = {
			value: grade.value === null ? null : Number(grade.value),
			qualitativeValue: grade.qualitativeValue,
			status: grade.status,
			observations: grade.observations
		};

		const result = await this.prisma.$transaction(async (tx) => {
			await tx.grade.delete({
				where: { id: data.gradeId }
			});

			if (grade.subjectEnrollmentId) {
				await updateCourseResult(grade.subjectEnrollmentId, tx);
			}
			await updateStudentSubjectStatus(grade.studentId, grade.evaluation.subjectId, tx);
		});

		// Auditoría
		await auditLog({
			action: AuditAction.DELETE,
			entityType: 'Grade',
			entityId: data.gradeId,
			description: `Eliminó calificación de alumno ${grade.studentId} en evaluación "${grade.evaluation.title}"`,
			userId: data.userId,
			metadata: {
				evaluationId: grade.evaluationId,
				studentId: grade.studentId,
				deletedValue
			}
		});

		return result;
	}
}
