import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAcademicReportMetrics } from '$lib/server/reports/reports.service';
import { checkExplicitPermission } from '$lib/server/reports/report-permissions';
import {
	parseFilters,
	formatApiResponse,
	formatApiError
} from '$lib/server/reports/report-api-helpers';

/**
 * GET /api/reports/academic
 *
 * Returns academic report metrics
 *
 * Permissions:
 * - GRADE:read (explicit permission required for academic reports)
 *
 * Supported filters:
 * - careerId
 * - subjectId
 * - studentId
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Check authentication
	if (!locals.user) {
		return json(formatApiError('Unauthorized'), { status: 401 });
	}

	// Check explicit GRADE:read permission for academic reports
	const hasPermission = await checkExplicitPermission(locals.user, 'GRADE', 'read');
	if (!hasPermission) {
		return json(formatApiError('Forbidden: GRADE:read required'), { status: 403 });
	}

	try {
		// Parse and validate filters
		const filters = parseFilters(url);

		const result = await getAcademicReportMetrics(filters);
		return json(formatApiResponse(result.data, filters));
	} catch (error) {
		// Handle validation errors
		if (
			error instanceof Error &&
			(error.message.includes('Invalid') || error.message.includes('startDate'))
		) {
			return json(formatApiError(error.message), { status: 400 });
		}

		console.error('Error fetching academic metrics:', error);
		return json(formatApiError('Internal server error'), { status: 500 });
	}
};
