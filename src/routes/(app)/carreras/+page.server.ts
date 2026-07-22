import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { fail, redirect } from '@sveltejs/kit';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Verificar si el usuario tiene acceso global a todas las localidades
	const user = await prisma.user.findUnique({
		where: { id: locals.user.id },
		include: {
			roles: {
				include: {
					role: true
				}
			}
		}
	});

	const globalAccessRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'];
	const hasGlobalAccess = user?.roles.some((r) => globalAccessRoles.includes(r.role.code)) || false;

	const careers = await prisma.career.findMany({
		where: {
			active: true,
			// Para usuarios con acceso global, mostrar todas las carreras activas
			// Para usuarios con acceso restringido, filtrar por localidades permitidas
			...(hasGlobalAccess
				? {}
				: {
						locations: {
							some: {
								locationId: { in: allowedLocationIds }
							}
						}
					})
		},
		include: {
			studyPlans: {
				select: {
					id: true
				}
			},
			students: {
				select: {
					id: true
				}
			},
			careerSubjects: {
				include: {
					subject: {
						include: {
							teachers: {
								select: {
									teacherId: true
								}
							}
						}
					}
				}
			},
			locations: {
				include: {
					location: true
				}
			}
		},
		orderBy: {
			name: 'asc'
		}
	});

	const normalizedCareers = careers.map((career) => {
		// Obtener docentes únicos de todas las materias de la carrera
		const teacherIds = new Set<string>();
		career.careerSubjects.forEach((cs) => {
			cs.subject.teachers.forEach((t) => {
				teacherIds.add(t.teacherId);
			});
		});

		// Obtener localidades de la carrera
		const locationNames = career.locations.map((cl) => cl.location.name);

		return {
			id: career.id,
			code: career.code,
			name: career.name,
			active: career.active,
			plans: career.studyPlans.length,
			students: career.students.length,
			teachers: teacherIds.size,
			locations: locationNames
		};
	});

	const totalPlans = normalizedCareers.reduce((acc, item) => acc + item.plans, 0);
	const totalStudents = normalizedCareers.reduce((acc, item) => acc + item.students, 0);

	return {
		careers: normalizedCareers,
		metrics: {
			activeCareers: normalizedCareers.length,
			totalPlans,
			totalStudents
		}
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		// Verificar si el usuario tiene roles permitidos
		const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'APODERADO'];
		const hasPermission = user.roles.some((role) => allowedRoles.includes(role));

		if (!hasPermission) {
			return fail(403, { error: 'No tenés permiso para eliminar carreras' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'ID de carrera no proporcionado' });
		}

		try {
			// Verificar si la carrera existe
			const career = await prisma.career.findUnique({
				where: { id },
				include: {
					studyPlans: { select: { id: true } },
					students: { select: { id: true } },
					careerSubjects: { select: { id: true } },
					commissions: { select: { id: true } },
					enrollments: { select: { id: true } }
				}
			});

			if (!career) {
				return fail(404, { error: 'Carrera no encontrada' });
			}

			// Verificar si tiene relaciones importantes
			const hasRelations =
				career.studyPlans.length > 0 ||
				career.students.length > 0 ||
				career.careerSubjects.length > 0 ||
				career.commissions.length > 0 ||
				career.enrollments.length > 0;

			if (hasRelations) {
				// Si tiene relaciones, hacer baja lógica
				await prisma.career.update({
					where: { id },
					data: { active: false }
				});
				return { success: true, message: 'Carrera desactivada correctamente' };
			}

			// Si no tiene relaciones, hacer baja lógica también (para mantener historial)
			await prisma.career.update({
				where: { id },
				data: { active: false }
			});

			return { success: true, message: 'Carrera desactivada correctamente' };
		} catch (error) {
			console.error('Error al desactivar carrera:', error);
			return fail(500, { error: 'Error al desactivar la carrera. Intente nuevamente.' });
		}
	}
};
