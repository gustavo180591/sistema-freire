import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const CONFIGURATION_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] as const;

function canAccessConfiguration(user: App.Locals['user']): boolean {
	if (!user) {
		return false;
	}

	return user.roles.some((role) =>
		CONFIGURATION_ROLES.some((configurationRole) => configurationRole === role)
	);
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Usuario no autenticado');
	}

	if (!canAccessConfiguration(user)) {
		throw error(403, 'No tenés permisos para acceder a Configuración');
	}

	return {
		user
	};
};
