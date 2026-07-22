import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const teachers = await prisma.teacher.findMany({
		include: {
			user: {
				include: {
					locationPermissions: {
						include: {
							location: true
						}
					}
				}
			},
			subjects: {
				include: {
					subject: true
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	type TeacherWithRelations = Prisma.TeacherGetPayload<{
		include: {
			user: {
				include: {
					locationPermissions: {
						include: {
							location: true;
						};
					};
				};
			};
			subjects: {
				include: {
					subject: true;
				};
			};
		};
	}>;

	return {
		teachers: teachers.map((t: TeacherWithRelations) => {
			// Obtener localidades únicas de las sedes asignadas al docente
			const locations = new Set<string>();
			t.user.locationPermissions.forEach((lp) => {
				locations.add(lp.location.name);
			});

			return {
				id: t.id,
				userId: t.userId,
				dni: t.dni,
				firstName: t.firstName,
				lastName: t.lastName,
				email: t.user.email,
				createdAt: t.createdAt,
				locations: Array.from(locations),
				subjects: t.subjects.map((st) => ({
					id: st.subject.id,
					code: st.subject.code,
					name: st.subject.name,
					yearLevel: st.subject.yearLevel,
					active: st.subject.active,
					approvalThreshold: st.subject.approvalThreshold
						? Number(st.subject.approvalThreshold)
						: null,
					promotionThreshold: st.subject.promotionThreshold
						? Number(st.subject.promotionThreshold)
						: null
				}))
			};
		})
	};
};

export const actions: Actions = {
	deleteTeacher: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const userId = formData.get('userId')?.toString();

		if (!id || !userId) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		try {
			// Obtener datos del docente para auditoría
			const teacher = await prisma.teacher.findUnique({
				where: { id },
				include: { user: true }
			});

			// Eliminar el registro de Teacher
			await prisma.teacher.delete({
				where: { id }
			});

			// Eliminar el usuario
			await prisma.user.delete({
				where: { id: userId }
			});

			// Registrar en auditoría
			if (teacher && locals.user) {
				const { auditLog } = await import('$lib/server/audit');
				const { AuditAction } = await import('@prisma/client');
				await auditLog({
					userId: locals.user.id,
					action: AuditAction.DELETE,
					entityType: 'TEACHER',
					entityId: id,
					description: `Eliminación de docente: ${teacher.lastName}, ${teacher.firstName} (DNI: ${teacher.dni})`
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al eliminar docente' });
		}
	}
};
