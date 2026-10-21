import type { PrismaClient } from '@prisma/client';

type BusinessCalendarClient = Pick<PrismaClient, 'calendarConfig' | 'holiday'>;
import type { BusinessCalendar, BusinessHoliday } from './business-day-deadline';

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export function parseWorkingDays(value: unknown): number[] {
	if (!Array.isArray(value)) {
		throw new Error('La configuración de días laborables no tiene un formato válido');
	}

	const workingDays = [
		...new Set(
			value.filter(
				(day): day is number =>
					typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6
			)
		)
	].sort((left, right) => left - right);

	if (workingDays.length === 0) {
		throw new Error('Debe existir al menos un día laborable configurado');
	}

	if (workingDays.length !== value.length) {
		throw new Error('La configuración de días laborables contiene valores inválidos o duplicados');
	}

	return workingDays;
}

/**
 * Los feriados se cargan desde campos DateTime que normalmente representan
 * una fecha civil. Tomamos sus componentes UTC para evitar que un valor como
 * 2026-11-16T00:00:00.000Z se convierta en 15/11 al ejecutarse en una zona
 * horaria negativa.
 */
export function normalizeHolidayDate(date: Date): Date {
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0);
}

export function buildBusinessCalendar(input: {
	workingDaysConfig: unknown | null;
	holidays: BusinessHoliday[];
}): BusinessCalendar {
	const workingDays =
		input.workingDaysConfig === null
			? [...DEFAULT_WORKING_DAYS]
			: parseWorkingDays(input.workingDaysConfig);

	return {
		workingDays,
		holidays: input.holidays.map((holiday) => ({
			date: normalizeHolidayDate(holiday.date),
			recurring: holiday.recurring
		}))
	};
}

export async function loadBusinessCalendar(
	prisma: BusinessCalendarClient
): Promise<BusinessCalendar> {
	const [workingDaysConfig, holidays] = await Promise.all([
		prisma.calendarConfig.findUnique({
			where: {
				key: 'working_days'
			},
			select: {
				value: true
			}
		}),
		prisma.holiday.findMany({
			select: {
				date: true,
				recurring: true
			},
			orderBy: {
				date: 'asc'
			}
		})
	]);

	return buildBusinessCalendar({
		workingDaysConfig: workingDaysConfig?.value ?? null,
		holidays
	});
}
