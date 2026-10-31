import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	SupportTicketError,
	createAcademicDeletionTicket
} from '$lib/server/support/support-ticket-service';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { requireRole } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { getStudentAcademicTrajectory } from '$lib/server/academic/academic-trajectory-service';
import {
	AcademicAccreditationError,
	approveManualAcademicYear
} from '$lib/server/academic/academic-accreditation-service';
import {
	ManualTrajectoryStateError,
	saveManualTrajectoryStates,
	type ManualAcademicStatusChange,
	type ManualQuickAcademicStatus
} from '$lib/server/academic/manual-trajectory-state-service';

function parseYearLevel(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim();

	if (!/^\d+$/.test(raw)) {
		return null;
	}

	return Number(raw);
}

function parseChanges(raw: string): ManualAcademicStatusChange[] | null {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!Array.isArray(parsed)) {
		return null;
	}

	const allowedStatuses = new Set<ManualQuickAcademicStatus>([
		'TAKING',
		'RETAKING',
		'REGULAR',
		'FREE',
		'APPROVED'
	]);

	const changes: ManualAcademicStatusChange[] = [];

	for (const entry of parsed) {
		if (
			typeof entry !== 'object' ||
			entry === null ||
			!('subjectId' in entry) ||
			!('status' in entry)
		) {
			return null;
		}

		const subjectId = typeof entry.subjectId === 'string' ? entry.subjectId.trim() : '';

		const status = entry.status;

		if (
			!subjectId ||
			typeof status !== 'string' ||
			!allowedStatuses.has(status as ManualQuickAcademicStatus)
		) {
			return null;
		}

		changes.push({
			subjectId,
			status: status as ManualQuickAcademicStatus
		});
	}

	return changes;
}

async function requireTrajectoryManagement(user: App.Locals['user'], studentId: string) {
	if (!user) {
		throw new AcademicAccreditationError(401, 'Usuario no autenticado');
	}

	await requireStudentAccess(user, studentId);
	requireRole(user, ['PRECEPTOR']);
	await requirePermission(user, 'STUDENT', 'update');

	return user;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const trajectory = await getStudentAcademicTrajectory(params.id);

	if (!trajectory) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		trajectory,
		canManageTrajectory: locals.user?.activeRole === 'PRECEPTOR'
	};
};

export const actions: Actions = {
	approveYear: async ({ request, params, locals }) => {
		try {
			const user = await requireTrajectoryManagement(locals.user, params.id);

			const formData = await request.formData();
			const yearLevel = parseYearLevel(formData.get('yearLevel'));

			if (!yearLevel) {
				return fail(400, {
					approveYearError: 'El año curricular no es válido'
				});
			}

			const result = await approveManualAcademicYear({
				studentId: params.id,
				yearLevel,
				userId: user.id
			});

			if (result.updated === 0) {
				return {
					approveYearSuccess: true,
					message: `${yearLevel}° año no tiene materias sin información para aprobar`
				};
			}

			return {
				approveYearSuccess: true,
				message: `${result.updated} materia${result.updated === 1 ? '' : 's'} de ${yearLevel}° año marcada${result.updated === 1 ? '' : 's'} como aprobada${result.updated === 1 ? '' : 's'}`
			};
		} catch (cause) {
			if (cause instanceof AcademicAccreditationError) {
				return fail(cause.status, {
					approveYearError: cause.message
				});
			}

			console.error('Error aprobando año académico:', cause);

			return fail(500, {
				approveYearError: 'No se pudo aprobar el año académico'
			});
		}
	},

	saveYearStatuses: async ({ request, params, locals }) => {
		try {
			const user = await requireTrajectoryManagement(locals.user, params.id);

			const formData = await request.formData();

			const yearLevel = parseYearLevel(formData.get('yearLevel'));

			const changesRaw = String(formData.get('changesJson') ?? '').trim();

			if (!yearLevel) {
				return fail(400, {
					quickLoadError: 'El año curricular seleccionado no es válido'
				});
			}

			const changes = parseChanges(changesRaw);

			if (!changes || changes.length === 0) {
				return fail(400, {
					quickLoadError: 'No hay cambios académicos válidos para guardar'
				});
			}

			const result = await saveManualTrajectoryStates({
				studentId: params.id,
				yearLevel,
				changes,
				userId: user.id
			});

			return {
				quickLoadSuccess: true,
				message: `${result.updated} materia${result.updated === 1 ? '' : 's'} actualizada${result.updated === 1 ? '' : 's'} correctamente`
			};
		} catch (cause) {
			if (
				cause instanceof AcademicAccreditationError ||
				cause instanceof ManualTrajectoryStateError
			) {
				return fail(cause.status, {
					quickLoadError: cause.message
				});
			}

			console.error('Error guardando carga académica rápida:', cause);

			return fail(500, {
				quickLoadError: 'No se pudo guardar la trayectoria académica'
			});
		}
	},

	requestDeletion: async ({ request, params, locals }) => {
		try {
			const user = await requireTrajectoryManagement(locals.user, params.id);

			const formData = await request.formData();

			const subjectId = String(formData.get('subjectId') ?? '').trim();

			const reason = String(formData.get('reason') ?? '').trim();

			if (!subjectId) {
				return fail(400, {
					deleteRequestError: 'La materia es obligatoria'
				});
			}

			const ticket = await createAcademicDeletionTicket({
				studentId: params.id,
				subjectId,
				reason,
				requestedByUserId: user.id
			});

			return {
				deleteRequestSuccess: true,
				ticketNumber: ticket.number,
				message: `Ticket #${ticket.number} enviado correctamente`
			};
		} catch (cause) {
			if (cause instanceof AcademicAccreditationError) {
				return fail(cause.status, {
					deleteRequestError: cause.message
				});
			}

			if (cause instanceof SupportTicketError) {
				return fail(cause.status, {
					deleteRequestError: cause.message
				});
			}

			console.error('Error creando ticket de eliminación académica:', cause);

			return fail(500, {
				deleteRequestError: 'No se pudo crear el ticket'
			});
		}
	}
};
