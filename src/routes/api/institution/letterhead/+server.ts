import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { getInstitutionalLetterheadAsset } from '$lib/server/institution/institutional-letterhead-service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Usuario no autenticado');
	}

	const asset = await getInstitutionalLetterheadAsset();

	return new Response(new Uint8Array(asset.buffer), {
		headers: {
			'Content-Type': asset.mimeType,
			'Content-Length': String(asset.buffer.length),
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
