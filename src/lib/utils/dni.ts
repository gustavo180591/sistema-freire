export const DNI_MIN_DIGITS = 7;
export const DNI_MAX_DIGITS = 9;

/**
 * Devuelve únicamente los dígitos del DNI.
 *
 * Ejemplos:
 * 46.732.006 -> 46732006
 * 46 732 006 -> 46732006
 */
export function normalizeDni(value: string | null | undefined): string {
	return (value ?? '').replace(/\D/g, '');
}

/**
 * Formatea un DNI para presentación.
 *
 * La base de datos debe conservar el valor normalizado.
 *
 * Ejemplos:
 * 46732006 -> 46.732.006
 * 7320006  -> 7.320.006
 */
export function formatDni(value: string | null | undefined): string {
	const normalized = normalizeDni(value);

	if (!normalized) {
		return '';
	}

	return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Valida una entrada de DNI.
 *
 * Se permiten:
 * - números
 * - puntos
 * - espacios
 *
 * Después de normalizar debe contener entre
 * 7 y 9 dígitos.
 */
export function isValidDni(value: string | null | undefined): boolean {
	const input = (value ?? '').trim();

	if (!input) {
		return false;
	}

	if (!/^[\d.\s]+$/.test(input)) {
		return false;
	}

	const normalized = normalizeDni(input);

	return new RegExp(`^\\d{${DNI_MIN_DIGITS},${DNI_MAX_DIGITS}}$`).test(normalized);
}

/**
 * Variantes utilizadas temporalmente para buscar
 * registros legacy que pudieran haberse guardado
 * con puntos.
 */
export function getDniLookupVariants(value: string): string[] {
	const trimmed = value.trim();
	const normalized = normalizeDni(trimmed);
	const formatted = formatDni(normalized);

	return [...new Set([trimmed, normalized, formatted].filter(Boolean))];
}
