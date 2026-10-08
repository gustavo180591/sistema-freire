import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRoleHomeRoute, ROLE_DESCRIPTIONS, ROLE_LABELS } from '$lib/server/auth/active-role';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	if (user.assignedRoles.length === 0) {
		throw redirect(303, '/');
	}

	if (user.assignedRoles.length === 1) {
		throw redirect(303, getRoleHomeRoute(user.assignedRoles[0]));
	}

	return {
		userName: `${user.firstName} ${user.lastName}`,
		activeRole: user.activeRole,
		roles: user.assignedRoles.map((role) => ({
			code: role,
			label: ROLE_LABELS[role],
			description: ROLE_DESCRIPTIONS[role]
		}))
	};
};
