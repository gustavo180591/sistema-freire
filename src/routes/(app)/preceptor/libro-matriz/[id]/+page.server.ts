import { AcademicRecordSource, AuditAction, SubjectAccreditationType } from '@prisma/client';
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
	},
	saveGrades: async ({ request, params, locals }) => {
		const user = await requireMatrixBookManagement(locals.user, params.id);
		const form = await request.formData();

		const matrix = await getMatrixBook(params.id);

		if (!matrix) {
			return fail(404, {
				gradeError: 'Alumno no encontrado'
			});
		}

		if (matrix.curriculumSource !== 'STUDY_PLAN') {
			return fail(400, {
				gradeError: 'Asigná primero un plan de estudios antes de cargar datos académicos.'
			});
		}

		const DEFAULT_ESTABLISHMENT = 'ISFD "Paulo Freire" 1117';

		const subjects = matrix.years.flatMap((year) =>
			year.rows.map((row) => ({
				subjectId: row.subjectId,
				name: row.name
			}))
		);

		const subjectIds = subjects.map((subject) => subject.subjectId);

		const existingAccreditations = await prisma.subjectAccreditation.findMany({
			where: {
				studentId: params.id,
				subjectId: {
					in: subjectIds
				}
			},
			select: {
				id: true,
				subjectId: true,
				grade: true,
				folio: true,
				accreditedAt: true,
				establishment: true
			}
		});

		const accreditationBySubject = new Map(
			existingAccreditations.map((accreditation) => [accreditation.subjectId, accreditation])
		);

		const changes: Array<{
			subjectId: string;
			subjectName: string;
			grade: number | null;
			folio: string | null;
			accreditedAt: Date | null;
			establishment: string | null;
			previous: {
				grade: number | null;
				folio: string | null;
				accreditedAt: string | null;
				establishment: string | null;
			};
		}> = [];

		for (const subject of subjects) {
			const gradeField = `grade:${subject.subjectId}`;
			const folioField = `folio:${subject.subjectId}`;
			const dateField = `accreditedAt:${subject.subjectId}`;
			const establishmentOtherField = `establishmentOther:${subject.subjectId}`;

			// El formulario de cada año solo envía las materias de ese año.
			if (
				!form.has(gradeField) &&
				!form.has(folioField) &&
				!form.has(dateField) &&
				!form.has(establishmentOtherField)
			) {
				continue;
			}

			const existing = accreditationBySubject.get(subject.subjectId);

			const rawGrade = String(form.get(gradeField) ?? '').trim();
			const rawFolio = String(form.get(folioField) ?? '').trim();
			const rawDate = String(form.get(dateField) ?? '').trim();

			const rawOtherEstablishment = String(form.get(establishmentOtherField) ?? '').trim();

			// No crear acreditaciones completamente vacías.
			if (!existing && !rawGrade && !rawFolio && !rawDate) {
				continue;
			}

			// -------------------------------------------------
			// Nota
			// -------------------------------------------------

			let grade: number | null = null;

			if (rawGrade) {
				const normalizedGrade = rawGrade.replace(',', '.');

				if (!/^(?:10|[0-9])(?:\.\d{1,2})?$/.test(normalizedGrade)) {
					return fail(400, {
						gradeError: `La nota de ${subject.name} no tiene un formato válido.`
					});
				}

				grade = Math.round(Number(normalizedGrade) * 100) / 100;

				if (!Number.isFinite(grade) || grade < 0 || grade > 10) {
					return fail(400, {
						gradeError: `La nota de ${subject.name} debe estar entre 0 y 10.`
					});
				}
			}

			// -------------------------------------------------
			// Folio
			// -------------------------------------------------

			if (rawFolio.length > 100) {
				return fail(400, {
					gradeError: `El folio de ${subject.name} es demasiado largo.`
				});
			}

			const folio = rawFolio || null;

			// -------------------------------------------------
			// Fecha
			// -------------------------------------------------

			let accreditedAt: Date | null = null;

			if (rawDate) {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
					return fail(400, {
						gradeError: `La fecha de ${subject.name} no es válida.`
					});
				}

				accreditedAt = new Date(`${rawDate}T00:00:00.000Z`);

				if (
					Number.isNaN(accreditedAt.getTime()) ||
					accreditedAt.toISOString().slice(0, 10) !== rawDate
				) {
					return fail(400, {
						gradeError: `La fecha de ${subject.name} no es válida.`
					});
				}
			}

			// -------------------------------------------------
			// Establecimiento
			// -------------------------------------------------

			const isEquivalence =
				rawFolio
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')
					.trim()
					.toLowerCase() === 'equivalencia';

			let establishment: string;

			if (isEquivalence) {
				if (!rawOtherEstablishment) {
					return fail(400, {
						gradeError: `Indicá el establecimiento de la equivalencia de ${subject.name}.`
					});
				}

				if (rawOtherEstablishment.length > 200) {
					return fail(400, {
						gradeError: `El establecimiento de ${subject.name} es demasiado largo.`
					});
				}

				establishment = rawOtherEstablishment;
			} else {
				establishment = DEFAULT_ESTABLISHMENT;
			}

			const previousGrade =
				existing?.grade !== null && existing?.grade !== undefined ? Number(existing.grade) : null;

			const previousDate = existing?.accreditedAt
				? existing.accreditedAt.toISOString().slice(0, 10)
				: null;

			const nextDate = accreditedAt ? accreditedAt.toISOString().slice(0, 10) : null;

			const changed =
				previousGrade !== grade ||
				(existing?.folio ?? null) !== folio ||
				previousDate !== nextDate ||
				(existing?.establishment ?? null) !== establishment;

			if (!changed) {
				continue;
			}

			changes.push({
				subjectId: subject.subjectId,
				subjectName: subject.name,
				grade,
				folio,
				accreditedAt,
				establishment,
				previous: {
					grade: previousGrade,
					folio: existing?.folio ?? null,
					accreditedAt: previousDate,
					establishment: existing?.establishment ?? null
				}
			});
		}

		if (changes.length === 0) {
			return {
				gradeSuccess: true,
				message: 'No había cambios para guardar.'
			};
		}

		await prisma.$transaction(async (tx) => {
			for (const change of changes) {
				await tx.subjectAccreditation.upsert({
					where: {
						studentId_subjectId: {
							studentId: params.id,
							subjectId: change.subjectId
						}
					},
					create: {
						studentId: params.id,
						subjectId: change.subjectId,
						type: SubjectAccreditationType.UNSPECIFIED,
						source: AcademicRecordSource.MANUAL,
						grade: change.grade,
						folio: change.folio,
						accreditedAt: change.accreditedAt,
						establishment: change.establishment,
						createdByUserId: user.id
					},
					update: {
						grade: change.grade,
						folio: change.folio,
						accreditedAt: change.accreditedAt,
						establishment: change.establishment
					}
				});
			}

			await tx.auditLog.create({
				data: {
					action: AuditAction.UPDATE,
					entityType: 'MatrixBook',
					entityId: params.id,
					description: 'Actualizó datos académicos del Libro Matriz',
					userId: user.id,
					metadata: {
						changes: changes.map((change) => ({
							subjectId: change.subjectId,
							subjectName: change.subjectName,
							previous: change.previous,
							current: {
								grade: change.grade,
								folio: change.folio,
								accreditedAt: change.accreditedAt ? change.accreditedAt.toISOString() : null,
								establishment: change.establishment
							}
						}))
					}
				}
			});
		});

		return {
			gradeSuccess: true,
			message: `${changes.length} ${
				changes.length === 1 ? 'registro actualizado' : 'registros actualizados'
			} correctamente.`
		};
	}
};
