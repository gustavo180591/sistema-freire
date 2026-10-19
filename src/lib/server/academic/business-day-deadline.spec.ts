import { describe, expect, it } from 'vitest';
import {
	calculateExamRegistrationDeadline,
	isBusinessDay,
	subtractBusinessDays,
	type BusinessCalendar
} from './business-day-deadline';

const mondayToFridayCalendar: BusinessCalendar = {
	workingDays: [1, 2, 3, 4, 5],
	holidays: []
};

describe('business-day-deadline', () => {
	it('resta tres días hábiles conservando la hora del examen', () => {
		const examDate = new Date(2026, 10, 18, 18, 0, 0);

		const deadline = calculateExamRegistrationDeadline(examDate, mondayToFridayCalendar);

		expect(deadline.getFullYear()).toBe(2026);
		expect(deadline.getMonth()).toBe(10);
		expect(deadline.getDate()).toBe(13);
		expect(deadline.getHours()).toBe(18);
		expect(deadline.getMinutes()).toBe(0);
	});

	it('omite fines de semana', () => {
		const monday = new Date(2026, 10, 16, 18, 0, 0);

		const deadline = subtractBusinessDays(monday, 1, mondayToFridayCalendar);

		expect(deadline.getDate()).toBe(13);
	});

	it('omite feriados no recurrentes', () => {
		const calendar: BusinessCalendar = {
			workingDays: [1, 2, 3, 4, 5],
			holidays: [
				{
					date: new Date(2026, 10, 16),
					recurring: false
				}
			]
		};

		const examDate = new Date(2026, 10, 18, 18, 0, 0);
		const deadline = calculateExamRegistrationDeadline(examDate, calendar);

		expect(deadline.getDate()).toBe(12);
		expect(deadline.getHours()).toBe(18);
	});

	it('respeta feriados recurrentes aunque pertenezcan a otro año', () => {
		const calendar: BusinessCalendar = {
			workingDays: [1, 2, 3, 4, 5],
			holidays: [
				{
					date: new Date(2025, 10, 16),
					recurring: true
				}
			]
		};

		const date = new Date(2026, 10, 16, 12, 0, 0);

		expect(isBusinessDay(date, calendar)).toBe(false);
	});

	it('respeta una configuración institucional distinta de lunes a viernes', () => {
		const calendar: BusinessCalendar = {
			workingDays: [1, 2, 3, 4, 5, 6],
			holidays: []
		};

		const examDate = new Date(2026, 10, 18, 18, 0, 0);
		const deadline = calculateExamRegistrationDeadline(examDate, calendar);

		expect(deadline.getDate()).toBe(14);
	});

	it('rechaza una configuración sin días laborables', () => {
		expect(() =>
			subtractBusinessDays(new Date(2026, 10, 18), 3, {
				workingDays: [],
				holidays: []
			})
		).toThrow('Debe existir al menos un día laborable configurado');
	});
});
