import { describe, expect, it } from 'vitest';
import { formatExamCallLabel } from './exam-call-label';

describe('formatExamCallLabel', () => {
	it('formatea el primer llamado con mes y año', () => {
		expect(formatExamCallLabel(1, new Date(2026, 10, 18, 18, 0))).toBe(
			'1.er llamado · Noviembre 2026'
		);
	});

	it('formatea el segundo llamado con mes y año', () => {
		expect(formatExamCallLabel(2, new Date(2026, 11, 2, 18, 0))).toBe(
			'2.º llamado · Diciembre 2026'
		);
	});

	it('usa un texto base mientras no existe fecha', () => {
		expect(formatExamCallLabel(1, null)).toBe('Primer llamado');
		expect(formatExamCallLabel(2, '')).toBe('Segundo llamado');
	});

	it('tolera una fecha inválida', () => {
		expect(formatExamCallLabel(2, 'fecha-invalida')).toBe('Segundo llamado');
	});
});
