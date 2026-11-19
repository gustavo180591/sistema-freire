import { describe, expect, it } from 'vitest';
import { formatGradeInWords } from './grade-in-words';

describe('formatGradeInWords', () => {
	it('convierte una nota entera al formato del Libro Matriz', () => {
		expect(formatGradeInWords(6)).toBe('Seis/00');
		expect(formatGradeInWords(10)).toBe('Diez/00');
	});

	it('conserva los centésimos de una nota decimal', () => {
		expect(formatGradeInWords(8.64)).toBe('Ocho/64');
		expect(formatGradeInWords(7.5)).toBe('Siete/50');
	});

	it('redondea a dos decimales', () => {
		expect(formatGradeInWords(8.646)).toBe('Ocho/65');
	});

	it('devuelve null cuando no existe una nota válida', () => {
		expect(formatGradeInWords(null)).toBeNull();
		expect(formatGradeInWords(undefined)).toBeNull();
		expect(formatGradeInWords(Number.NaN)).toBeNull();
	});
});
