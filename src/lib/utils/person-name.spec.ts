import { describe, expect, it } from 'vitest';
import { formatPersonName } from './person-name';

describe('formatPersonName', () => {
	it('formatea apellido y nombre en mayúsculas', () => {
		expect(formatPersonName('Juan Carlos', 'Pérez')).toBe('PÉREZ, JUAN CARLOS');
	});

	it('conserva correctamente tildes y eñes', () => {
		expect(formatPersonName('José María', 'Muñoz')).toBe('MUÑOZ, JOSÉ MARÍA');
	});

	it('normaliza espacios innecesarios', () => {
		expect(formatPersonName('  Ana   María ', ' de la   Cruz ')).toBe('DE LA CRUZ, ANA MARÍA');
	});

	it('permite nombre y apellido para contextos narrativos', () => {
		expect(formatPersonName('Juan', 'Pérez', 'FIRST_LAST')).toBe('JUAN PÉREZ');
	});
});
