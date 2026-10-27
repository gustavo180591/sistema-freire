import { AuditAction, EvaluationType, GradingMode, PrismaClient } from '@prisma/client';
import { auditLog } from '$lib/server/audit';
import { EvaluationService } from './evaluation-service';

export interface CreateExamTableSeriesData {
	subjectId: string;
	careerId: string;
	locationId: string;
	responsibleTeacherId: string;
	firstVocalTeacherId?: string;
	secondVocalTeacherId?: string;
	title: string;
	description?: string;
	evaluationDates: Date[];
	maxScore: number;
	minPassingScore: number;
	userId: string;
}

export interface ExamTableSeriesValidationError {
	error: string;
}

class ExamTableSeriesCreationError extends Error {}

export function validateExamTableSeriesDates(evaluationDates: Date[]): string | null {
	if (evaluationDates.length < 1 || evaluationDates.length > 2) {
		return 'Una mesa debe tener uno o dos llamados';
	}

	for (const evaluationDate of evaluationDates) {
		if (Number.isNaN(evaluationDate.getTime())) {
			return 'Una de las fechas de examen no es válida';
		}
	}

	if (
		evaluationDates.length === 2 &&
		evaluationDates[1].getTime() <= evaluationDates[0].getTime()
	) {
		return 'La fecha del segundo llamado debe ser posterior a la del primer llamado';
	}

	return null;
}

export class ExamTableSeriesService {
	constructor(private prisma: PrismaClient) {}

	async createSeries(data: CreateExamTableSeriesData): Promise<
		| ExamTableSeriesValidationError
		| {
				seriesId: string;
				evaluations: Array<{
					id: string;
					examCallNumber: 1 | 2;
					evaluationDate: Date;
					registrationClosesAt: Date | null;
				}>;
		  }
	> {
		const dateError = validateExamTableSeriesDates(data.evaluationDates);

		if (dateError) {
			return { error: dateError };
		}

		const tribunalTeacherIds = [
			data.responsibleTeacherId,
			data.firstVocalTeacherId,
			data.secondVocalTeacherId
		].filter((teacherId): teacherId is string => Boolean(teacherId));

		const uniqueTribunalTeacherIds = [...new Set(tribunalTeacherIds)];

		const tribunalTeachers = await this.prisma.teacher.findMany({
			where: {
				id: {
					in: uniqueTribunalTeacherIds
				},
				status: 'ACTIVE'
			},
			select: {
				id: true,
				user: {
					select: {
						locationPermissions: {
							select: {
								locationId: true
							}
						}
					}
				}
			}
		});

		if (tribunalTeachers.length !== uniqueTribunalTeacherIds.length) {
			return {
				error: 'Uno o más integrantes del tribunal no existen o no se encuentran activos'
			};
		}

		const teacherOutsideLocation = tribunalTeachers.some(
			(teacher) =>
				!teacher.user.locationPermissions.some(
					(permission) => permission.locationId === data.locationId
				)
		);

		if (teacherOutsideLocation) {
			return {
				error: 'Todos los integrantes del tribunal deben estar asignados a la sede seleccionada'
			};
		}

		const evaluationService = new EvaluationService(this.prisma);

		try {
			return await this.prisma.$transaction(async (tx) => {
				const series = await tx.examTableSeries.create({
					data: {
						presidentTeacherId: data.responsibleTeacherId,
						firstVocalTeacherId: data.firstVocalTeacherId ?? null,
						secondVocalTeacherId: data.secondVocalTeacherId ?? null
					},
					select: {
						id: true
					}
				});

				const evaluations: Array<{
					id: string;
					examCallNumber: 1 | 2;
					evaluationDate: Date;
					registrationClosesAt: Date | null;
				}> = [];

				for (const [index, evaluationDate] of data.evaluationDates.entries()) {
					const examCallNumber = (index + 1) as 1 | 2;

					const result = await evaluationService.createEvaluation(
						{
							subjectId: data.subjectId,
							careerId: data.careerId,
							locationId: data.locationId,
							responsibleTeacherId: data.responsibleTeacherId,
							examTableSeriesId: series.id,
							examCallNumber,
							title: data.title,
							description: data.description,
							type: EvaluationType.MESA_EXAMEN,
							evaluationDate,
							maxScore: data.maxScore,
							minPassingScore: data.minPassingScore,
							gradingMode: GradingMode.NUMERIC,
							participatesInAverage: false,
							mandatory: true,
							userId: data.userId
						},
						tx
					);

					if ('error' in result) {
						throw new ExamTableSeriesCreationError(result.error);
					}

					evaluations.push({
						id: result.id,
						examCallNumber,
						evaluationDate: result.evaluationDate,
						registrationClosesAt: result.registrationClosesAt
					});
				}

				return {
					seriesId: series.id,
					evaluations
				};
			});
		} catch (error) {
			if (error instanceof ExamTableSeriesCreationError) {
				return {
					error: error.message
				};
			}

			throw error;
		}
	}

	async setVisibility(data: {
		seriesId: string;
		isHidden: boolean;
		userId: string;
	}): Promise<ExamTableSeriesValidationError | { id: string; isHidden: boolean }> {
		const series = await this.prisma.examTableSeries.findUnique({
			where: {
				id: data.seriesId
			},
			select: {
				id: true,
				isHidden: true,
				evaluations: {
					orderBy: {
						examCallNumber: 'asc'
					},
					take: 1,
					select: {
						title: true
					}
				}
			}
		});

		if (!series) {
			return {
				error: 'Mesa de examen no encontrada'
			};
		}

		if (series.isHidden === data.isHidden) {
			return {
				id: series.id,
				isHidden: series.isHidden
			};
		}

		const updated = await this.prisma.examTableSeries.update({
			where: {
				id: data.seriesId
			},
			data: {
				isHidden: data.isHidden
			},
			select: {
				id: true,
				isHidden: true
			}
		});

		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'ExamTableSeries',
			entityId: series.id,
			description: data.isHidden
				? `Ocultó mesa de examen "${series.evaluations[0]?.title ?? series.id}"`
				: `Volvió a mostrar mesa de examen "${series.evaluations[0]?.title ?? series.id}"`,
			userId: data.userId,
			metadata: {
				before: {
					isHidden: series.isHidden
				},
				after: {
					isHidden: updated.isHidden
				}
			}
		});

		return updated;
	}
}
