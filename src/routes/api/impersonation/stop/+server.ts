import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stopImpersonation } from '$lib/server/auth/impersonation-service';

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	const authenticatedUser = locals.authenticatedUser;

	if (!authenticatedUser || !locals.sessionId) {
		throw error(401, 'Sesión inválida');
	}

	if (!authenticatedUser.roles.includes('SUPERADMIN')) {
		throw error(403, 'No autorizado');
	}

	if (!locals.impersonation) {
		throw redirect(303, '/dashboard');
	}

	let ip: string | undefined;

	try {
		ip = getClientAddress();
	} catch {
		ip = undefined;
	}

	const result = await stopImpersonation({
		sessionId: locals.sessionId,
		actorUserId: authenticatedUser.id,
		ip,
		userAgent: request.headers.get('user-agent') ?? undefined
	});

	throw redirect(303, result.redirectTo);
};
