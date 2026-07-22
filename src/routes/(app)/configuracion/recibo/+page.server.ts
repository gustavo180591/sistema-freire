import { prisma } from '$lib/server/db/prisma';

export async function load() {
	const locations = await prisma.location.findMany({
		select: { id: true, name: true, code: true },
		orderBy: { name: 'asc' }
	});

	return { locations };
}
