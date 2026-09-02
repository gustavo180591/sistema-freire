import { error, fail, redirect } from '@sveltejs/kit';
import { EvaluationType, GradeStatus } from '@prisma/client';
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

async function requireExamAccess(
	user: App.Locals['user'],
	permission: 'create' | 'read' | 'update' | 'delete'
) {
	if (!user) {
		throw redirect(303, '/login');
	}

	requireRole(user, EXAM_MANAGEMENT_ROLES);
	await requirePermission(user, 'EVALUATION', permission);
}

async function getAccessibleMesa(
	user: NonNullable<App.Locals['user']>,
	evaluationId: string,
	permission: 'read' | 'update'
) {
	await requireExamAccess(user, permission);

	const mesa = await prisma.evaluation.findFirst({
		where: {
			id: evaluationId,
			type: EvaluationType.MESA_EXAMEN
		},
		select: {
			id: true,
			title: true,
			description: true,
			type: true,
			evaluationDate: true,
			createdAt: true,
			registrationOpensAt: true,
			registrationClosesAt: true,
			isClosed: true,
			closedAt: true,
			closedReason: true,
			maxScore: true,
			minPassingScore: true,
			subjectId: true,
			careerId: true,
			locationId: true,
			responsibleTeacherId: true,
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
					code: true,
					name: true
				}
			},
			location: {
				select: {
					id: true,
					code: true,
					name: true,
					city: true
				}
			},
			responsibleTeacher: {
				select: {
					id: true,
					dni: true,
					firstName: true,
					lastName: true
				}
			},
			createdByUser: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			closedByUser: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			}
		}
	});

	if (!mesa) {
		throw error(404, 'Mesa de examen no encontrada');
	}

	if (!mesa.locationId) {
		throw error(409, 'La mesa no tiene una sede asociada y requiere revisión administrativa');
	}

	const isInstitutionalActor = hasRole(user, INSTITUTIONAL_EXAM_ROLES);

	if (isInstitutionalActor) {
		await requireLocationAccess(user.id, mesa.locationId, {
			globalAccessRoles: INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES
		});
	} else {
		const evaluationService = new EvaluationService(prisma);

		if (!(await evaluationService.canUserModifyEvaluation(mesa.id, user.id))) {
			throw error(403, 'No tenés acceso académico a esta mesa de examen');
		}
	}

	return mesa;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	const mesa = await getAccessibleMesa(user, params.id, 'read');

	const registrations = await prisma.examRegistration.findMany({
		where: {
			evaluationId: mesa.id,
			status: 'REGISTERED'
		},
		select: {
			id: true,
			registeredAt: true,
			studentId: true,
			student: {
				select: {
					id: true,
					dni: true,
					firstName: true,
					lastName: true,
					status: true
				}
			}
		},
		orderBy: [
			{
				student: {
					lastName: 'asc'
				}
			},
			{
				student: {
					firstName: 'asc'
				}
			}
		]
	});

	const studentIds = registrations.map((registration) => registration.studentId);

	const [grades, cancelledCount] = await Promise.all([
		studentIds.length === 0
			? Promise.resolve([])
			: prisma.grade.findMany({
					where: {
						evaluationId: mesa.id,
						studentId: {
							in: studentIds
						}
					},
					select: {
						id: true,
						studentId: true,
						value: true,
						status: true,
						observations: true,
						updatedAt: true
					}
				}),
		prisma.examRegistration.count({
			where: {
				evaluationId: mesa.id,
				status: 'CANCELLED'
			}
		})
	]);

	const gradeByStudent = new Map(
		grades.map((grade) => [
			grade.studentId,
			{
				id: grade.id,
				value: grade.value === null ? null : Number(grade.value),
				status: grade.status,
				observations: grade.observations,
				updatedAt: grade.updatedAt
			}
		])
	);

	const evaluationService = new EvaluationService(prisma);

	const canManageMesa =
		!mesa.isClosed && (await evaluationService.canUserModifyEvaluation(mesa.id, user.id));

	const canManageGrades = canManageMesa && mesa.evaluationDate <= new Date();

	const pendingCount = registrations.filter((registration) => {
		const grade = gradeByStudent.get(registration.studentId);

		return !grade || grade.status === GradeStatus.PENDING;
	}).length;

	const opensAt = mesa.registrationOpensAt ?? mesa.createdAt;

	const closesAt = mesa.registrationClosesAt ?? new Date(opensAt.getTime() + 72 * 60 * 60 * 1000);

	const canClose =
		canManageGrades && !mesa.isClosed && mesa.evaluationDate <= new Date() && pendingCount === 0;

	const allowedLocationIds = await getUserAllowedLocationIds(user.id, {
		globalAccessRoles: INSTITUTIONAL_EXAM_GLOBAL_LOCATION_ROLES
	});

	return {
		mesa: {
			...mesa,
			maxScore: Number(mesa.maxScore),
			minPassingScore: Number(mesa.minPassingScore),
			registrationOpensAt: opensAt,
			registrationClosesAt: closesAt
		},
		registrations: registrations.map((registration) => ({
			...registration,
			grade: gradeByStudent.get(registration.studentId) ?? null
		})),
		cancelledCount,
		pendingCount,
		canManageMesa,
		canManageGrades,
		canClose,
		isInstitutionalActor: hasRole(user, INSTITUTIONAL_EXAM_ROLES),
		allowedLocationIds
	};
};

export const actions: Actions = {
	saveGrades: async ({ request, params, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		const mesa = await getAccessibleMesa(user, params.id, 'update');

		const evaluationService = new EvaluationService(prisma);

		if (!(await evaluationService.canUserModifyEvaluation(mesa.id, user.id))) {
			return fail(403, {
				error: 'Solo el docente responsable puede cargar resultados de esta mesa'
			});
		}

		const formData = await request.formData();

		const studentIds = formData
			.getAll('studentId')
			.map((value) => value.toString().trim())
			.filter(Boolean);

		if (studentIds.length === 0) {
			return fail(400, {
				error: 'No hay alumnos inscriptos para guardar'
			});
		}

		const grades = [];

		for (const studentId of studentIds) {
			const statusValue = formData.get(`status:${studentId}`)?.toString().trim();

			if (!statusValue || !Object.values(GradeStatus).includes(statusValue as GradeStatus)) {
				return fail(400, {
					error: 'Uno o más estados de resultado no son válidos'
				});
			}

			const status = statusValue as GradeStatus;

			const rawValue = formData.get(`value:${studentId}`)?.toString().trim();

			let value: number | null = null;

			if (status === GradeStatus.PRESENT) {
				if (!rawValue) {
					return fail(400, {
						error: 'Los alumnos presentes deben tener una nota'
					});
				}

				value = Number(rawValue);

				if (!Number.isFinite(value)) {
					return fail(400, {
						error: 'Una o más notas no son válidas'
					});
				}
			}

			const observations =
				formData.get(`observations:${studentId}`)?.toString().trim() || undefined;

			grades.push({
				studentId,
				status,
				value,
				observations
			});
		}

		const result = await evaluationService.loadExamTableGrades({
			evaluationId: mesa.id,
			grades,
			userId: user.id
		});

		if ('error' in result) {
			return fail(400, {
				error: result.error
			});
		}

		return {
			success: 'Resultados guardados correctamente'
		};
	},

	close: async ({ request, params, locals }) => {
		const user = locals.user;

		if (!user) {
			return fail(401, {
				error: 'No autenticado'
			});
		}

		const mesa = await getAccessibleMesa(user, params.id, 'update');

		const evaluationService = new EvaluationService(prisma);

		if (!(await evaluationService.canUserModifyEvaluation(mesa.id, user.id))) {
			return fail(403, {
				error: 'Solo el docente responsable puede cerrar académicamente esta mesa'
			});
		}

		const formData = await request.formData();

		const reason = formData.get('reason')?.toString().trim() || undefined;

		const result = await evaluationService.closeEvaluation({
			evaluationId: mesa.id,
			userId: user.id,
			reason
		});

		if (result) {
			return fail(400, result);
		}

		return {
			success: 'Mesa de examen cerrada correctamente'
		};
	}
};
