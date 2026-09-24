import { AuditAction } from '@prisma/client';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auditLog } from '$lib/server/audit';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';
import {
	getPreceptorScope,
	requirePreceptorAttendanceEntryAccess
} from '$lib/server/preceptor/preceptor-scope-service';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, ['PRECEPTOR']);
	await requirePermission(currentUser, 'ATTENDANCE', 'read');

	const scope = await getPreceptorScope(currentUser.id);

	/*
	 * Compatibilidad:
	 *
	 * - registros nuevos/formalizados: status = ABSENT
	 * - registros legacy: status = null + present = false
	 *
	 * JUSTIFIED queda fuera de esta consulta.
	 */
	const absenceCandidates = await prisma.attendanceEntry.findMany({
		where: {
			student: {
				status: 'ACTIVE',
				locationId: {
					in: scope.locationIds
				}
			},
			OR: [
				{
					status: 'ABSENT'
				},
				{
					status: null,
					present: false
				}
			]
		},
		include: {
			student: {
				include: {
					career: true
				}
			},
			attendance: {
				include: {
					subject: true
				}
			}
		},
		orderBy: {
			attendance: {
				classDate: 'desc'
			}
		}
	});

	/*
	 * Históricamente el sistema utilizó notes como criterio
	 * provisional de justificación. Mientras esos registros
	 * legacy existan, no debemos ofrecerlos nuevamente como
	 * pendientes.
	 */
	const unexcusedAbsences = absenceCandidates.filter((entry) => !entry.notes?.trim());

	return {
		unexcusedAbsences: unexcusedAbsences.map((entry) => ({
			id: entry.id,
			studentId: entry.studentId,
			studentName: `${entry.student.lastName}, ${entry.student.firstName}`,
			studentDni: entry.student.dni,
			date: entry.attendance.classDate,
			subject: entry.attendance.subject.name
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, {
				error: 'No autorizado'
			});
		}

		requireRole(currentUser, ['PRECEPTOR']);
		await requirePermission(currentUser, 'ATTENDANCE', 'update');

		const data = await request.formData();
		const entryId = data.get('entryId')?.toString().trim() ?? '';
		const justification = data.get('justification')?.toString().trim() ?? '';

		if (!entryId || !justification) {
			return fail(400, {
				error: 'Por favor completá todos los campos requeridos'
			});
		}

		/*
		 * La comprobación de ownership/sede queda fuera del try/catch
		 * para no convertir un HttpError 403 en un error 500.
		 */
		const entry = await requirePreceptorAttendanceEntryAccess(currentUser.id, entryId);

		if (entry.student.status !== 'ACTIVE') {
			return fail(400, {
				error: 'El alumno ya no se encuentra activo'
			});
		}

		/*
		 * JUSTIFIED es el estado formal.
		 *
		 * Para registros legacy también consideramos justificada
		 * una ausencia que todavía tenga status null/ABSENT pero
		 * ya posea notes, porque esa era la semántica utilizada
		 * anteriormente por este módulo y por los reportes.
		 */
		if (entry.status === 'JUSTIFIED' || Boolean(entry.notes?.trim())) {
			return fail(400, {
				error: 'La inasistencia ya se encuentra justificada'
			});
		}

		const isAbsence =
			entry.status === 'ABSENT' || (entry.status === null && entry.present === false);

		if (!isAbsence) {
			return fail(400, {
				error: 'Solo se pueden justificar registros de inasistencia'
			});
		}

		try {
			/*
			 * Revalidamos en el UPDATE para evitar que dos operaciones
			 * simultáneas justifiquen el mismo registro.
			 */
			const result = await prisma.attendanceEntry.updateMany({
				where: {
					id: entry.id,
					OR: [
						{
							status: 'ABSENT'
						},
						{
							status: null,
							present: false
						}
					]
				},
				data: {
					present: false,
					status: 'JUSTIFIED',
					notes: justification
				}
			});

			if (result.count !== 1) {
				return fail(409, {
					error:
						'La inasistencia cambió mientras la estabas justificando. Actualizá la página e intentá nuevamente.'
				});
			}

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'ATTENDANCE_ENTRY',
				entityId: entry.id,
				description: `Justificación de inasistencia de ${entry.student.firstName} ${entry.student.lastName} en ${entry.attendance.subject.name} del ${entry.attendance.classDate.toLocaleDateString('es-AR')}`
			});

			return {
				success: 'Justificación registrada exitosamente'
			};
		} catch (caught) {
			console.error('Error al registrar justificación:', caught);

			return fail(500, {
				error: 'Error al registrar la justificación'
			});
		}
	}
};
