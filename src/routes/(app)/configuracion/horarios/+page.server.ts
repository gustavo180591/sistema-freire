import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { getSchedulesGrouped } from '$lib/server/academic/schedule-service';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = locals.user;

	// Check permissions
	const roles = (user?.roles || []) as string[];
	const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'];

	if (!roles.some((role) => allowedRoles.includes(role))) {
		redirect(302, '/');
	}

	// Get filter parameters
	const locationId = url.searchParams.get('locationId') || '';
	const careerId = url.searchParams.get('careerId') || '';
	const yearLevel = url.searchParams.get('yearLevel') || '';
	const active = url.searchParams.get('active') || '';

	// Fetch filter options
	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true
		}
	});

	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true
		}
	});

	// Fetch schedules with filters
	const filters: any = {};
	if (locationId) filters.locationId = locationId;
	if (careerId) filters.careerId = careerId;
	if (yearLevel) filters.yearLevel = parseInt(yearLevel);
	if (active) filters.active = active === 'true';

	const groupedSchedules = await getSchedulesGrouped(filters);

	return {
		locations,
		careers,
		schedules: groupedSchedules,
		filters: {
			locationId,
			careerId,
			yearLevel,
			active
		}
	};
};
