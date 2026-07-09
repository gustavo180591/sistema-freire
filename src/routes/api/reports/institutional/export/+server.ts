import { exportInstitutionalReport } from '$lib/server/reports/report-export.service';
import { isSuperAdmin } from '$lib/server/reports/report-permissions';
import type { RequestHandler } from './$types';

/**
 * GET /api/reports/institutional/export
 *
 * Returns institutional report as CSV
 *
 * Permissions:
 * - SUPERADMIN only
 *
 * No filters supported
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Check SUPERADMIN permission
	if (!isSuperAdmin(locals.user)) {
		return new Response('Forbidden: SUPERADMIN only', { status: 403 });
	}

	try {
		const { csv, filename } = await exportInstitutionalReport();

		return new Response(csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		console.error('Error exporting institutional report:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
