import { exportFinancialReport } from '$lib/server/reports/report-export.service';
import { checkExplicitPermission } from '$lib/server/reports/report-permissions';
import { parseFilters } from '$lib/server/reports/report-api-helpers';
import type { RequestHandler } from './$types';

/**
 * GET /api/reports/financial/export
 * 
 * Returns financial report as CSV
 * 
 * Permissions:
 * - FINANCIAL_REPORT:read (explicit permission required)
 * 
 * Supported filters:
 * - studentId
 * - startDate
 * - endDate
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Check authentication
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Check explicit FINANCIAL_REPORT:read permission
	const hasPermission = await checkExplicitPermission(locals.user, 'FINANCIAL_REPORT', 'read');
	if (!hasPermission) {
		return new Response('Forbidden: FINANCIAL_REPORT:read required', { status: 403 });
	}

	try {
		// Parse and validate filters
		const filters = parseFilters(url);

		const { csv, filename } = await exportFinancialReport(filters);
		
		return new Response(csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		// Handle validation errors
		if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('startDate'))) {
			return new Response(error.message, { status: 400 });
		}

		console.error('Error exporting financial report:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
