export interface BusinessHoliday {
	date: Date;
	recurring: boolean;
}

export interface BusinessCalendar {
	workingDays: number[];
	holidays: BusinessHoliday[];
}

function isSameCalendarDay(left: Date, right: Date): boolean {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

function matchesRecurringHoliday(date: Date, holiday: Date): boolean {
	return date.getMonth() === holiday.getMonth() && date.getDate() === holiday.getDate();
}

export function isBusinessDay(date: Date, calendar: BusinessCalendar): boolean {
	if (!calendar.workingDays.includes(date.getDay())) {
		return false;
	}

	const isHoliday = calendar.holidays.some((holiday) =>
		holiday.recurring
			? matchesRecurringHoliday(date, holiday.date)
			: isSameCalendarDay(date, holiday.date)
	);

	return !isHoliday;
}

export function subtractBusinessDays(
	referenceDate: Date,
	businessDays: number,
	calendar: BusinessCalendar
): Date {
	if (!Number.isInteger(businessDays) || businessDays < 0) {
		throw new Error('La cantidad de días hábiles debe ser un entero mayor o igual a cero');
	}

	if (calendar.workingDays.length === 0) {
		throw new Error('Debe existir al menos un día laborable configurado');
	}

	const result = new Date(referenceDate);
	let remainingDays = businessDays;

	while (remainingDays > 0) {
		result.setDate(result.getDate() - 1);

		if (isBusinessDay(result, calendar)) {
			remainingDays -= 1;
		}
	}

	return result;
}

export function calculateExamRegistrationDeadline(
	evaluationDate: Date,
	calendar: BusinessCalendar
): Date {
	return subtractBusinessDays(evaluationDate, 3, calendar);
}
