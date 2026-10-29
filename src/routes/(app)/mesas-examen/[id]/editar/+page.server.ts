import { AuditAction, EvaluationType } from '@prisma/client';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { calculateExamRegistrationDeadline } from '$lib/server/academic/business-day-deadline';
import { loadBusinessCalendar } from '$lib/server/academic/business-calendar-service';
import { hasRole, requireLocationAccess, requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const INSTITUTIONAL_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];
const MANAGEMENT_ROLES = [...INSTITUTIONAL_ROLES, 'DOCENTE'];
const GLOBAL_LOCATION_ROLES = ['SUPERADMIN', 'DIRECTOR', 'APODERADO'];

async function requireUpdateAccess(user: App.Locals['user']) {
	if (!user) throw redirect(303, '/login');

	requireRole(user, MANAGEMENT_ROLES);
	await requirePermission(user, 'EVALUATION', 'update');
}

async function getSeries(user: NonNullable<App.Locals['user']>, evaluationId: string) {
	await requireUpdateAccess(user);

	const evaluation = await prisma.evaluation.findFirst({
		where: {
			id: evaluationId,
			type: EvaluationType.MESA_EXAMEN
		},
		select: {
			examTableSeriesId: true,
			locationId: true
		}
	});

	if (!evaluation?.examTableSeriesId) {
		throw error(404, 'Mesa de examen no encontrada');
	}

	if (!evaluation.locationId) {
		throw error(409, 'La mesa no tiene una localidad asociada');
	}

	const series = await prisma.examTableSeries.findUnique({
		where: {
			id: evaluation.examTableSeriesId
		},
		select: {
			id: true,
			isHidden: true,
			presidentTeacherId: true,
			firstVocalTeacherId: true,
			secondVocalTeacherId: true,
			evaluations: {
				where: {
					type: EvaluationType.MESA_EXAMEN
				},
				select: {
					id: true,
					examCallNumber: true,
					title: true,
					evaluationDate: true,
					createdAt: true,
					registrationOpensAt: true,
					registrationClosesAt: true,
					responsibleTeacherId: true,
					isClosed: true,
					subject: {
						select: {
							id: true,
							code: true,
							name: true
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
					}
				},
				orderBy: [{ examCallNumber: 'asc' }, { evaluationDate: 'asc' }]
			}
		}
	});

	if (!series || series.evaluations.length === 0) {
		throw error(404, 'Serie de mesa de examen no encontrada');
	}

	const firstEvaluation = series.evaluations[0];

	if (hasRole(user, INSTITUTIONAL_ROLES)) {
		await requireLocationAccess(user, evaluation.locationId, {
			globalAccessRoles: GLOBAL_LOCATION_ROLES
		});
	} else {
		const teacher = await prisma.teacher.findFirst({
			where: {
				userId: user.id,
				status: 'ACTIVE'
			},
			select: {
				id: true
			}
		});

		if (!teacher || !series.evaluations.some((item) => item.responsibleTeacherId === teacher.id)) {
			throw error(403, 'No tenés permiso para editar esta mesa');
		}
	}

	return {
		...series,
		firstEvaluation
	};
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) throw redirect(303, '/login');

	const series = await getSeries(user, params.id);

	const teachers = await prisma.teacher.findMany({
		where: {
			status: 'ACTIVE'
		},
		select: {
			id: true,
			dni: true,
			firstName: true,
			lastName: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	return {
		series,
		teachers
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		const series = await getSeries(user, params.id);

		if (series.evaluations.some((evaluation) => evaluation.isClosed)) {
			return fail(409, {
				error: 'No se puede editar una mesa que ya tiene un llamado cerrado'
			});
		}

		const formData = await request.formData();

		const presidentTeacherId = formData.get('presidentTeacherId')?.toString().trim();
		const firstVocalTeacherId = formData.get('firstVocalTeacherId')?.toString().trim();
		const secondVocalTeacherId = formData.get('secondVocalTeacherId')?.toString().trim();

		const firstCallDateValue = formData.get('firstCallDate')?.toString().trim();
		const secondCallDateValue = formData.get('secondCallDate')?.toString().trim();

		if (
			!presidentTeacherId ||
			!firstVocalTeacherId ||
			!secondVocalTeacherId ||
			!firstCallDateValue
		) {
			return fail(400, {
				error: 'Completá Presidente, 1.er vocal, 2.º vocal y las fechas requeridas'
			});
		}

		const tribunalIds = [presidentTeacherId, firstVocalTeacherId, secondVocalTeacherId];

		const uniqueTribunalIds = [...new Set(tribunalIds)];

		const activeTeachers = await prisma.teacher.count({
			where: {
				id: {
					in: uniqueTribunalIds
				},
				status: 'ACTIVE'
			}
		});

		if (activeTeachers !== uniqueTribunalIds.length) {
			return fail(400, {
				error: 'Los tres integrantes del tribunal deben ser docentes activos'
			});
		}

		const firstEvaluation =
			series.evaluations.find((evaluation) => evaluation.examCallNumber === 1) ??
			series.evaluations[0];

		const secondEvaluation = series.evaluations.find(
			(evaluation) => evaluation.examCallNumber === 2
		);

		const firstCallDate = new Date(firstCallDateValue);

		if (Number.isNaN(firstCallDate.getTime())) {
			return fail(400, {
				error: 'La fecha del primer llamado no es válida'
			});
		}

		let secondCallDate: Date | null = null;

		if (secondEvaluation) {
			if (!secondCallDateValue) {
				return fail(400, {
					error: 'Esta mesa tiene dos llamados y requiere la fecha del segundo llamado'
				});
			}

			secondCallDate = new Date(secondCallDateValue);

			if (Number.isNaN(secondCallDate.getTime())) {
				return fail(400, {
					error: 'La fecha del segundo llamado no es válida'
				});
			}

			if (secondCallDate <= firstCallDate) {
				return fail(400, {
					error: 'El segundo llamado debe ser posterior al primero'
				});
			}
		}

		const businessCalendar = await loadBusinessCalendar(prisma);

		const firstDeadline = calculateExamRegistrationDeadline(firstCallDate, businessCalendar);

		const secondDeadline =
			secondEvaluation && secondCallDate
				? calculateExamRegistrationDeadline(secondCallDate, businessCalendar)
				: null;

		await prisma.$transaction(async (tx) => {
			await tx.examTableSeries.update({
				where: {
					id: series.id
				},
				data: {
					presidentTeacherId,
					firstVocalTeacherId,
					secondVocalTeacherId
				}
			});

			await tx.evaluation.update({
				where: {
					id: firstEvaluation.id
				},
				data: {
					responsibleTeacherId: presidentTeacherId,
					evaluationDate: firstCallDate,
					registrationClosesAt: firstDeadline
				}
			});

			if (secondEvaluation && secondCallDate && secondDeadline) {
				await tx.evaluation.update({
					where: {
						id: secondEvaluation.id
					},
					data: {
						responsibleTeacherId: presidentTeacherId,
						evaluationDate: secondCallDate,
						registrationClosesAt: secondDeadline
					}
				});
			}
		});

		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'ExamTableSeries',
			entityId: series.id,
			description: `Editó tribunal y fechas de "${firstEvaluation.title}"`,
			userId: user.id,
			metadata: {
				presidentTeacherId,
				firstVocalTeacherId,
				secondVocalTeacherId,
				firstCallDate: firstCallDate.toISOString(),
				secondCallDate: secondCallDate?.toISOString() ?? null
			}
		});

		return {
			success: 'Mesa actualizada correctamente'
		};
	}
};
