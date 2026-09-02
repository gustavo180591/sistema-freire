import { error, fail, redirect } from '@sveltejs/kit';
import { EvaluationType, GradingMode } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { EvaluationService } from '$lib/server/academic/evaluation-service';
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

	const allowedLocationIds = await getUserAllowedLocationIds(user.id, {
		globalAccessRoles: INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES
	});

	const [locations, careers, careerLocations, careerSubjects, teachers, evaluations] =
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
					status: 'ACTIVE',
					...(currentTeacher ? { id: currentTeacher.id } : {})
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

			prisma.evaluation.findMany({
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
				orderBy: [{ evaluationDate: 'desc' }, { createdAt: 'desc' }],
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
		mesas: evaluations.map((evaluation) => {
			const { opensAt, closesAt } = getRegistrationWindow(evaluation);

			return {
				id: evaluation.id,
				title: evaluation.title,
				description: evaluation.description,
				evaluationDate: evaluation.evaluationDate,
				registrationOpensAt: opensAt,
				registrationClosesAt: closesAt,
				isClosed: evaluation.isClosed,
				status: getExamTableStatus(evaluation),
				maxScore: Number(evaluation.maxScore),
				minPassingScore: Number(evaluation.minPassingScore),
				subject: evaluation.subject,
				career: evaluation.career,
				location: evaluation.location,
				responsibleTeacher: evaluation.responsibleTeacher,
				createdBy: `${evaluation.createdByUser.firstName} ${evaluation.createdByUser.lastName}`,
				registeredCount: evaluation.examRegistrations.filter(
					(registration) => registration.status === 'REGISTERED'
				).length
			};
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

		const responsibleTeacherId = currentTeacher?.id ?? requestedResponsibleTeacherId;
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const evaluationDateValue = formData.get('evaluationDate')?.toString().trim();

		const maxScoreValue = Number(formData.get('maxScore') ?? 10);
		const minPassingScoreValue = Number(formData.get('minPassingScore') ?? 6);

		if (
			!careerId ||
			!locationId ||
			!subjectId ||
			!responsibleTeacherId ||
			!title ||
			!evaluationDateValue
		) {
			return fail(400, {
				error: 'Completá carrera, sede, materia, docente responsable, título y fecha de la mesa'
			});
		}

		const evaluationDate = new Date(evaluationDateValue);

		if (Number.isNaN(evaluationDate.getTime())) {
			return fail(400, {
				error: 'La fecha y hora de la mesa no son válidas'
			});
		}

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

		await requireLocationAccess(user.id, locationId, {
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

		const evaluationService = new EvaluationService(prisma);

		const result = await evaluationService.createEvaluation({
			subjectId,
			careerId,
			locationId,
			responsibleTeacherId,
			title,
			description: description || undefined,
			type: EvaluationType.MESA_EXAMEN,
			evaluationDate,
			maxScore: maxScoreValue,
			minPassingScore: minPassingScoreValue,
			gradingMode: GradingMode.NUMERIC,
			participatesInAverage: false,
			mandatory: true,
			userId: user.id
		});

		if ('error' in result) {
			return fail(400, {
				error: result.error
			});
		}

		return {
			success: `Mesa "${result.title}" creada correctamente. La inscripción estará abierta durante 72 horas.`
		};
	}
};
