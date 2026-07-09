import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFinancialReportMetrics } from '$lib/server/reports/reports.service';
import { checkExplicitPermission } from '$lib/server/reports/report-permissions';
import {
	parseFilters,
	formatApiResponse,
	formatApiError
} from '$lib/server/reports/report-api-helpers';

/**
 * GET /api/reports/financial
 *
 * Returns financial report metrics
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
		return json(formatApiError('Unauthorized'), { status: 401 });
	}

	// Check explicit FINANCIAL_REPORT:read permission
	const hasPermission = await checkExplicitPermission(locals.user, 'FINANCIAL_REPORT', 'read');
	if (!hasPermission) {
		return json(formatApiError('Forbidden: FINANCIAL_REPORT:read required'), { status: 403 });
	}

	try {
		// Parse and validate filters
		const filters = parseFilters(url);

		const result = await getFinancialReportMetrics(filters);
		return json(formatApiResponse(result.data, filters));
	} catch (error) {
		// Handle validation errors
		if (
			error instanceof Error &&
			(error.message.includes('Invalid') || error.message.includes('startDate'))
		) {
			return json(formatApiError(error.message), { status: 400 });
		}

		console.error('Error fetching financial metrics:', error);
		return json(formatApiError('Internal server error'), { status: 500 });
	}
};
