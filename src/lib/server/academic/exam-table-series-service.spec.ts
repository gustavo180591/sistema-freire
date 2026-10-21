import { describe, expect, it } from 'vitest';
import { validateExamTableSeriesDates } from './exam-table-series-service';

describe('validateExamTableSeriesDates', () => {
	it('acepta un solo llamado', () => {
		expect(validateExamTableSeriesDates([new Date(2026, 10, 18, 18, 0)])).toBeNull();
	});

	it('acepta dos llamados ordenados cronológicamente', () => {
		expect(
			validateExamTableSeriesDates([new Date(2026, 10, 18, 18, 0), new Date(2026, 11, 2, 18, 0)])
		).toBeNull();
	});

	it('rechaza una mesa sin llamados', () => {
		expect(validateExamTableSeriesDates([])).toBe('Una mesa debe tener uno o dos llamados');
	});

	it('rechaza más de dos llamados', () => {
		expect(
			validateExamTableSeriesDates([
				new Date(2026, 10, 18),
				new Date(2026, 11, 2),
				new Date(2026, 11, 16)
			])
		).toBe('Una mesa debe tener uno o dos llamados');
	});

	it('rechaza una fecha inválida', () => {
		expect(validateExamTableSeriesDates([new Date('invalid')])).toBe(
			'Una de las fechas de examen no es válida'
		);
	});

	it('rechaza un segundo llamado anterior o igual al primero', () => {
		expect(
			validateExamTableSeriesDates([new Date(2026, 11, 2, 18, 0), new Date(2026, 10, 18, 18, 0)])
		).toBe('La fecha del segundo llamado debe ser posterior a la del primer llamado');
	});
});
