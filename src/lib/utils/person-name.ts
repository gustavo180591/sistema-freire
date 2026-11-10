export type PersonNameOrder = 'LAST_FIRST' | 'FIRST_LAST';

function normalizeNamePart(value: string | null | undefined): string {
	return (value ?? '').trim().replace(/\s+/g, ' ');
}

export function formatPersonName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	order: PersonNameOrder = 'LAST_FIRST'
): string {
	const normalizedFirstName = normalizeNamePart(firstName);
	const normalizedLastName = normalizeNamePart(lastName);

	const formattedName =
		order === 'LAST_FIRST'
			? [normalizedLastName, normalizedFirstName].filter(Boolean).join(', ')
			: [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ');

	return formattedName.toLocaleUpperCase('es-AR');
}
