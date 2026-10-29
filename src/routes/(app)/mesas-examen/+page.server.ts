import { error, fail, redirect } from '@sveltejs/kit';
import { AuditAction, EvaluationType } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { ExamTableSeriesService } from '$lib/server/academic/exam-table-series-service';
import { EvaluationService } from '$lib/server/academic/evaluation-service';
import { calculateExamRegistrationDeadline } from '$lib/server/academic/business-day-deadline';
import { loadBusinessCalendar } from '$lib/server/academic/business-calendar-service';
import { auditLog } from '$lib/server/audit';
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

	const examYearConfigs = await prisma.examTableYearConfig.findMany({
		where: {
			active: true
		},
		select: {
			year: true,
			julyEnabled: true,
			novemberDecemberEnabled: true
		},
		orderBy: {
			year: 'asc'
		}
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
					yearLevel: true,
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
				}
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
		examYearConfigs,
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

		const responsibleTeacherId = requestedResponsibleTeacherId;
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const firstCallDateValue = formData.get('firstCallDate')?.toString().trim();
		const secondCallDateValue = formData.get('secondCallDate')?.toString().trim();

		const examYear = Number(formData.get('examYear'));
		const examPeriod = formData.get('examPeriod')?.toString().trim();

		const maxScoreValue = Number(formData.get('maxScore') ?? 10);
		const minPassingScoreValue = Number(formData.get('minPassingScore') ?? 6);

		if (
			!careerId ||
			!locationId ||
			!subjectId ||
			!responsibleTeacherId ||
			!firstVocalTeacherId ||
			!secondVocalTeacherId ||
			!title ||
			!firstCallDateValue
		) {
			return fail(400, {
				error:
					'Completá carrera, sede, materia, Presidente, 1.er vocal, 2.º vocal y fecha del primer llamado'
			});
		}

		if (
			!Number.isInteger(examYear) ||
			examYear < 2000 ||
			examYear > 2100 ||
			!['JULY', 'NOVEMBER_DECEMBER'].includes(examPeriod ?? '')
		) {
			return fail(400, {
				error: 'El año o turno de examen seleccionado no es válido'
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

		const dateBelongsToPeriod = (value: string, allowedMonths: number[]) => {
			const year = Number(value.slice(0, 4));
			const month = Number(value.slice(5, 7));

			return year === examYear && allowedMonths.includes(month);
		};

		if (examPeriod === 'JULY') {
			if (!dateBelongsToPeriod(firstCallDateValue, [7])) {
				return fail(400, {
					error: `El turno julio ${examYear} requiere una fecha dentro de julio de ${examYear}`
				});
			}

			if (secondCallDateValue) {
				return fail(400, {
					error: 'El turno julio tiene un único llamado'
				});
			}
		}

		if (examPeriod === 'NOVEMBER_DECEMBER') {
			if (!secondCallDateValue || !secondCallDate) {
				return fail(400, {
					error: 'El turno noviembre–diciembre requiere dos llamados'
				});
			}

			if (
				!dateBelongsToPeriod(firstCallDateValue, [11, 12]) ||
				!dateBelongsToPeriod(secondCallDateValue, [11, 12])
			) {
				return fail(400, {
					error: `Los dos llamados deben estar dentro de noviembre o diciembre de ${examYear}`
				});
			}

			if (secondCallDate <= firstCallDate) {
				return fail(400, {
					error: 'El segundo llamado debe ser posterior al primero'
				});
			}
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
	update: async ({ request, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		await requireExamManagementAccess(user, 'update');

		const formData = await request.formData();

		const seriesId = formData.get('seriesId')?.toString().trim();
		const presidentTeacherId = formData.get('presidentTeacherId')?.toString().trim();
		const firstVocalTeacherId = formData.get('firstVocalTeacherId')?.toString().trim();
		const secondVocalTeacherId = formData.get('secondVocalTeacherId')?.toString().trim();

		const firstCallDateValue = formData.get('firstCallDate')?.toString().trim();
		const secondCallDateValue = formData.get('secondCallDate')?.toString().trim();

		if (
			!seriesId ||
			!presidentTeacherId ||
			!firstVocalTeacherId ||
			!secondVocalTeacherId ||
			!firstCallDateValue
		) {
			return fail(400, {
				error: 'Completá Presidente, 1.er vocal, 2.º vocal y la fecha del primer llamado'
			});
		}

		const series = await prisma.examTableSeries.findUnique({
			where: {
				id: seriesId
			},
			select: {
				id: true,
				evaluations: {
					where: {
						type: EvaluationType.MESA_EXAMEN
					},
					select: {
						id: true,
						examCallNumber: true,
						subjectId: true,
						careerId: true,
						locationId: true,
						responsibleTeacherId: true,
						title: true,
						description: true,
						evaluationDate: true,
						maxScore: true,
						minPassingScore: true,
						gradingMode: true,
						isClosed: true
					},
					orderBy: [{ examCallNumber: 'asc' }, { evaluationDate: 'asc' }]
				}
			}
		});

		if (!series || series.evaluations.length === 0) {
			return fail(404, {
				error: 'Mesa de examen no encontrada'
			});
		}

		const firstEvaluation =
			series.evaluations.find((evaluation) => evaluation.examCallNumber === 1) ??
			series.evaluations[0];

		const secondEvaluation = series.evaluations.find(
			(evaluation) => evaluation.examCallNumber === 2
		);

		if (!firstEvaluation.locationId || !firstEvaluation.careerId) {
			return fail(409, {
				error: 'La mesa no tiene carrera o sede correctamente asociada'
			});
		}

		if (series.evaluations.some((evaluation) => evaluation.isClosed)) {
			return fail(409, {
				error: 'No se puede editar una mesa que ya tiene un llamado cerrado'
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
					error: 'No tenés permiso para editar esta mesa'
				});
			}
		}

		// Se permiten integrantes repetidos si institucionalmente así se decide.
		// Lo único obligatorio es que todos los IDs indicados correspondan a docentes activos.
		const uniqueTribunalTeacherIds = [
			...new Set([presidentTeacherId, firstVocalTeacherId, secondVocalTeacherId])
		];

		const activeTeacherCount = await prisma.teacher.count({
			where: {
				id: {
					in: uniqueTribunalTeacherIds
				},
				status: 'ACTIVE'
			}
		});

		if (activeTeacherCount !== uniqueTribunalTeacherIds.length) {
			return fail(400, {
				error: 'Uno o más integrantes del tribunal no existen o no están activos'
			});
		}

		const firstCallDate = new Date(firstCallDateValue);

		if (Number.isNaN(firstCallDate.getTime())) {
			return fail(400, {
				error: 'La fecha del primer llamado no es válida'
			});
		}

		let secondCallDate: Date | null = null;

		if (secondCallDateValue) {
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

		if (secondEvaluation && !secondCallDate) {
			return fail(400, {
				error: 'Esta mesa ya tiene segundo llamado y debe conservar una fecha'
			});
		}

		const tribunalIdsForLocation = [
			...new Set([presidentTeacherId, firstVocalTeacherId, secondVocalTeacherId])
		];

		const tribunalTeachersAtLocation = await prisma.teacher.count({
			where: {
				id: {
					in: tribunalIdsForLocation
				},
				status: 'ACTIVE',
				user: {
					locationPermissions: {
						some: {
							locationId: firstEvaluation.locationId
						}
					}
				}
			}
		});

		if (tribunalTeachersAtLocation !== tribunalIdsForLocation.length) {
			return fail(400, {
				error: 'Los integrantes del tribunal deben pertenecer a la localidad de la mesa'
			});
		}

		const businessCalendar = await loadBusinessCalendar(prisma);

		const firstRegistrationClosesAt = calculateExamRegistrationDeadline(
			firstCallDate,
			businessCalendar
		);

		const secondRegistrationClosesAt = secondCallDate
			? calculateExamRegistrationDeadline(secondCallDate, businessCalendar)
			: null;

		const evaluationService = new EvaluationService(prisma);
		const secondCallErrorPrefix = 'EXAM_TABLE_SECOND_CALL:';

		try {
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
						registrationClosesAt: firstRegistrationClosesAt
					}
				});

				if (secondEvaluation && secondCallDate && secondRegistrationClosesAt) {
					await tx.evaluation.update({
						where: {
							id: secondEvaluation.id
						},
						data: {
							responsibleTeacherId: presidentTeacherId,
							evaluationDate: secondCallDate,
							registrationClosesAt: secondRegistrationClosesAt
						}
					});
				}

				/*
				 * Permite completar una mesa histórica que tenía solamente
				 * primer llamado agregando el segundo desde la misma fila.
				 */
				if (!secondEvaluation && secondCallDate) {
					const result = await evaluationService.createEvaluation(
						{
							subjectId: firstEvaluation.subjectId,
							careerId: firstEvaluation.careerId!,
							locationId: firstEvaluation.locationId!,
							responsibleTeacherId: presidentTeacherId,
							examTableSeriesId: series.id,
							examCallNumber: 2,
							title: firstEvaluation.title,
							description: firstEvaluation.description ?? undefined,
							type: EvaluationType.MESA_EXAMEN,
							evaluationDate: secondCallDate,
							maxScore: Number(firstEvaluation.maxScore),
							minPassingScore: Number(firstEvaluation.minPassingScore),
							gradingMode: firstEvaluation.gradingMode,
							participatesInAverage: false,
							mandatory: true,
							userId: user.id
						},
						tx
					);

					if ('error' in result) {
						throw new Error(`${secondCallErrorPrefix}${result.error}`);
					}
				}
			});
		} catch (caughtError) {
			if (caughtError instanceof Error && caughtError.message.startsWith(secondCallErrorPrefix)) {
				return fail(400, {
					error: caughtError.message.slice(secondCallErrorPrefix.length)
				});
			}

			throw caughtError;
		}

		await auditLog({
			action: AuditAction.UPDATE,
			entityType: 'ExamTableSeries',
			entityId: series.id,
			description: `Editó la mesa "${firstEvaluation.title}"`,
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
