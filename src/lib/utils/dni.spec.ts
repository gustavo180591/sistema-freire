import { describe, expect, it } from 'vitest';
import { formatDni, getDniLookupVariants, isValidDni, normalizeDni } from './dni';

describe('normalizeDni', () => {
	it('mantiene un DNI numérico', () => {
		expect(normalizeDni('46732006')).toBe('46732006');
	});

	it('elimina puntos', () => {
		expect(normalizeDni('46.732.006')).toBe('46732006');
	});

	it('elimina espacios', () => {
		expect(normalizeDni('46 732 006')).toBe('46732006');
	});

	it('devuelve vacío para valores vacíos', () => {
		expect(normalizeDni('')).toBe('');
		expect(normalizeDni(null)).toBe('');
		expect(normalizeDni(undefined)).toBe('');
	});
});

describe('formatDni', () => {
	it('formatea un DNI de ocho dígitos', () => {
		expect(formatDni('46732006')).toBe('46.732.006');
	});

	it('formatea un DNI de siete dígitos', () => {
		expect(formatDni('7320006')).toBe('7.320.006');
	});

	it('acepta un DNI que ya contiene puntos', () => {
		expect(formatDni('46.732.006')).toBe('46.732.006');
	});
});

describe('isValidDni', () => {
	it('acepta DNI sin puntos', () => {
		expect(isValidDni('46732006')).toBe(true);
	});

	it('acepta DNI con puntos', () => {
		expect(isValidDni('46.732.006')).toBe(true);
	});

	it('acepta DNI separado por espacios', () => {
		expect(isValidDni('46 732 006')).toBe(true);
	});

	it('rechaza letras', () => {
		expect(isValidDni('46ABC006')).toBe(false);
	});

	it('rechaza SIN_DNI', () => {
		expect(isValidDni('SIN_DNI')).toBe(false);
	});

	it('rechaza un DNI de doce dígitos', () => {
		expect(isValidDni('313113311313')).toBe(false);
	});

	it('rechaza valores vacíos', () => {
		expect(isValidDni('')).toBe(false);
	});

	it('rechaza una entrada compuesta solamente por espacios', () => {
		expect(isValidDni('   ')).toBe(false);
	});
});

describe('getDniLookupVariants', () => {
	it('genera variantes normalizada y formateada', () => {
		expect(getDniLookupVariants('46.732.006')).toEqual(['46.732.006', '46732006']);
	});

	it('genera variante formateada al recibir números', () => {
		expect(getDniLookupVariants('46732006')).toEqual(['46732006', '46.732.006']);
	});
});
