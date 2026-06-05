import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) {
		throw redirect(303, '/login');
	}

	const user = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: true,
			teacher: {
				include: {
					subjects: {
						include: {
							subject: true
						}
					}
				}
			},
			locationPermissions: {
				include: {
					location: true
				}
			}
		}
	});

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	// Verificar permisos: SECRETARIA no puede editar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO
	const isSecretary = currentUser.roles.includes('SECRETARIA');
	const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO'];

	if (isSecretary) {
		const hasRestrictedRole = user.roles.some(ur => restrictedRoles.includes(ur.role.code));
		if (hasRestrictedRole) {
			throw error(403, 'No tienes permiso para editar usuarios con roles administrativos');
		}
	}

	const roles = await prisma.role.findMany({
		orderBy: { name: 'asc' }
	});

	const subjects = await prisma.subject.findMany({
		where: { active: true },
		orderBy: [
			{ yearLevel: 'asc' },
			{ name: 'asc' }
		]
	});

	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	const locations = await prisma.location.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	return {
		user,
		roles,
		subjects: subjects.map(s => ({
			...s,
			approvalThreshold: s.approvalThreshold ? Number(s.approvalThreshold) : null,
			promotionThreshold: s.promotionThreshold ? Number(s.promotionThreshold) : null
		})),
		careers,
		locations
	};
};

export const actions: Actions = {
	updateUser: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		// Obtener roles del usuario a editar
		const targetUser = await prisma.user.findUnique({
			where: { id: params.id },
			include: {
				roles: {
					include: {
						role: true
					}
				}
			}
		});

		if (!targetUser) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		// Verificar permisos: SECRETARIA no puede editar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO, FINANZAS
		const isSecretary = currentUser.roles.includes('SECRETARIA');
		const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO', 'FINANZAS'];

		if (isSecretary) {
			const hasRestrictedRole = targetUser.roles.some(ur => restrictedRoles.includes(ur.role.code));
			if (hasRestrictedRole) {
				return fail(403, { error: 'No tienes permiso para editar usuarios con roles administrativos' });
			}
		}

		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString();
		const lastName = formData.get('lastName')?.toString();
		const email = formData.get('email')?.toString();
		const status = formData.get('status')?.toString();
		const phone = formData.get('phone')?.toString();
		const dni = formData.get('dni')?.toString();
		const birthDate = formData.get('birthDate')?.toString();
		const bloodType = formData.get('bloodType')?.toString();
		const address = formData.get('address')?.toString();
		const locality = formData.get('locality')?.toString();
		const postalCode = formData.get('postalCode')?.toString();
		const careerId = formData.get('careerId')?.toString();
		const currentYear = formData.get('currentYear')?.toString();

		if (!firstName || !lastName || !email) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		try {
			await prisma.$transaction(async (tx) => {
				// Actualizar usuario base
				await tx.user.update({
					where: { id: params.id },
					data: {
						firstName,
						lastName,
						email,
						status: status as 'ACTIVE' | 'INACTIVE'
					}
				});

				// Actualizar estudiante si existe
				const student = await tx.student.findUnique({
					where: { userId: params.id }
				});

				if (student) {
					await tx.student.update({
						where: { id: student.id },
						data: {
							dni: dni || student.dni,
							birthDate: birthDate ? new Date(birthDate) : student.birthDate,
							bloodType: bloodType || student.bloodType,
							phone: phone || student.phone,
							address: address || student.address,
							locality: locality || student.locality,
							postalCode: postalCode || student.postalCode,
							careerId: careerId || student.careerId,
							currentYear: currentYear ? parseInt(currentYear) : student.currentYear
						}
					});
				}

				// Actualizar docente si existe
				const teacher = await tx.teacher.findUnique({
					where: { userId: params.id }
				});

				if (teacher) {
					await tx.teacher.update({
						where: { id: teacher.id },
						data: {
							dni: dni || teacher.dni,
							firstName,
							lastName
						}
					});
				}

				// Actualizar teléfono del usuario si se proporcionó
				if (phone) {
					await tx.user.update({
						where: { id: params.id },
						data: { phone }
					});
				}

				// Actualizar permisos de localidad si se proporcionó
				if (locality) {
					// Eliminar permisos existentes
					await tx.userLocationPermission.deleteMany({
						where: { userId: params.id }
					});

					// Agregar nuevo permiso
					const location = await tx.location.findUnique({
						where: { code: locality }
					});
					if (location) {
						await tx.userLocationPermission.create({
							data: {
								userId: params.id,
								locationId: location.id
							}
						});
					}
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar usuario' });
		}
	},

	updateRoles: async ({ request, params }) => {
		const formData = await request.formData();
		const roleIds = formData.getAll('roleIds').map(r => r.toString());

		try {
			// Eliminar roles actuales
			await prisma.userRole.deleteMany({
				where: { userId: params.id }
			});

			// Agregar nuevos roles
			if (roleIds.length > 0) {
				await prisma.userRole.createMany({
					data: roleIds.map(roleId => ({
						userId: params.id,
						roleId
					}))
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar roles' });
		}
	},

	addSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			// Verificar que el usuario sea docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			await prisma.subjectTeacher.create({
				data: {
					subjectId,
					teacherId: teacher.id
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al agregar materia' });
		}
	},

	removeSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			// Verificar que el usuario sea docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			await prisma.subjectTeacher.deleteMany({
				where: {
					subjectId,
					teacherId: teacher.id
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al remover materia' });
		}
	}
};
