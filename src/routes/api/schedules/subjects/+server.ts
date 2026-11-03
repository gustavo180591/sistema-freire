import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { getAvailableSubjectsForCareerSchedule } from '$lib/server/academic/schedule-service';

export const GET: RequestHandler = async ({ url }) => {
	const careerId = url.searchParams.get('careerId')?.trim() ?? '';
	const rawYearLevel = url.searchParams.get('yearLevel')?.trim() ?? '';
	const yearLevel = Number.parseInt(rawYearLevel, 10);

	if (!careerId || !rawYearLevel || Number.isNaN(yearLevel) || yearLevel < 1) {
		return json([], { status: 400 });
	}

	const subjects = await getAvailableSubjectsForCareerSchedule(careerId, yearLevel);

	return json(subjects);
};
