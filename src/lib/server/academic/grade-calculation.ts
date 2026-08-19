export const COURSE_EVALUATION_TYPES = ['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'] as const;

export interface GradeCalculationItem {
	value: number | null;
	qualitativeValue?: 'APPROVED' | 'FAILED' | null;
	status: 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
	evaluation: {
		id: string;
		type: string;
		gradingMode: 'NUMERIC' | 'QUALITATIVE';
		participatesInAverage: boolean;
		parentEvaluationId?: string | null;
		evaluationDate: Date;
	};
}

export interface CourseAverageResult {
	average: number | null;
	effectiveValues: number[];
}

/**
 * Calcula el promedio aritmético de cursada.
 *
 * - Solo participan evaluaciones numéricas de cursada marcadas para promediar.
 * - PENDIENTE, AUSENTE y JUSTIFICADO no aportan una nota.
 * - Un recuperatorio calificado reemplaza siempre a la nota original, incluso
 *   cuando el nuevo valor sea menor.
 * - Si existieran varios recuperatorios históricos, prevalece el más reciente.
 * - Finales, mesas y resultados cualitativos no se mezclan con la cursada.
 */
export function calculateCourseAverage(grades: GradeCalculationItem[]): CourseAverageResult {
	const effectiveByEvaluation = new Map<string, number | null>();

	for (const grade of grades) {
		const { evaluation } = grade;
		const isCourseEvaluation = COURSE_EVALUATION_TYPES.includes(
			evaluation.type as (typeof COURSE_EVALUATION_TYPES)[number]
		);

		if (!isCourseEvaluation || !evaluation.participatesInAverage) continue;
		if (evaluation.gradingMode !== 'NUMERIC') continue;

		const value = grade.status === 'PRESENT' && grade.value !== null ? grade.value : null;
		effectiveByEvaluation.set(evaluation.id, value);
	}

	const recoveries = grades
		.filter(
			(grade) =>
				grade.evaluation.type === 'RECUPERATORIO' &&
				grade.evaluation.parentEvaluationId &&
				grade.evaluation.gradingMode === 'NUMERIC'
		)
		.sort((a, b) => a.evaluation.evaluationDate.getTime() - b.evaluation.evaluationDate.getTime());

	for (const recovery of recoveries) {
		if (recovery.status !== 'PRESENT' || recovery.value === null) continue;
		const parentEvaluationId = recovery.evaluation.parentEvaluationId!;
		if (!effectiveByEvaluation.has(parentEvaluationId)) continue;
		effectiveByEvaluation.set(parentEvaluationId, recovery.value);
	}

	const effectiveValues = [...effectiveByEvaluation.values()].filter(
		(value): value is number => value !== null
	);

	if (effectiveValues.length === 0) {
		return { average: null, effectiveValues };
	}

	const sum = effectiveValues.reduce((total, value) => total + value, 0);
	return { average: sum / effectiveValues.length, effectiveValues };
}
