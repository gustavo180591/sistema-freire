import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds, requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { listMatrixBookStudents } from '$lib/server/academic/matrix-book-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	if (!user || user.activeRole !== 'PRECEPTOR') {
		throw error(403, 'No tenés permiso para acceder al Libro Matriz');
	}

	requireRole(user, ['PRECEPTOR']);
	await requirePermission(user, 'STUDENT', 'read');

	const locationIds = await getUserAllowedLocationIds(user);

	const search = url.searchParams.get('q')?.trim() ?? '';
	const careerId = url.searchParams.get('careerId')?.trim() ?? '';

	const [students, careers] = await Promise.all([
		listMatrixBookStudents({
			search,
			careerId,
			locationIds
		}),
		prisma.career.findMany({
			where: {
				active: true,
				students: {
					some: {
						locationId: {
							in: locationIds
						}
					}
				}
			},
			select: {
				id: true,
				name: true
			},
			orderBy: {
				name: 'asc'
			}
		})
	]);

	return {
		students,
		careers,
		filters: {
			search,
			careerId
		}
	};
};
