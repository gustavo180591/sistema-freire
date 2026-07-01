import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttendanceReportMetrics } from '$lib/server/reports/reports.service';
import { checkExplicitPermission } from '$lib/server/reports/report-permissions';
import { parseFilters, formatApiResponse, formatApiError } from '$lib/server/reports/report-api-helpers';

/**
 * GET /api/reports/attendance
 * 
 * Returns attendance report metrics
 * 
 * Permissions:
 * - ATTENDANCE:read (explicit permission required)
 * 
 * Supported filters:
 * - studentId
 * - subjectId
 * - commissionId
 * - startDate
 * - endDate
 * 
 * Note: "justified" absences are based on provisional criterion (presence of notes field),
 * not a formal justification system.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Check authentication
	if (!locals.user) {
		return json(formatApiError('Unauthorized'), { status: 401 });
	}

	// Check explicit ATTENDANCE:read permission
	const hasPermission = await checkExplicitPermission(locals.user, 'ATTENDANCE', 'read');
	if (!hasPermission) {
		return json(formatApiError('Forbidden: ATTENDANCE:read required'), { status: 403 });
	}

	try {
		// Parse and validate filters
		const filters = parseFilters(url);

		const result = await getAttendanceReportMetrics(filters);
		return json(formatApiResponse(result.data, filters));
	} catch (error) {
		// Handle validation errors
		if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('startDate'))) {
			return json(formatApiError(error.message), { status: 400 });
		}

		console.error('Error fetching attendance metrics:', error);
		return json(formatApiError('Internal server error'), { status: 500 });
	}
};
