import { PrismaClient, GradeStatus, EvaluationType, AuditAction } from '@prisma/client';
import { calculateFinalStatus, canStudentPass, updateStudentSubjectStatus } from './plan-logic';
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
	title: string;
	description?: string;
	type: EvaluationType;
	evaluationDate: Date;
	maxScore: number;
	minPassingScore?: number;
	weight?: number;
	parentEvaluationId?: string;
	userId: string;
}

export interface LoadGradesBatchData {
	evaluationId: string;
	grades: Array<{
		studentId: string;
		value: number | null;
		status: GradeStatus;
		observations?: string;
	}>;
	userId: string;
}

export interface EditGradeData {
	gradeId: string;
	value: number | null;
	status: GradeStatus;
	observations?: string;
	userId: string;
}

export interface DeleteGradeData {
	gradeId: string;
	userId: string;
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
			select: { createdByUserId: true }
		});
		return evaluation?.createdByUserId === userId;
	}

	/**
	 * Valida que se puede cargar calificaciones en una evaluación
	 */
	async canLoadGrades(evaluationId: string, userId: string): Promise<EvaluationValidationError | null> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true, createdByUserId: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		if (evaluation.createdByUserId !== userId) {
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

		if (grade.createdByUserId !== userId) {
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

		if (grade.createdByUserId !== userId) {
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
	async canCloseEvaluation(evaluationId: string, userId: string): Promise<EvaluationValidationError | null> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true, createdByUserId: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		if (evaluation.createdByUserId !== userId) {
			return { error: 'No tenés permiso para cerrar esta evaluación' };
		}

		if (evaluation.isClosed) {
			return { error: 'La evaluación ya está cerrada' };
		}

		return null;
	}

	/**
	 * Valida que se puede reabrir una evaluación
	 */
	async canReopenEvaluation(evaluationId: string, userId: string): Promise<EvaluationValidationError | null> {
		const evaluation = await this.prisma.evaluation.findUnique({
			where: { id: evaluationId },
			select: { isClosed: true, createdByUserId: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		if (evaluation.createdByUserId !== userId) {
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
		// Validar evaluación padre si es recuperatorio
		if (data.parentEvaluationId) {
			const parentEvaluation = await this.prisma.evaluation.findUnique({
				where: { id: data.parentEvaluationId },
				select: { subjectId: true, commissionId: true }
			});

			if (!parentEvaluation) {
				return { error: 'Evaluación original no encontrada' };
			}

			if (parentEvaluation.subjectId !== data.subjectId) {
				return {
					error: 'El recuperatorio debe ser de la misma materia que la evaluación original'
				};
			}

			if (data.commissionId && parentEvaluation.commissionId !== data.commissionId) {
				return {
					error: 'El recuperatorio debe ser de la misma comisión que la evaluación original'
				};
			}
		}

		const evaluation = await this.prisma.evaluation.create({
			data: {
				subjectId: data.subjectId,
				commissionId: data.commissionId,
				title: data.title,
				description: data.description,
				type: data.type,
				evaluationDate: data.evaluationDate,
				maxScore: data.maxScore,
				minPassingScore: data.minPassingScore,
				weight: data.weight,
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
				maxScore: data.maxScore,
				evaluationDate: data.evaluationDate
			}
		});

		return evaluation;
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
			select: { subjectId: true, commissionId: true, maxScore: true, minPassingScore: true, weight: true, title: true }
		});

		if (!evaluation) {
			return { error: 'Evaluación no encontrada' };
		}

		const result = await this.prisma.$transaction(async (tx) => {
			const createdGrades = [];

			for (const gradeData of data.grades) {
				// Validar estado y valor
				if (gradeData.status === GradeStatus.PRESENT && gradeData.value === null) {
					throw new Error('PRESENT requiere una nota');
				}

				if (gradeData.status === GradeStatus.ABSENT && gradeData.value !== null) {
					throw new Error('ABSENT no debe tener nota');
				}

				const grade = await tx.grade.upsert({
					where: {
						evaluationId_studentId: {
							evaluationId: data.evaluationId,
							studentId: gradeData.studentId
						}
					},
					update: {
						value: gradeData.value,
						status: gradeData.status,
						observations: gradeData.observations,
						updatedByUserId: data.userId
					},
					create: {
						evaluationId: data.evaluationId,
						studentId: gradeData.studentId,
						value: gradeData.value,
						status: gradeData.status,
						observations: gradeData.observations,
						createdByUserId: data.userId
					}
				});

				createdGrades.push(grade);

				// Recalcular situación académica del alumno
				await updateStudentSubjectStatus(gradeData.studentId, evaluation.subjectId, tx);
			}

			return createdGrades;
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
				gradesCount: data.grades.length
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

		// Validar estado y valor
		if (data.status === GradeStatus.PRESENT && data.value === null) {
			return { error: 'PRESENT requiere una nota' };
		}

		if (data.status === GradeStatus.ABSENT && data.value !== null) {
			return { error: 'ABSENT no debe tener nota' };
		}

		const oldValue = { value: grade.value, status: grade.status };

		const result = await this.prisma.$transaction(async (tx) => {
			const updatedGrade = await tx.grade.update({
				where: { id: data.gradeId },
				data: {
					value: data.value,
					status: data.status,
					observations: data.observations,
					updatedByUserId: data.userId
				}
			});

			// Recalcular situación académica del alumno
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
				newValue: { value: data.value, status: data.status }
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

		const deletedValue = { value: grade.value, status: grade.status };

		const result = await this.prisma.$transaction(async (tx) => {
			await tx.grade.delete({
				where: { id: data.gradeId }
			});

			// Recalcular situación académica del alumno
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
