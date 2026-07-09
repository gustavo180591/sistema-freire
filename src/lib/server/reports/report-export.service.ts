// CSV Export Service for Reports Module
// Fase 4: Exportación básica controlada

import { getInstitutionalMetrics } from './institutional-reports.service';
import { getFinancialReportMetrics } from './financial-reports.service';
import { getAcademicReportMetrics } from './academic-reports.service';
import { getAttendanceReportMetrics } from './attendance-reports.service';
import {
	generateCsv,
	generateSafeFilename,
	CSV_HEADERS,
	CSV_HEADER_LABELS
} from './report-export.helpers';
import type { ReportFilters } from './reports.types';

/**
 * Export institutional report as CSV
 */
export async function exportInstitutionalReport(): Promise<{ csv: string; filename: string }> {
	const result = await getInstitutionalMetrics();
	const headers = CSV_HEADERS.institutional;
	const csv = generateCsv([result.data], headers, CSV_HEADER_LABELS.institutional);
	const filename = generateSafeFilename('reporte-institucional');
	return { csv, filename };
}

/**
 * Export financial report as CSV
 */
export async function exportFinancialReport(
	filters?: ReportFilters
): Promise<{ csv: string; filename: string }> {
	const result = await getFinancialReportMetrics(filters);
	const headers = CSV_HEADERS.financial;
	const csv = generateCsv([result.data], headers, CSV_HEADER_LABELS.financial);
	const filename = generateSafeFilename('reporte-financiero');
	return { csv, filename };
}

/**
 * Export academic report as CSV
 */
export async function exportAcademicReport(
	filters?: ReportFilters
): Promise<{ csv: string; filename: string }> {
	const result = await getAcademicReportMetrics(filters);
	const headers = CSV_HEADERS.academic;
	const csv = generateCsv([result.data], headers, CSV_HEADER_LABELS.academic);
	const filename = generateSafeFilename('reporte-academico');
	return { csv, filename };
}

/**
 * Export attendance report as CSV
 */
export async function exportAttendanceReport(
	filters?: ReportFilters
): Promise<{ csv: string; filename: string }> {
	const result = await getAttendanceReportMetrics(filters);
	const headers = CSV_HEADERS.attendance;
	const csv = generateCsv([result.data], headers, CSV_HEADER_LABELS.attendance);
	const filename = generateSafeFilename('reporte-asistencia');
	return { csv, filename };
}
