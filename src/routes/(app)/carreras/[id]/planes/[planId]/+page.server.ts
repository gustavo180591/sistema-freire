import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');

	requirePermission(user, 'CAREER', 'read');

	const studyPlan = await prisma.studyPlan.findUnique({
		where: {
			id: params.planId
		},
		include: {
			career: {
				select: {
					id: true,
					code: true,
					name: true
				}
			},
			subjects: {
				include: {
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				},
				orderBy: {
					sortOrder: 'asc'
				}
			}
		}
	});

	if (!studyPlan) {
		throw error(404, 'Plan de estudio no encontrado');
	}

	if (studyPlan.careerId !== params.id) {
		throw error(404, 'Plan de estudio no pertenece a esta carrera');
	}

	const normalizedPlan = {
		id: studyPlan.id,
		name: studyPlan.name,
		version: studyPlan.version,
		durationYears: studyPlan.durationYears,
		active: studyPlan.active,
		createdAt: studyPlan.createdAt,
		updatedAt: studyPlan.updatedAt,
		career: studyPlan.career,
		subjects: studyPlan.subjects.map((ps) => ({
			id: ps.subject.id,
			code: ps.subject.code,
			name: ps.subject.name,
			yearLevel: ps.subject.yearLevel,
			active: ps.subject.active,
			sortOrder: ps.sortOrder
		}))
	};

	return {
		plan: normalizedPlan,
		metrics: {
			totalSubjects: normalizedPlan.subjects.length,
			totalYears: normalizedPlan.durationYears
		}
	};
};

export const actions: Actions = {
	removeSubject: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		requirePermission(user, 'CAREER', 'update');

		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'ID de materia requerido' });
		}

		try {
			await prisma.planSubject.deleteMany({
				where: {
					planId: params.planId,
					subjectId
				}
			});

			return { success: true };
		} catch (e) {
			console.error('Error removing subject from plan:', e);
			return fail(500, { error: 'Error al eliminar la materia del plan' });
		}
	}
};
