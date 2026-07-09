// CSV Export Helpers for Reports Module
// Fase 4: Exportación básica controlada

/**
 * Escape a field value for CSV
 * - Wrap in quotes if contains comma, quote, newline, or starts with dangerous characters
 * - Escape double quotes by doubling them
 * - Prefix dangerous values with single quote to prevent CSV injection
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}

	const strValue = String(value);

	// Check for CSV injection dangerous prefixes
	const dangerousPrefixes = ['=', '+', '-', '@'];
	if (dangerousPrefixes.some((prefix) => strValue.startsWith(prefix))) {
		return `'${strValue}`;
	}

	// Check if field needs quoting (contains comma, quote, newline, or space)
	const needsQuoting =
		strValue.includes(',') ||
		strValue.includes('"') ||
		strValue.includes('\n') ||
		strValue.includes('\r') ||
		strValue.includes(' ');

	if (needsQuoting) {
		// Escape double quotes by doubling them
		const escaped = strValue.replace(/"/g, '""');
		return `"${escaped}"`;
	}

	return strValue;
}

/**
 * Convert an object to CSV row
 */
export function objectToCsvRow<T extends Record<string, unknown>>(
	obj: T,
	headers: string[]
): string {
	return headers
		.map((header) => escapeCsvField(obj[header] as string | number | boolean | null | undefined))
		.join(',');
}

/**
 * Generate CSV from array of objects
 */
export function generateCsv<T extends Record<string, unknown>>(
	data: T[],
	headers: string[],
	headerLabels?: Record<string, string>
): string {
	const displayHeaders = headerLabels ? headers.map((h) => headerLabels[h] || h) : headers;
	const headerRow = displayHeaders.map(escapeCsvField).join(',');
	const dataRows = data.map((row) => objectToCsvRow(row, headers));
	return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate safe filename for CSV export
 * - Remove dangerous characters
 * - Use timestamp in safe format (YYYY-MM-DDTHHMMSSZ)
 */
export function generateSafeFilename(baseName: string): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	const timestamp = `${year}-${month}-${day}T${hours}${minutes}${seconds}Z`;
	const safeBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
	return `${safeBase}-${timestamp}.csv`;
}

/**
 * CSV headers for each report type
 */
export const CSV_HEADERS: Record<string, string[]> = {
	institutional: [
		'totalStudents',
		'activeStudents',
		'totalTeachers',
		'activeTeachers',
		'totalUsers',
		'activeUsers',
		'totalDocuments',
		'totalCareers',
		'activeCareers',
		'totalSubjects',
		'activeSubjects',
		'totalDebt',
		'totalCollected',
		'totalPending',
		'overdueDebt',
		'averageAttendance',
		'lowAttendanceCount'
	],
	financial: [
		'totalCharges',
		'totalPaid',
		'totalPending',
		'overdueDebt',
		'studentsWithDebt',
		'paymentsCount',
		'totalCollected',
		'receiptsIssued',
		'receiptsCancelled',
		'activeAgreements',
		'overdueAgreements',
		'defaultedAgreements'
	],
	academic: [
		'totalStudents',
		'activeStudents',
		'totalSubjects',
		'activeSubjects',
		'totalTeachers',
		'activeTeachers',
		'totalCommissions',
		'activeCommissions',
		'totalEvaluations',
		'totalGrades',
		'averageGrade',
		'regularCount',
		'libreCount',
		'riskStudents'
	],
	attendance: [
		'totalAttendanceRecords',
		'totalAttendanceEntries',
		'presentCount',
		'absentCount',
		'justifiedCount',
		'unjustifiedCount',
		'averageAttendance'
	]
};

/**
 * CSV header labels (Spanish)
 */
export const CSV_HEADER_LABELS: Record<string, Record<string, string>> = {
	institutional: {
		totalStudents: 'Total Alumnos',
		activeStudents: 'Alumnos Activos',
		totalTeachers: 'Total Docentes',
		activeTeachers: 'Docentes Activos',
		totalUsers: 'Total Usuarios',
		activeUsers: 'Usuarios Activos',
		totalDocuments: 'Total Documentos',
		totalCareers: 'Total Carreras',
		activeCareers: 'Carreras Activas',
		totalSubjects: 'Total Materias',
		activeSubjects: 'Materias Activas',
		totalDebt: 'Deuda Total',
		totalCollected: 'Cobrado Total',
		totalPending: 'Pendiente Total',
		overdueDebt: 'Deuda Vencida',
		averageAttendance: 'Asistencia Promedio',
		lowAttendanceCount: 'Alumnos con Baja Asistencia'
	},
	financial: {
		totalCharges: 'Cargos Totales',
		totalPaid: 'Pagado Total',
		totalPending: 'Pendiente Total',
		overdueDebt: 'Deuda Vencida',
		studentsWithDebt: 'Alumnos con Deuda',
		paymentsCount: 'Cantidad de Pagos',
		totalCollected: 'Total Cobrado',
		receiptsIssued: 'Recibos Emitidos',
		receiptsCancelled: 'Recibos Cancelados',
		activeAgreements: 'Convenios Activos',
		overdueAgreements: 'Convenios Vencidos',
		defaultedAgreements: 'Convenios en Mora'
	},
	academic: {
		totalStudents: 'Total Alumnos',
		activeStudents: 'Alumnos Activos',
		totalSubjects: 'Total Materias',
		activeSubjects: 'Materias Activas',
		totalTeachers: 'Total Docentes',
		activeTeachers: 'Docentes Activos',
		totalCommissions: 'Total Comisiones',
		activeCommissions: 'Comisiones Activas',
		totalEvaluations: 'Total Evaluaciones',
		totalGrades: 'Total Calificaciones',
		averageGrade: 'Promedio de Calificaciones',
		regularCount: 'Alumnos Regulares',
		libreCount: 'Alumnos Libres',
		riskStudents: 'Alumnos en Riesgo'
	},
	attendance: {
		totalAttendanceRecords: 'Registros de Asistencia',
		totalAttendanceEntries: 'Entradas de Asistencia',
		presentCount: 'Presentes',
		absentCount: 'Ausentes',
		justifiedCount: 'Justificados',
		unjustifiedCount: 'Injustificados',
		averageAttendance: 'Asistencia Promedio'
	}
};
