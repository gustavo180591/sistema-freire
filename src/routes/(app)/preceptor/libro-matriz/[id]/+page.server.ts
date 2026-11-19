import { AuditAction } from '@prisma/client';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { getMatrixBook } from '$lib/server/academic/matrix-book-service';

async function requireMatrixBookManagement(user: App.Locals['user'], studentId: string) {
	if (!user || user.activeRole !== 'PRECEPTOR') {
		throw error(403, 'No tenés permiso para administrar el Libro Matriz');
	}

	requireRole(user, ['PRECEPTOR']);
	await requirePermission(user, 'STUDENT', 'update');
	await requireStudentAccess(user, studentId);

	return user;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.activeRole !== 'PRECEPTOR') {
		throw error(403, 'No tenés permiso para acceder al Libro Matriz');
	}

	requireRole(locals.user, ['PRECEPTOR']);
	await requirePermission(locals.user, 'STUDENT', 'read');
	await requireStudentAccess(locals.user, params.id);

	const matrix = await getMatrixBook(params.id);

	if (!matrix) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		matrix
	};
};

export const actions: Actions = {
	saveHeader: async ({ request, params, locals }) => {
		const user = await requireMatrixBookManagement(locals.user, params.id);
		const form = await request.formData();

		const birthPlace = String(form.get('birthPlace') ?? '').trim();
		const entryCertificateTitle = String(form.get('entryCertificateTitle') ?? '').trim();
		const entryCertificateIssuer = String(form.get('entryCertificateIssuer') ?? '').trim();
		const studyPlanId = String(form.get('studyPlanId') ?? '').trim();

		const student = await prisma.student.findUnique({
			where: {
				id: params.id
			},
			select: {
				id: true,
				careerId: true,
				birthPlace: true,
				entryCertificateTitle: true,
				entryCertificateIssuer: true,
				studyPlanId: true
			}
		});

		if (!student) {
			return fail(404, {
				headerError: 'Alumno no encontrado'
			});
		}

		if (studyPlanId) {
			const plan = await prisma.studyPlan.findFirst({
				where: {
					id: studyPlanId,
					careerId: student.careerId,
					active: true
				},
				select: {
					id: true
				}
			});

			if (!plan) {
				return fail(400, {
					headerError: 'El plan seleccionado no pertenece a la carrera del alumno'
				});
			}
		}

		await prisma.$transaction([
			prisma.student.update({
				where: {
					id: student.id
				},
				data: {
					birthPlace: birthPlace || null,
					entryCertificateTitle: entryCertificateTitle || null,
					entryCertificateIssuer: entryCertificateIssuer || null,
					studyPlanId: studyPlanId || null
				}
			}),
			prisma.auditLog.create({
				data: {
					action: AuditAction.UPDATE,
					entityType: 'MatrixBook',
					entityId: student.id,
					description: 'Actualizó la cabecera del Libro Matriz',
					userId: user.id,
					metadata: {
						previous: {
							birthPlace: student.birthPlace,
							entryCertificateTitle: student.entryCertificateTitle,
							entryCertificateIssuer: student.entryCertificateIssuer,
							studyPlanId: student.studyPlanId
						},
						current: {
							birthPlace: birthPlace || null,
							entryCertificateTitle: entryCertificateTitle || null,
							entryCertificateIssuer: entryCertificateIssuer || null,
							studyPlanId: studyPlanId || null
						}
					}
				}
			})
		]);

		return {
			headerSuccess: true,
			message: 'Datos del Libro Matriz actualizados correctamente'
		};
	}
};
