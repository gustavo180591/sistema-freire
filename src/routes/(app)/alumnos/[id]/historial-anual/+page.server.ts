import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { checkPermission } from '$lib/server/auth/permissions-granular';
import type { AcademicYearStatus } from '@prisma/client';

const ACADEMIC_YEAR_STATUS_LABELS: Record<string, string> = {
	ENROLLED: 'Inscripto',
	ACTIVE: 'Activo',
	PROMOTED: 'Promovido',
	REPEATED: 'Repetido',
	DROPPED_OUT: 'Abandonó',
	GRADUATED: 'Egresado'
};

const ACADEMIC_YEAR_STATUS_COLORS: Record<string, string> = {
	ENROLLED: 'bg-blue-950/50 text-blue-400 border-blue-800',
	ACTIVE: 'bg-green-950/50 text-green-400 border-green-800',
	PROMOTED: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
	REPEATED: 'bg-amber-950/50 text-amber-400 border-amber-800',
	DROPPED_OUT: 'bg-red-950/50 text-red-400 border-red-800',
	GRADUATED: 'bg-purple-950/50 text-purple-400 border-purple-800'
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	// Verificar permiso de lectura
	const canRead = await checkPermission(user, 'STUDENT', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver historial académico');
	}

	const studentId = params.id;

	const student = await prisma.student.findUnique({
		where: { id: studentId },
		include: {
			user: { select: { email: true } },
			career: { select: { name: true } },
			academicHistory: {
				orderBy: { year: 'desc' }
			}
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		student: {
			id: student.id,
			fullName: `${student.lastName} ${student.firstName}`,
			dni: student.dni,
			career: student.career.name,
			email: student.user.email,
			currentYear: student.currentYear,
			status: student.status
		},
		academicHistory: student.academicHistory.map((h) => ({
			id: h.id,
			year: h.year,
			status: h.status,
			statusLabel: ACADEMIC_YEAR_STATUS_LABELS[h.status],
			statusColor: ACADEMIC_YEAR_STATUS_COLORS[h.status],
			observations: h.observations,
			createdAt: h.createdAt,
			updatedAt: h.updatedAt
		})),
		statusLabels: ACADEMIC_YEAR_STATUS_LABELS,
		canCreate: await checkPermission(user, 'STUDENT', 'update'),
		canUpdate: await checkPermission(user, 'STUDENT', 'update'),
		canDelete: await checkPermission(user, 'STUDENT', 'delete')
	};
};

export const actions: Actions = {
	// Crear registro de año académico
	create: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para crear registros académicos' });
		}

		const studentId = params.id;
		const formData = await request.formData();
		const yearStr = formData.get('year')?.toString();
		const status = formData.get('status')?.toString();
		const observations = formData.get('observations')?.toString();

		if (!yearStr || !status) {
			return fail(400, { error: 'Año y estado son obligatorios' });
		}

		const year = parseInt(yearStr);
		const currentYear = new Date().getFullYear();

		// Validar año
		if (year < 2000 || year > currentYear + 1) {
			return fail(400, { error: 'Año inválido' });
		}

		// Validar estado
		const validStatuses: AcademicYearStatus[] = [
			'ENROLLED',
			'ACTIVE',
			'PROMOTED',
			'REPEATED',
			'DROPPED_OUT',
			'GRADUATED'
		];
		if (!validStatuses.includes(status as AcademicYearStatus)) {
			return fail(400, { error: 'Estado inválido' });
		}

		// Verificar que no exista un registro para ese año
		const existing = await prisma.academicYearHistory.findUnique({
			where: {
				studentId_year: {
					studentId,
					year
				}
			}
		});

		if (existing) {
			return fail(400, { error: 'Ya existe un registro para ese año académico' });
		}

		// Obtener datos del alumno
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { careerId: true, firstName: true, lastName: true }
		});

		if (!student) {
			return fail(404, { error: 'Alumno no encontrado' });
		}

		// Crear registro
		const history = await prisma.academicYearHistory.create({
			data: {
				studentId,
				year,
				careerId: student.careerId,
				status: status as AcademicYearStatus,
				observations: observations || null
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'CREATE',
			entityType: 'AcademicYearHistory',
			entityId: history.id,
			description: `Creó registro académico año ${year} (${status}) para ${student.lastName} ${student.firstName}`
		});

		return {
			success: true,
			message: 'Registro académico creado correctamente'
		};
	},

	// Actualizar registro de año académico
	update: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para actualizar registros académicos' });
		}

		const formData = await request.formData();
		const historyId = formData.get('historyId')?.toString();
		const status = formData.get('status')?.toString();
		const observations = formData.get('observations')?.toString();

		if (!historyId || !status) {
			return fail(400, { error: 'ID y estado son obligatorios' });
		}

		// Validar estado
		const validStatuses: AcademicYearStatus[] = [
			'ENROLLED',
			'ACTIVE',
			'PROMOTED',
			'REPEATED',
			'DROPPED_OUT',
			'GRADUATED'
		];
		if (!validStatuses.includes(status as AcademicYearStatus)) {
			return fail(400, { error: 'Estado inválido' });
		}

		// Obtener registro actual
		const currentHistory = await prisma.academicYearHistory.findUnique({
			where: { id: historyId },
			include: { student: true }
		});

		if (!currentHistory) {
			return fail(404, { error: 'Registro no encontrado' });
		}

		// Verificar que pertenezca al alumno
		if (currentHistory.studentId !== params.id) {
			return fail(403, { error: 'No tenés permiso para modificar este registro' });
		}

		// Actualizar
		await prisma.academicYearHistory.update({
			where: { id: historyId },
			data: {
				status: status as AcademicYearStatus,
				observations: observations || null
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'AcademicYearHistory',
			entityId: historyId,
			description: `Actualizó registro académico año ${currentHistory.year}: ${currentHistory.status} → ${status}`
		});

		return {
			success: true,
			message: 'Registro académico actualizado correctamente'
		};
	},

	// Eliminar registro de año académico
	delete: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canDelete = await checkPermission(user, 'STUDENT', 'delete');
		if (!canDelete) {
			return fail(403, { error: 'No tenés permiso para eliminar registros académicos' });
		}

		const formData = await request.formData();
		const historyId = formData.get('historyId')?.toString();

		if (!historyId) {
			return fail(400, { error: 'ID de registro requerido' });
		}

		// Obtener registro
		const history = await prisma.academicYearHistory.findUnique({
			where: { id: historyId },
			include: { student: true }
		});

		if (!history) {
			return fail(404, { error: 'Registro no encontrado' });
		}

		// Verificar que pertenezca al alumno
		if (history.studentId !== params.id) {
			return fail(403, { error: 'No tenés permiso para eliminar este registro' });
		}

		// Eliminar
		await prisma.academicYearHistory.delete({
			where: { id: historyId }
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'DELETE',
			entityType: 'AcademicYearHistory',
			entityId: historyId,
			description: `Eliminó registro académico año ${history.year} de ${history.student.lastName} ${history.student.firstName}`
		});

		return {
			success: true,
			message: 'Registro académico eliminado correctamente'
		};
	}
};
