const INTEGER_GRADE_NAMES: Record<number, string> = {
	0: 'Cero',
	1: 'Uno',
	2: 'Dos',
	3: 'Tres',
	4: 'Cuatro',
	5: 'Cinco',
	6: 'Seis',
	7: 'Siete',
	8: 'Ocho',
	9: 'Nueve',
	10: 'Diez'
};

export function formatGradeInWords(value: number | null | undefined): string | null {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return null;
	}

	const totalHundredths = Math.round(value * 100);
	const integerPart = Math.floor(totalHundredths / 100);
	const decimalPart = Math.abs(totalHundredths % 100);

	const integerLabel = INTEGER_GRADE_NAMES[integerPart] ?? String(integerPart);

	return `${integerLabel}/${String(decimalPart).padStart(2, '0')}`;
}
