import { describe, expect, it } from 'vitest';
import {
	buildBusinessCalendar,
	DEFAULT_WORKING_DAYS,
	normalizeHolidayDate,
	parseWorkingDays
} from './business-calendar-service';

describe('business-calendar-service', () => {
	it('usa lunes a viernes cuando todavía no existe configuración institucional', () => {
		const calendar = buildBusinessCalendar({
			workingDaysConfig: null,
			holidays: []
		});

		expect(calendar.workingDays).toEqual(DEFAULT_WORKING_DAYS);
	});

	it('respeta los días laborables configurados por la institución', () => {
		const calendar = buildBusinessCalendar({
			workingDaysConfig: [1, 2, 3, 4, 5, 6],
			holidays: []
		});

		expect(calendar.workingDays).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('rechaza una configuración existente sin días laborables', () => {
		expect(() => parseWorkingDays([])).toThrow(
			'Debe existir al menos un día laborable configurado'
		);
	});

	it('rechaza valores de días inválidos', () => {
		expect(() => parseWorkingDays([1, 2, 7])).toThrow(
			'La configuración de días laborables contiene valores inválidos o duplicados'
		);
	});

	it('rechaza días duplicados en la configuración', () => {
		expect(() => parseWorkingDays([1, 2, 2, 3])).toThrow(
			'La configuración de días laborables contiene valores inválidos o duplicados'
		);
	});

	it('normaliza un feriado usando su fecha civil UTC', () => {
		const storedDate = new Date('2026-11-16T00:00:00.000Z');

		const normalized = normalizeHolidayDate(storedDate);

		expect(normalized.getFullYear()).toBe(2026);
		expect(normalized.getMonth()).toBe(10);
		expect(normalized.getDate()).toBe(16);
	});

	it('mantiene la condición recurrente de los feriados', () => {
		const calendar = buildBusinessCalendar({
			workingDaysConfig: [1, 2, 3, 4, 5],
			holidays: [
				{
					date: new Date('2025-11-16T00:00:00.000Z'),
					recurring: true
				}
			]
		});

		expect(calendar.holidays).toHaveLength(1);
		expect(calendar.holidays[0]?.recurring).toBe(true);
		expect(calendar.holidays[0]?.date.getMonth()).toBe(10);
		expect(calendar.holidays[0]?.date.getDate()).toBe(16);
	});
});
