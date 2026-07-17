import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const subjectId = url.searchParams.get('subjectId');

	if (!subjectId) {
		return json([], { status: 400 });
	}

	const commissions = await prisma.subjectCommission.findMany({
		where: {
			subjectId,
			active: true
		},
		select: {
			id: true,
			code: true
		},
		orderBy: {
			code: 'asc'
		}
	});

	return json(commissions);
};
