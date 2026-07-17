import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { createSchedule } from '$lib/server/academic/schedule-service';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	// Check permissions
	const roles = (user?.roles || []) as string[];
	const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'];

	if (!roles.some((role) => allowedRoles.includes(role))) {
		redirect(302, '/');
	}

	// Fetch options for form
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

	const teachers = await prisma.teacher.findMany({
		where: { status: 'ACTIVE' },
		orderBy: { lastName: 'asc' },
		select: {
			id: true,
			firstName: true,
			lastName: true
		}
	});

	return {
		locations,
		careers,
		teachers
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const locationId = formData.get('locationId') as string | null;
		const careerId = formData.get('careerId') as string;
		const subjectId = formData.get('subjectId') as string;
		const commissionId = formData.get('commissionId') as string | null;
		const teacherId = formData.get('teacherId') as string | null;
		const yearLevel = parseInt(formData.get('yearLevel') as string);
		const dayOfWeek = formData.get('dayOfWeek') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const classroom = formData.get('classroom') as string | null;
		const observations = formData.get('observations') as string | null;
		const active = formData.get('active') === 'true';

		// Validate required fields
		if (!careerId) {
			return fail(400, { error: 'La carrera es obligatoria' });
		}
		if (!subjectId) {
			return fail(400, { error: 'La materia es obligatoria' });
		}
		if (!yearLevel) {
			return fail(400, { error: 'El año es obligatorio' });
		}
		if (!dayOfWeek) {
			return fail(400, { error: 'El día de la semana es obligatorio' });
		}
		if (!startTime) {
			return fail(400, { error: 'La hora de inicio es obligatoria' });
		}
		if (!endTime) {
			return fail(400, { error: 'La hora de fin es obligatoria' });
		}

		try {
			await createSchedule({
				locationId: locationId || undefined,
				careerId,
				subjectId,
				commissionId: commissionId || undefined,
				teacherId: teacherId || undefined,
				yearLevel,
				dayOfWeek: dayOfWeek as any,
				startTime,
				endTime,
				classroom: classroom || undefined,
				observations: observations || undefined,
				active,
				studyPlanId: undefined
			});

			redirect(302, '/configuracion/horarios');
		} catch (error) {
			return fail(400, { error: (error as Error).message });
		}
	}
};
