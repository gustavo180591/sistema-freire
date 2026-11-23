import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { listPreceptorCohorts } from '$lib/server/preceptor/preceptor-cohort-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	if (!user || user.activeRole !== 'PRECEPTOR') {
		throw error(403, 'No tenés permiso para acceder a las cohortes');
	}

	requireRole(user, ['PRECEPTOR']);
	await requirePermission(user, 'STUDENT', 'read');

	const careerId = url.searchParams.get('careerId')?.trim() ?? '';

	const { cohorts, careers } = await listPreceptorCohorts({
		userId: user.id,
		careerId
	});

	return {
		cohorts,
		careers,
		filters: {
			careerId
		}
	};
};
