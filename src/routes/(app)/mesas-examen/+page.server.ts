import { error, fail, redirect } from '@sveltejs/kit';
import { EvaluationType } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { ExamTableSeriesService } from '$lib/server/academic/exam-table-series-service';
import {
	getUserAllowedLocationIds,
	hasRole,
	requireLocationAccess,
	requireRole
} from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const INSTITUTIONAL_EXAM_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const EXAM_MANAGEMENT_ROLES = [...INSTITUTIONAL_EXAM_ROLES, 'DOCENTE'];

const INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES = ['SUPERADMIN', 'DIRECTOR', 'APODERADO'];

function getRegistrationWindow(evaluation: {
	createdAt: Date;
	registrationOpensAt: Date | null;
	registrationClosesAt: Date | null;
}) {
	const opensAt = evaluation.registrationOpensAt ?? evaluation.createdAt;
	const closesAt =
		evaluation.registrationClosesAt ?? new Date(opensAt.getTime() + 72 * 60 * 60 * 1000);

	return { opensAt, closesAt };
}

function getExamTableStatus(evaluation: {
	isClosed: boolean;
	evaluationDate: Date;
	createdAt: Date;
	registrationOpensAt: Date | null;
	registrationClosesAt: Date | null;
}) {
	const now = new Date();
	const { opensAt, closesAt } = getRegistrationWindow(evaluation);

	if (evaluation.isClosed) {
		return 'CERRADA';
	}

	if (evaluation.evaluationDate <= now) {
		return 'FINALIZADA';
	}

	if (now < opensAt) {
		return 'PROGRAMADA';
	}

	if (now <= closesAt) {
		return 'INSCRIPCION_ABIERTA';
	}

	return 'INSCRIPCION_CERRADA';
}

async function requireExamManagementAccess(
	user: App.Locals['user'],
	permission: 'create' | 'read' | 'update' | 'delete'
) {
	if (!user) {
		throw redirect(303, '/login');
	}

	requireRole(user, EXAM_MANAGEMENT_ROLES);
	await requirePermission(user, 'EVALUATION', permission);
}

async function getActiveTeacherForUser(userId: string) {
	return prisma.teacher.findFirst({
		where: {
			userId,
			status: 'ACTIVE'
		},
		select: {
			id: true,
			dni: true,
			firstName: true,
			lastName: true,
			subjects: {
				select: {
					subjectId: true
				}
			}
		}
	});
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	await requireExamManagementAccess(user, 'read');

	if (!user) {
		throw redirect(303, '/login');
	}

	const isInstitutionalActor = hasRole(user, INSTITUTIONAL_EXAM_ROLES);
	const currentTeacher = isInstitutionalActor ? null : await getActiveTeacherForUser(user.id);

	if (!isInstitutionalActor && !currentTeacher) {
		throw error(403, 'No se encontró un docente activo asociado a tu usuario');
	}

	const allowedLocationIds = await getUserAllowedLocationIds(user, {
		globalAccessRoles: INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES
	});

	const [locations, careers, careerLocations, careerSubjects, teachers, examTableSeries] =
		await Promise.all([
			prisma.location.findMany({
				where: {
					active: true,
					id: {
						in: allowedLocationIds
					}
				},
				select: {
					id: true,
					name: true,
					code: true,
					city: true
				},
				orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
			}),

			prisma.career.findMany({
				where: {
					active: true,
					locations: {
						some: {
							locationId: {
								in: allowedLocationIds
							}
						}
					}
				},
				select: {
					id: true,
					code: true,
					name: true
				},
				orderBy: {
					name: 'asc'
				}
			}),

			prisma.careerLocation.findMany({
				where: {
					locationId: {
						in: allowedLocationIds
					},
					career: {
						active: true
					},
					location: {
						active: true
					}
				},
				select: {
					careerId: true,
					locationId: true
				}
			}),

			prisma.careerSubject.findMany({
				where: {
					career: {
						active: true
					},
					subject: {
						active: true
					}
				},
				select: {
					careerId: true,
					subjectId: true,
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true
						}
					}
				}
			}),

			prisma.teacher.findMany({
				where: {
					status: 'ACTIVE'
				},
				select: {
					id: true,
					dni: true,
					firstName: true,
					lastName: true,
					subjects: {
						select: {
							subjectId: true,
							assignmentType: true
						}
					},
					user: {
						select: {
							locationPermissions: {
								select: {
									locationId: true
								}
							}
						}
					}
				},
				orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
			}),

			prisma.examTableSeries.findMany({
				where: {
					evaluations: {
						some: {
							type: EvaluationType.MESA_EXAMEN,
							locationId: {
								in: allowedLocationIds
							},
							...(currentTeacher ? { responsibleTeacherId: currentTeacher.id } : {})
						}
					}
				},
				select: {
					id: true,
					isHidden: true,
					presidentTeacher: {
						select: {
							id: true,
							firstName: true,
							lastName: true
						}
					},
					firstVocalTeacher: {
						select: {
							id: true,
							firstName: true,
							lastName: true
						}
					},
					secondVocalTeacher: {
						select: {
							id: true,
							firstName: true,
							lastName: true
						}
					},
					evaluations: {
						where: {
							type: EvaluationType.MESA_EXAMEN,
							locationId: {
								in: allowedLocationIds
							},
							...(currentTeacher ? { responsibleTeacherId: currentTeacher.id } : {})
						},
						select: {
							id: true,
							title: true,
							description: true,
							examCallNumber: true,
							evaluationDate: true,
							createdAt: true,
							registrationOpensAt: true,
							registrationClosesAt: true,
							isClosed: true,
							maxScore: true,
							minPassingScore: true,
							subject: {
								select: {
									id: true,
									code: true,
									name: true,
									yearLevel: true
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
							responsibleTeacher: {
								select: {
									id: true,
									firstName: true,
									lastName: true
								}
							},
							createdByUser: {
								select: {
									firstName: true,
									lastName: true
								}
							},
							examRegistrations: {
								select: {
									status: true
								}
							}
						},
						orderBy: [{ examCallNumber: 'asc' }, { evaluationDate: 'asc' }]
					}
				},
				orderBy: {
					updatedAt: 'desc'
				},
				take: 100
			})
		]);

	const currentTeacherSubjectIds = new Set(
		currentTeacher?.subjects.map((assignment) => assignment.subjectId) ?? []
	);

	const visibleCareerSubjects = currentTeacher
		? careerSubjects.filter((relation) => currentTeacherSubjectIds.has(relation.subjectId))
		: careerSubjects;

	const visibleCareerIds = new Set(visibleCareerSubjects.map((relation) => relation.careerId));

	const visibleCareers = currentTeacher
		? careers.filter((career) => visibleCareerIds.has(career.id))
		: careers;

	const sortedCareerSubjects = visibleCareerSubjects.sort((a, b) => {
		if (a.careerId !== b.careerId) {
			return a.careerId.localeCompare(b.careerId);
		}

		if (a.subject.yearLevel !== b.subject.yearLevel) {
			return a.subject.yearLevel - b.subject.yearLevel;
		}

		return a.subject.name.localeCompare(b.subject.name, 'es');
	});

	return {
		examMode: currentTeacher ? 'TEACHER' : 'INSTITUTIONAL',
		currentTeacher: currentTeacher
			? {
					id: currentTeacher.id,
					dni: currentTeacher.dni,
					firstName: currentTeacher.firstName,
					lastName: currentTeacher.lastName
				}
			: null,
		locations,
		careers: visibleCareers,
		careerLocations,
		careerSubjects: sortedCareerSubjects,
		teachers: teachers.map((teacher) => ({
			id: teacher.id,
			dni: teacher.dni,
			firstName: teacher.firstName,
			lastName: teacher.lastName,
			subjectIds: teacher.subjects.map((assignment) => assignment.subjectId),
			locationIds: teacher.user.locationPermissions.map((permission) => permission.locationId)
		})),
		mesas: examTableSeries.flatMap((series) => {
			const firstEvaluation =
				series.evaluations.find((evaluation) => evaluation.examCallNumber === 1) ??
				series.evaluations[0];

			if (!firstEvaluation) {
				return [];
			}

			const secondEvaluation = series.evaluations.find(
				(evaluation) => evaluation.examCallNumber === 2
			);

			const mapCall = (evaluation: (typeof series.evaluations)[number]) => {
				const { opensAt, closesAt } = getRegistrationWindow(evaluation);

				return {
					id: evaluation.id,
					examCallNumber: evaluation.examCallNumber,
					evaluationDate: evaluation.evaluationDate,
					registrationOpensAt: opensAt,
					registrationClosesAt: closesAt,
					status: getExamTableStatus(evaluation),
					isClosed: evaluation.isClosed,
					registeredCount: evaluation.examRegistrations.filter(
						(registration) => registration.status === 'REGISTERED'
					).length
				};
			};

			return [
				{
					id: series.id,
					isHidden: series.isHidden,
					title: firstEvaluation.title,
					description: firstEvaluation.description,
					subject: firstEvaluation.subject,
					career: firstEvaluation.career,
					location: firstEvaluation.location,
					presidentTeacher: series.presidentTeacher ?? firstEvaluation.responsibleTeacher,
					firstVocalTeacher: series.firstVocalTeacher,
					secondVocalTeacher: series.secondVocalTeacher,
					firstCall: mapCall(firstEvaluation),
					secondCall: secondEvaluation ? mapCall(secondEvaluation) : null,
					registeredCount: series.evaluations.reduce(
						(total, evaluation) =>
							total +
							evaluation.examRegistrations.filter(
								(registration) => registration.status === 'REGISTERED'
							).length,
						0
					),
					createdBy: `${firstEvaluation.createdByUser.firstName} ${firstEvaluation.createdByUser.lastName}`
				}
			];
		})
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		await requireExamManagementAccess(user, 'create');

		const isInstitutionalActor = hasRole(user, INSTITUTIONAL_EXAM_ROLES);
		const currentTeacher = isInstitutionalActor ? null : await getActiveTeacherForUser(user.id);

		if (!isInstitutionalActor && !currentTeacher) {
			return fail(403, {
				error: 'No se encontró un docente activo asociado a tu usuario'
			});
		}

		const formData = await request.formData();

		const careerId = formData.get('careerId')?.toString().trim();
		const locationId = formData.get('locationId')?.toString().trim();
		const subjectId = formData.get('subjectId')?.toString().trim();
		const requestedResponsibleTeacherId = formData.get('responsibleTeacherId')?.toString().trim();
		const firstVocalTeacherId = formData.get('firstVocalTeacherId')?.toString().trim() || undefined;
		const secondVocalTeacherId =
			formData.get('secondVocalTeacherId')?.toString().trim() || undefined;

		const responsibleTeacherId = currentTeacher?.id ?? requestedResponsibleTeacherId;
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const firstCallDateValue = formData.get('firstCallDate')?.toString().trim();
		const secondCallDateValue = formData.get('secondCallDate')?.toString().trim();

		const maxScoreValue = Number(formData.get('maxScore') ?? 10);
		const minPassingScoreValue = Number(formData.get('minPassingScore') ?? 6);

		if (
			!careerId ||
			!locationId ||
			!subjectId ||
			!responsibleTeacherId ||
			!title ||
			!firstCallDateValue
		) {
			return fail(400, {
				error:
					'Completá carrera, sede, materia, docente responsable, título y fecha del primer llamado'
			});
		}

		const firstCallDate = new Date(firstCallDateValue);
		const secondCallDate = secondCallDateValue ? new Date(secondCallDateValue) : null;

		if (
			Number.isNaN(firstCallDate.getTime()) ||
			(secondCallDate !== null && Number.isNaN(secondCallDate.getTime()))
		) {
			return fail(400, {
				error: 'Revisá las fechas y horas de los llamados'
			});
		}

		const evaluationDates = secondCallDate ? [firstCallDate, secondCallDate] : [firstCallDate];

		if (
			!Number.isFinite(maxScoreValue) ||
			maxScoreValue <= 0 ||
			!Number.isFinite(minPassingScoreValue) ||
			minPassingScoreValue < 0 ||
			minPassingScoreValue > maxScoreValue
		) {
			return fail(400, {
				error: 'Revisá el puntaje máximo y la nota mínima de aprobación'
			});
		}

		await requireLocationAccess(user, locationId, {
			globalAccessRoles: INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES
		});

		if (
			currentTeacher &&
			!currentTeacher.subjects.some((assignment) => assignment.subjectId === subjectId)
		) {
			return fail(403, {
				error: 'Solo podés crear mesas para materias que tenés asignadas'
			});
		}

		const examTableSeriesService = new ExamTableSeriesService(prisma);

		const result = await examTableSeriesService.createSeries({
			subjectId,
			careerId,
			locationId,
			responsibleTeacherId,
			firstVocalTeacherId,
			secondVocalTeacherId,
			title,
			description: description || undefined,
			evaluationDates,
			maxScore: maxScoreValue,
			minPassingScore: minPassingScoreValue,
			userId: user.id
		});

		if ('error' in result) {
			return fail(400, {
				error: result.error
			});
		}

		const callCount = result.evaluations.length;

		return {
			success:
				callCount === 1
					? `Mesa "${title}" creada correctamente con 1 llamado.`
					: `Mesa "${title}" creada correctamente con 2 llamados.`
		};
	},
	visibility: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		await requireExamManagementAccess(user, 'update');

		const formData = await request.formData();

		const seriesId = formData.get('seriesId')?.toString().trim();
		const isHiddenValue = formData.get('isHidden')?.toString().trim();

		if (!seriesId || !['true', 'false'].includes(isHiddenValue ?? '')) {
			return fail(400, {
				error: 'Solicitud de visibilidad inválida'
			});
		}

		const series = await prisma.examTableSeries.findUnique({
			where: {
				id: seriesId
			},
			select: {
				id: true,
				evaluations: {
					select: {
						id: true,
						locationId: true,
						responsibleTeacherId: true
					},
					orderBy: {
						examCallNumber: 'asc'
					}
				}
			}
		});

		if (!series || series.evaluations.length === 0) {
			return fail(404, {
				error: 'Mesa de examen no encontrada'
			});
		}

		const firstEvaluation = series.evaluations[0];

		if (!firstEvaluation.locationId) {
			return fail(409, {
				error: 'La mesa no tiene una sede asociada'
			});
		}

		const isInstitutionalActor = hasRole(user, INSTITUTIONAL_EXAM_ROLES);

		if (isInstitutionalActor) {
			await requireLocationAccess(user, firstEvaluation.locationId, {
				globalAccessRoles: INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES
			});
		} else {
			const currentTeacher = await getActiveTeacherForUser(user.id);

			if (
				!currentTeacher ||
				!series.evaluations.some(
					(evaluation) => evaluation.responsibleTeacherId === currentTeacher.id
				)
			) {
				return fail(403, {
					error: 'No tenés permiso para modificar esta mesa'
				});
			}
		}

		const examTableSeriesService = new ExamTableSeriesService(prisma);

		const result = await examTableSeriesService.setVisibility({
			seriesId,
			isHidden: isHiddenValue === 'true',
			userId: user.id
		});

		if ('error' in result) {
			return fail(400, {
				error: result.error
			});
		}

		return {
			success: result.isHidden ? 'Mesa ocultada correctamente.' : 'Mesa publicada nuevamente.'
		};
	}
};
