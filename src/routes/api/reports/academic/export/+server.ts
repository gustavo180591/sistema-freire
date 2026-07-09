import { exportAcademicReport } from '$lib/server/reports/report-export.service';
import { checkExplicitPermission } from '$lib/server/reports/report-permissions';
import { parseFilters } from '$lib/server/reports/report-api-helpers';
import type { RequestHandler } from './$types';

/**
 * GET /api/reports/academic/export
 *
 * Returns academic report as CSV
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
		return new Response('Unauthorized', { status: 401 });
	}

	// Check explicit GRADE:read permission for academic reports
	const hasPermission = await checkExplicitPermission(locals.user, 'GRADE', 'read');
	if (!hasPermission) {
		return new Response('Forbidden: GRADE:read required', { status: 403 });
	}

	try {
		// Parse and validate filters
		const filters = parseFilters(url);

		const { csv, filename } = await exportAcademicReport(filters);

		return new Response(csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		// Handle validation errors
		if (
			error instanceof Error &&
			(error.message.includes('Invalid') || error.message.includes('startDate'))
		) {
			return new Response(error.message, { status: 400 });
		}

		console.error('Error exporting academic report:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
