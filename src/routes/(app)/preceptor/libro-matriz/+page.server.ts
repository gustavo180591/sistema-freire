import { AuditAction } from '@prisma/client';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { listMatrixBookStudents } from '$lib/server/academic/matrix-book-service';
import { getUserAllowedLocationIds, requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	if (!user || user.activeRole !== 'PRECEPTOR') {
		throw error(403, 'No tenés permiso para acceder al Libro Matriz');
	}

	requireRole(user, ['PRECEPTOR']);
	await requirePermission(user, 'STUDENT', 'read');

	const locationIds = await getUserAllowedLocationIds(user);

	const search = url.searchParams.get('q')?.trim() ?? '';
	const careerId = url.searchParams.get('careerId')?.trim() ?? '';

	const [students, careers] = await Promise.all([
		listMatrixBookStudents({
			search,
			careerId,
			locationIds
		}),
		prisma.career.findMany({
			where: {
				active: true,
				students: {
					some: {
						locationId: {
							in: locationIds
						}
					}
				}
			},
			select: {
				id: true,
				name: true
			},
			orderBy: {
				name: 'asc'
			}
		})
	]);

	const visibleCareerIds = [...new Set(students.map((student) => student.career.id))];

	const studyPlans =
		visibleCareerIds.length === 0
			? []
			: await prisma.studyPlan.findMany({
					where: {
						active: true,
						careerId: {
							in: visibleCareerIds
						}
					},
					select: {
						id: true,
						code: true,
						careerId: true,
						name: true
					},
					orderBy: [{ careerId: 'asc' }, { name: 'asc' }]
				});

	return {
		students,
		careers,
		studyPlans,
		filters: {
			search,
			careerId
		}
	};
};

export const actions: Actions = {
	assignPlan: async ({ request, locals }) => {
		const user = locals.user;

		if (!user || user.activeRole !== 'PRECEPTOR') {
			throw error(403, 'No tenés permiso para modificar el Libro Matriz');
		}

		requireRole(user, ['PRECEPTOR']);
		await requirePermission(user, 'STUDENT', 'update');

		const formData = await request.formData();

		const studentId = String(formData.get('studentId') ?? '').trim();
		const planText = String(formData.get('planText') ?? '').trim();

		if (!studentId) {
			return fail(400, {
				planError: 'Alumno inválido'
			});
		}

		if (!planText) {
			return fail(400, {
				planError: 'Escribí el plan de estudios',
				planStudentId: studentId
			});
		}

		if (planText.length > 50) {
			return fail(400, {
				planError: 'El plan no puede superar los 50 caracteres',
				planStudentId: studentId
			});
		}

		await requireStudentAccess(user, studentId);

		const student = await prisma.student.findUnique({
			where: {
				id: studentId
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				careerId: true,
				studyPlanId: true,
				career: {
					select: {
						durationYears: true
					}
				}
			}
		});

		if (!student) {
			return fail(404, {
				planError: 'Alumno no encontrado',
				planStudentId: studentId
			});
		}

		const existingPlan = await prisma.studyPlan.findFirst({
			where: {
				careerId: student.careerId,
				OR: [
					{
						name: {
							equals: planText,
							mode: 'insensitive'
						}
					},
					{
						version: {
							equals: planText,
							mode: 'insensitive'
						}
					}
				]
			},
			select: {
				id: true,
				name: true,
				active: true
			}
		});

		if (existingPlan && !existingPlan.active) {
			return fail(400, {
				planError:
					'Este plan existe pero está inactivo. Un administrador debe habilitarlo nuevamente.',
				planStudentId: studentId
			});
		}

		if (existingPlan && student.studyPlanId === existingPlan.id) {
			return {
				planSuccess: true,
				planStudentId: studentId,
				message: `El alumno ya tiene asignado el plan ${existingPlan.name}`
			};
		}

		const result = await prisma.$transaction(async (tx) => {
			let plan = existingPlan;

			if (!plan) {
				plan = await tx.studyPlan.create({
					data: {
						careerId: student.careerId,
						name: planText,
						version: planText,
						durationYears: student.career.durationYears,
						isDefault: false,
						active: true
					},
					select: {
						id: true,
						name: true,
						active: true
					}
				});
			}

			await tx.student.update({
				where: {
					id: student.id
				},
				data: {
					studyPlanId: plan.id
				}
			});

			await tx.auditLog.create({
				data: {
					action: AuditAction.UPDATE,
					entityType: 'MatrixBook',
					entityId: student.id,
					description: 'Asignó un plan de estudios al Libro Matriz',
					userId: user.id,
					metadata: {
						studentId: student.id,
						studentName: `${student.lastName}, ${student.firstName}`,
						previousStudyPlanId: student.studyPlanId,
						studyPlanId: plan.id,
						studyPlan: plan.name,
						createdFromMatrixBook: !existingPlan
					}
				}
			});

			return plan;
		});

		return {
			planSuccess: true,
			planStudentId: studentId,
			message: `Plan ${result.name} asignado correctamente`
		};
	}
};
