import { exportAttendanceReport } from '$lib/server/reports/report-export.service';
import { checkExplicitPermission } from '$lib/server/reports/report-permissions';
import { parseFilters } from '$lib/server/reports/report-api-helpers';
import type { RequestHandler } from './$types';

/**
 * GET /api/reports/attendance/export
 * 
 * Returns attendance report as CSV
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
		return new Response('Unauthorized', { status: 401 });
	}

	// Check explicit ATTENDANCE:read permission
	const hasPermission = await checkExplicitPermission(locals.user, 'ATTENDANCE', 'read');
	if (!hasPermission) {
		return new Response('Forbidden: ATTENDANCE:read required', { status: 403 });
	}

	try {
		// Parse and validate filters
		const filters = parseFilters(url);

		const { csv, filename } = await exportAttendanceReport(filters);
		
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

		console.error('Error exporting attendance report:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
