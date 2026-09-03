import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { getPreceptorScope } from '$lib/server/preceptor/preceptor-scope-service';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['PRECEPTOR']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener localidades permitidas para el preceptor
	const { locationIds: allowedLocationIds } = await getPreceptorScope(locals.user.id);

	// Obtener estudiantes activos filtrados por localidad
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			locationId: {
				in: allowedLocationIds
			}
		},
		include: {
			user: true,
			career: true
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	// Obtener calificaciones de los estudiantes para consulta (solo lectura)
	const grades = await prisma.grade.findMany({
		where: {
			student: {
				status: 'ACTIVE',
				locationId: {
					in: allowedLocationIds
				}
			}
		},
		include: {
			student: {
				include: { user: true }
			},
			evaluation: {
				include: {
					subject: true
				}
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 100
	});

	return {
		students: students.map((s) => ({
			id: s.id,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			career: s.career.name,
			currentYear: s.currentYear
		})),
		grades: grades.map((g) => ({
			id: g.id,
			studentName: `${g.student.lastName}, ${g.student.firstName}`,
			subject: g.evaluation?.subject?.name || 'Sin materia',
			evaluationTitle: g.evaluation?.title || 'Sin evaluación',
			value: g.value,
			status: g.status || 'UNKNOWN',
			createdAt: g.createdAt
		}))
	};
};

// NOTA: La capacidad de crear calificaciones académicas ha sido eliminada del rol PRECEPTOR.
// El preceptor solo puede consultar calificaciones existentes.
// Para cargar calificaciones, se requiere un permiso granular explícito GRADE:create
// que debe ser asignado institucionalmente. Esta medida mejora la seguridad
// y la trazabilidad de las acciones académicas.

export const actions: Actions = {};
