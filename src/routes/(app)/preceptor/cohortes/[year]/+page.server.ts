import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { listPreceptorCohortStudents } from '$lib/server/preceptor/preceptor-cohort-service';

function parseCohortYear(value: string): number {
	if (!/^\d{4}$/.test(value)) {
		throw error(404, 'Cohorte no válida');
	}

	const year = Number(value);

	if (!Number.isInteger(year) || year < 1900 || year > 2200) {
		throw error(404, 'Cohorte no válida');
	}

	return year;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = locals.user;

	if (!user || user.activeRole !== 'PRECEPTOR') {
		throw error(403, 'No tenés permiso para acceder a las cohortes');
	}

	requireRole(user, ['PRECEPTOR']);
	await requirePermission(user, 'STUDENT', 'read');

	const cohortYear = parseCohortYear(params.year);
	const careerId = url.searchParams.get('careerId')?.trim() ?? '';
	const search = url.searchParams.get('q')?.trim() ?? '';

	const { students, careers } = await listPreceptorCohortStudents({
		userId: user.id,
		instituteYear: cohortYear,
		careerId,
		search
	});

	return {
		cohortYear,
		students,
		careers,
		filters: {
			careerId,
			search
		}
	};
};
