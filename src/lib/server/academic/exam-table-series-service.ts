import { EvaluationType, GradingMode, PrismaClient } from '@prisma/client';
import { EvaluationService } from './evaluation-service';

export interface CreateExamTableSeriesData {
	subjectId: string;
	careerId: string;
	locationId: string;
	responsibleTeacherId: string;
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

		const evaluationService = new EvaluationService(this.prisma);

		try {
			return await this.prisma.$transaction(async (tx) => {
				const series = await tx.examTableSeries.create({
					data: {},
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
}
