import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInstitutionalMetrics } from '$lib/server/reports/reports.service';
import { isSuperAdmin } from '$lib/server/reports/report-permissions';
import { formatApiResponse, formatApiError } from '$lib/server/reports/report-api-helpers';

/**
 * GET /api/reports/institutional
 * 
 * Returns institutional KPIs
 * 
 * Permissions:
 * - SUPERADMIN only
 * 
 * No filters supported
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return json(formatApiError('Unauthorized'), { status: 401 });
	}

	// Check SUPERADMIN permission
	if (!isSuperAdmin(locals.user)) {
		return json(formatApiError('Forbidden: SUPERADMIN only'), { status: 403 });
	}

	try {
		const result = await getInstitutionalMetrics();
		return json(formatApiResponse(result.data));
	} catch (error) {
		console.error('Error fetching institutional metrics:', error);
		return json(formatApiError('Internal server error'), { status: 500 });
	}
};
