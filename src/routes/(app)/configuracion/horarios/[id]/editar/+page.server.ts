import { error, fail, redirect } from '@sveltejs/kit';
import { WeekDay } from '@prisma/client';

import type { Actions, PageServerLoad } from './$types';

import { prisma } from '$lib/server/db/prisma';
import { updateSchedule } from '$lib/server/academic/schedule-service';

const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'];

function hasPermission(user: App.Locals['user']) {
	const roles = (user?.roles ?? []) as string[];
	return roles.some((role) => allowedRoles.includes(role));
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!hasPermission(locals.user)) {
		throw redirect(302, '/');
	}

	const schedule = await prisma.classSchedule.findUnique({
		where: {
			id: params.id
		},
		include: {
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			location: {
				select: {
					id: true,
					name: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		}
	});

	if (!schedule) {
		throw error(404, 'El horario solicitado no existe');
	}

	const [locations, careers, teachers] = await Promise.all([
		prisma.location.findMany({
			where: {
				active: true
			},
			orderBy: {
				name: 'asc'
			},
			select: {
				id: true,
				name: true
			}
		}),

		prisma.career.findMany({
			where: {
				active: true
			},
			orderBy: {
				name: 'asc'
			},
			select: {
				id: true,
				name: true
			}
		}),

		prisma.teacher.findMany({
			where: {
				status: 'ACTIVE'
			},
			orderBy: [
				{
					lastName: 'asc'
				},
				{
					firstName: 'asc'
				}
			],
			select: {
				id: true,
				firstName: true,
				lastName: true
			}
		})
	]);

	const studyPlan = await prisma.studyPlan.findFirst({
		where: {
			careerId: schedule.careerId,
			active: true
		},
		orderBy: {
			isDefault: 'desc'
		}
	});

	const subjects = studyPlan
		? await prisma.planSubject.findMany({
				where: {
					planId: studyPlan.id,
					subject: {
						active: true,
						yearLevel: schedule.yearLevel
					}
				},
				include: {
					subject: {
						select: {
							id: true,
							name: true,
							code: true,
							yearLevel: true
						}
					}
				},
				orderBy: {
					sortOrder: 'asc'
				}
			})
		: [];

	const commissions = await prisma.subjectCommission.findMany({
		where: {
			subjectId: schedule.subjectId,
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

	return {
		schedule: {
			id: schedule.id,
			locationId: schedule.locationId ?? '',
			careerId: schedule.careerId,
			studyPlanId: schedule.studyPlanId ?? '',
			subjectId: schedule.subjectId,
			commissionId: schedule.commissionId ?? '',
			teacherId: schedule.teacherId ?? '',
			yearLevel: schedule.yearLevel,
			dayOfWeek: schedule.dayOfWeek,
			startTime: schedule.startTime,
			endTime: schedule.endTime,
			classroom: schedule.classroom ?? '',
			observations: schedule.observations ?? '',
			active: schedule.active,
			subject: schedule.subject,
			career: schedule.career,
			location: schedule.location,
			teacher: schedule.teacher,
			commission: schedule.commission
		},
		locations,
		careers,
		teachers,
		subjects: subjects.map((item) => item.subject),
		commissions
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!hasPermission(locals.user)) {
			return fail(403, {
				error: 'No tenés permiso para editar horarios'
			});
		}

		const existingSchedule = await prisma.classSchedule.findUnique({
			where: {
				id: params.id
			},
			select: {
				id: true
			}
		});

		if (!existingSchedule) {
			return fail(404, {
				error: 'El horario solicitado no existe'
			});
		}

		const formData = await request.formData();

		const locationId = String(formData.get('locationId') ?? '');
		const careerId = String(formData.get('careerId') ?? '');
		const subjectId = String(formData.get('subjectId') ?? '');
		const commissionId = String(formData.get('commissionId') ?? '');
		const teacherId = String(formData.get('teacherId') ?? '');
		const yearLevel = Number(formData.get('yearLevel'));
		const dayOfWeekRaw = String(formData.get('dayOfWeek') ?? '');
		const startTime = String(formData.get('startTime') ?? '');
		const endTime = String(formData.get('endTime') ?? '');
		const classroom = String(formData.get('classroom') ?? '').trim();
		const observations = String(formData.get('observations') ?? '').trim();
		const active = String(formData.get('active') ?? '') === 'true';

		if (!careerId) {
			return fail(400, {
				error: 'La carrera es obligatoria'
			});
		}

		if (!subjectId) {
			return fail(400, {
				error: 'La materia es obligatoria'
			});
		}

		if (!Number.isInteger(yearLevel) || yearLevel < 1) {
			return fail(400, {
				error: 'El año es obligatorio'
			});
		}

		if (!Object.values(WeekDay).includes(dayOfWeekRaw as WeekDay)) {
			return fail(400, {
				error: 'El día seleccionado no es válido'
			});
		}

		if (!startTime) {
			return fail(400, {
				error: 'La hora de inicio es obligatoria'
			});
		}

		if (!endTime) {
			return fail(400, {
				error: 'La hora de finalización es obligatoria'
			});
		}

		try {
			await updateSchedule(params.id, {
				locationId: locationId || undefined,
				careerId,
				subjectId,
				commissionId: commissionId || undefined,
				teacherId: teacherId || undefined,
				yearLevel,
				dayOfWeek: dayOfWeekRaw as WeekDay,
				startTime,
				endTime,
				classroom: classroom || undefined,
				observations: observations || undefined,
				active
			});
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'No se pudo actualizar el horario'
			});
		}

		throw redirect(303, '/configuracion/horarios');
	}
};
