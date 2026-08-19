import { describe, expect, it } from 'vitest';
import { calculateCourseAverage, type GradeCalculationItem } from './grade-calculation';

const baseDate = new Date('2026-08-18T12:00:00.000Z');

function grade(
	id: string,
	value: number | null,
	overrides: Omit<Partial<GradeCalculationItem>, 'evaluation'> & {
		evaluation?: Partial<GradeCalculationItem['evaluation']>;
	} = {}
): GradeCalculationItem {
	const { evaluation: evaluationOverrides, ...gradeOverrides } = overrides;

	return {
		value,
		qualitativeValue: null,
		status: value === null ? 'PENDING' : 'PRESENT',
		evaluation: {
			id,
			type: 'PARCIAL',
			gradingMode: 'NUMERIC',
			participatesInAverage: true,
			parentEvaluationId: null,
			evaluationDate: baseDate,
			...evaluationOverrides
		},
		...gradeOverrides
	};
}

describe('calculateCourseAverage', () => {
	it('calcula un promedio aritmético sin pesos', () => {
		const result = calculateCourseAverage([
			grade('p1', 7),
			grade('tp1', 9, { evaluation: { type: 'TRABAJO_PRACTICO' } }),
			grade('p2', 5),
			grade('i1', 8, { evaluation: { type: 'INTEGRADOR' } })
		]);

		expect(result.average).toBe(7.25);
		expect(result.effectiveValues).toEqual([7, 9, 5, 8]);
	});

	it('el recuperatorio reemplaza siempre la nota original aunque sea menor', () => {
		const result = calculateCourseAverage([
			grade('p1', 8),
			grade('r1', 6, {
				evaluation: {
					type: 'RECUPERATORIO',
					participatesInAverage: false,
					parentEvaluationId: 'p1',
					evaluationDate: new Date('2026-08-19T12:00:00.000Z')
				}
			})
		]);

		expect(result.average).toBe(6);
		expect(result.effectiveValues).toEqual([6]);
	});

	it('excluye pendientes, ausentes y justificados', () => {
		const result = calculateCourseAverage([
			grade('p1', 7),
			grade('p2', null, { status: 'PENDING' }),
			grade('p3', null, { status: 'ABSENT' }),
			grade('p4', null, { status: 'EXCUSED' })
		]);

		expect(result.average).toBe(7);
		expect(result.effectiveValues).toEqual([7]);
	});

	it('no mezcla cualitativas, finales ni mesas con la cursada', () => {
		const result = calculateCourseAverage([
			grade('p1', 7),
			grade('tp1', null, {
				qualitativeValue: 'APPROVED',
				status: 'PRESENT',
				evaluation: { type: 'TRABAJO_PRACTICO', gradingMode: 'QUALITATIVE' }
			}),
			grade('f1', 10, { evaluation: { type: 'EXAMEN_FINAL' } }),
			grade('m1', 9, { evaluation: { type: 'MESA_EXAMEN' } })
		]);

		expect(result.average).toBe(7);
		expect(result.effectiveValues).toEqual([7]);
	});

	it('usa el recuperatorio más reciente cuando existen datos históricos duplicados', () => {
		const result = calculateCourseAverage([
			grade('p1', 4),
			grade('r1', 6, {
				evaluation: {
					type: 'RECUPERATORIO',
					participatesInAverage: false,
					parentEvaluationId: 'p1',
					evaluationDate: new Date('2026-08-19T12:00:00.000Z')
				}
			}),
			grade('r2', 5, {
				evaluation: {
					type: 'RECUPERATORIO',
					participatesInAverage: false,
					parentEvaluationId: 'p1',
					evaluationDate: new Date('2026-08-20T12:00:00.000Z')
				}
			})
		]);

		expect(result.average).toBe(5);
		expect(result.effectiveValues).toEqual([5]);
	});

	it('no incorpora un recuperatorio si la evaluación original no integra el promedio', () => {
		const result = calculateCourseAverage([
			grade('p1', 4, { evaluation: { participatesInAverage: false } }),
			grade('r1', 8, {
				evaluation: {
					type: 'RECUPERATORIO',
					participatesInAverage: false,
					parentEvaluationId: 'p1',
					evaluationDate: new Date('2026-08-19T12:00:00.000Z')
				}
			})
		]);

		expect(result.average).toBeNull();
		expect(result.effectiveValues).toEqual([]);
	});
});
