export function formatExamCallLabel(
	callNumber: number,
	value: Date | string | null | undefined
): string {
	const fallback =
		callNumber === 1 ? 'Primer llamado' : callNumber === 2 ? 'Segundo llamado' : 'Llamado';

	if (!value) {
		return fallback;
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return fallback;
	}

	const month = new Intl.DateTimeFormat('es-AR', {
		month: 'long'
	}).format(date);

	const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);

	const ordinal = callNumber === 1 ? '1.er' : callNumber === 2 ? '2.º' : `${callNumber}.º`;

	return `${ordinal} llamado · ${formattedMonth} ${date.getFullYear()}`;
}
