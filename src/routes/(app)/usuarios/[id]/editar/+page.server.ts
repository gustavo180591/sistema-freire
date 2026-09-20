import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';
import type { RoleCode } from '@prisma/client';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireRole } from '$lib/server/auth/authorization';

const USER_MANAGEMENT_ROLES: RoleCode[] = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'];

const SECRETARY_RESTRICTED_ROLES: RoleCode[] = [
	'SUPERADMIN',
	'SECRETARIA',
	'DIRECTOR',
	'APODERADO',
	'FINANZAS'
];

const SECRETARY_ASSIGNABLE_ROLES: RoleCode[] = ['ALUMNO', 'DOCENTE', 'PRECEPTOR'];

type AuthenticatedUser = NonNullable<App.Locals['user']>;

function usesSecretaryScope(user: AuthenticatedUser): boolean {
	return user.roles.includes('SECRETARIA');
}

function isSuperadmin(user: AuthenticatedUser): boolean {
	return user.roles.includes('SUPERADMIN');
}

async function requireSuperadminTargetAccess(
	currentUser: AuthenticatedUser,
	targetUserId: string
): Promise<void> {
	if (isSuperadmin(currentUser)) {
		return;
	}

	const target = await prisma.user.findUnique({
		where: {
			id: targetUserId
		},
		select: {
			roles: {
				select: {
					role: {
						select: {
							code: true
						}
					}
				}
			}
		}
	});

	if (!target) {
		throw error(404, 'Usuario no encontrado');
	}

	if (target.roles.some(({ role }) => role.code === 'SUPERADMIN')) {
		throw error(403, 'Solo SUPERADMIN puede administrar a otro usuario SUPERADMIN');
	}
}

async function getSecretaryLocationIds(userId: string): Promise<string[]> {
	const permissions = await prisma.userLocationPermission.findMany({
		where: {
			userId,
			location: {
				active: true
			}
		},
		select: {
			locationId: true
		}
	});

	return [...new Set(permissions.map((permission) => permission.locationId))];
}

async function requireSecretaryTargetAccess(
	currentUser: AuthenticatedUser,
	targetUserId: string
): Promise<string[] | null> {
	if (!usesSecretaryScope(currentUser)) {
		return null;
	}

	const locationIds = await getSecretaryLocationIds(currentUser.id);

	if (locationIds.length === 0) {
		throw error(403, 'No tienes sedes habilitadas para administrar usuarios');
	}

	const target = await prisma.user.findUnique({
		where: {
			id: targetUserId
		},
		select: {
			roles: {
				select: {
					role: {
						select: {
							code: true
						}
					}
				}
			},
			student: {
				select: {
					locationId: true
				}
			},
			locationPermissions: {
				select: {
					locationId: true
				}
			}
		}
	});

	if (!target) {
		throw error(404, 'Usuario no encontrado');
	}

	if (target.roles.some(({ role }) => SECRETARY_RESTRICTED_ROLES.includes(role.code))) {
		throw error(403, 'No tienes permiso para administrar usuarios con roles administrativos');
	}

	const studentInScope =
		target.student?.locationId != null && locationIds.includes(target.student.locationId);

	const staffInScope = target.locationPermissions.some((permission) =>
		locationIds.includes(permission.locationId)
	);

	if (!studentInScope && !staffInScope) {
		throw error(403, 'El usuario pertenece a otra sede');
	}

	return locationIds;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) {
		throw redirect(303, '/login');
	}

	requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
	await requirePermission(currentUser, 'USER', 'read');
	await requireSuperadminTargetAccess(currentUser, params.id);

	const user = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: {
				include: {
					career: true,
					location: true
				}
			},
			teacher: {
				include: {
					subjects: {
						include: {
							subject: {
								select: {
									id: true,
									code: true,
									name: true,
									yearLevel: true,
									active: true
								}
							}
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

	const secretaryLocationIds = await requireSecretaryTargetAccess(currentUser, params.id);

	const roles = await prisma.role.findMany({
		where: secretaryLocationIds
			? {
					code: {
						in: SECRETARY_ASSIGNABLE_ROLES
					}
				}
			: isSuperadmin(currentUser)
				? undefined
				: {
						code: {
							not: 'SUPERADMIN'
						}
					},
		orderBy: { name: 'asc' }
	});

	const subjects = await prisma.subject.findMany({
		where: { active: true },
		orderBy: [{ yearLevel: 'asc' }, { name: 'asc' }]
	});

	const careers = await prisma.career.findMany({
		where: { active: true },
		include: {
			locations: {
				include: {
					location: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	const locations = await prisma.location.findMany({
		where: {
			active: true,
			...(secretaryLocationIds
				? {
						id: {
							in: secretaryLocationIds
						}
					}
				: {})
		},
		orderBy: { name: 'asc' }
	});

	return {
		user,
		currentUserRoles: currentUser.roles,
		roles,
		subjects: subjects.map((s) => ({
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

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'USER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);
		await requireSecretaryTargetAccess(currentUser, params.id);

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

		const formData = await request.formData();
		const firstName = formData.get('firstName')?.toString();
		const lastName = formData.get('lastName')?.toString();
		const email = formData.get('email')?.toString();
		const status = formData.get('status')?.toString();
		const phone = formData.get('phone')?.toString();
		const dni = formData.get('dni')?.toString()?.trim();
		const cuil = formData.get('cuil')?.toString()?.trim();

		if (!firstName || !lastName || !email) {
			return fail(400, { error: 'Datos requeridos faltantes' });
		}

		// Validar status
		if (status !== 'ACTIVE' && status !== 'INACTIVE' && status !== 'BLOCKED') {
			return fail(400, { error: 'Estado inválido' });
		}

		const isDisablingActiveUser = targetUser.status === 'ACTIVE' && status !== 'ACTIVE';

		if (isDisablingActiveUser && currentUser.id === params.id) {
			return fail(400, {
				error: 'No puedes desactivar o bloquear tu propia cuenta desde la administración'
			});
		}

		const targetIsSuperadmin = targetUser.roles.some(({ role }) => role.code === 'SUPERADMIN');

		if (isDisablingActiveUser && targetIsSuperadmin) {
			const activeSuperadminCount = await prisma.user.count({
				where: {
					status: 'ACTIVE',
					roles: {
						some: {
							role: {
								code: 'SUPERADMIN'
							}
						}
					}
				}
			});

			if (activeSuperadminCount <= 1) {
				return fail(400, {
					error: 'No se puede desactivar o bloquear el último SUPERADMIN activo'
				});
			}
		}

		// Validar unicidad de DNI si se proporciona
		if (dni) {
			// Verificar si el DNI ya existe en User (excluyendo el usuario actual)
			const existingUserDni = await prisma.user.findFirst({
				where: {
					dni,
					id: { not: params.id }
				}
			});
			if (existingUserDni) {
				return fail(400, { error: 'El DNI ya está en uso por otro usuario' });
			}

			// Verificar si el DNI ya existe en Student (excluyendo el usuario actual)
			const existingStudentDni = await prisma.student.findFirst({
				where: {
					dni,
					userId: { not: params.id }
				}
			});
			if (existingStudentDni) {
				return fail(400, { error: 'El DNI ya está en uso por otro alumno' });
			}

			// Verificar si el DNI ya existe en Teacher (excluyendo el usuario actual)
			const existingTeacherDni = await prisma.teacher.findFirst({
				where: {
					dni,
					userId: { not: params.id }
				}
			});
			if (existingTeacherDni) {
				return fail(400, { error: 'El DNI ya está en uso por otro docente' });
			}
		}

		try {
			const deletedSessions = await prisma.$transaction(async (tx) => {
				await tx.user.update({
					where: { id: params.id },
					data: {
						firstName,
						lastName,
						email,
						phone: phone || null,
						dni: dni || null,
						cuil: cuil || null,
						status: status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
					}
				});

				const student = await tx.student.findUnique({
					where: { userId: params.id }
				});

				if (student) {
					await tx.student.update({
						where: { userId: params.id },
						data: {
							firstName,
							lastName,
							...(dni ? { dni } : {})
						}
					});
				}

				const teacher = await tx.teacher.findUnique({
					where: { userId: params.id }
				});

				if (teacher) {
					await tx.teacher.update({
						where: { userId: params.id },
						data: {
							firstName,
							lastName,
							...(dni ? { dni } : {})
						}
					});
				}

				if (status !== 'ACTIVE') {
					return tx.session.deleteMany({
						where: {
							userId: params.id
						}
					});
				}

				return { count: 0 };
			});

			// Registrar en auditoría
			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'USER',
				entityId: params.id,
				description: `Actualización de usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}). Estado: ${targetUser.status} → ${status}. ${deletedSessions.count} sesiones revocadas.`
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar usuario' });
		}
	},

	updateStudent: async ({ request, params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'STUDENT', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);

		const secretaryLocationIds = await requireSecretaryTargetAccess(currentUser, params.id);

		const targetUser = await prisma.user.findUnique({
			where: { id: params.id },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				student: {
					select: {
						id: true,
						careerId: true,
						locationId: true
					}
				}
			}
		});

		if (!targetUser?.student) {
			return fail(404, { error: 'El usuario no posee un perfil de alumno' });
		}

		const formData = await request.formData();

		const careerId = formData.get('studentCareerId')?.toString().trim() ?? '';
		const locationId = formData.get('studentLocationId')?.toString().trim() ?? '';
		const currentYearRaw = formData.get('currentYear')?.toString().trim() ?? '';
		const studentType = formData.get('studentType')?.toString() ?? 'normal';

		if (secretaryLocationIds) {
			if (!locationId) {
				return fail(400, {
					error: 'El alumno debe permanecer asignado a una sede habilitada'
				});
			}

			if (!secretaryLocationIds.includes(locationId)) {
				return fail(403, {
					error: 'No puedes trasladar el alumno fuera de tus sedes habilitadas'
				});
			}
		}

		const birthDateRaw = formData.get('birthDate')?.toString().trim() ?? '';
		const bloodType = formData.get('bloodType')?.toString().trim() ?? '';
		const studentPhone = formData.get('studentPhone')?.toString().trim() ?? '';

		const address = formData.get('address')?.toString().trim() ?? '';
		const locality = formData.get('locality')?.toString().trim() ?? '';
		const postalCode = formData.get('postalCode')?.toString().trim() ?? '';

		const highSchool = formData.get('highSchool')?.toString().trim() ?? '';
		const highSchoolYearRaw = formData.get('highSchoolYear')?.toString().trim() ?? '';
		const instituteYearRaw = formData.get('instituteYear')?.toString().trim() ?? '';

		const familyContactName = formData.get('familyContactName')?.toString().trim() ?? '';
		const familyContactPhone = formData.get('familyContactPhone')?.toString().trim() ?? '';
		const familyRelationship = formData.get('familyRelationship')?.toString().trim() ?? '';

		if (!careerId) {
			return fail(400, { error: 'Seleccioná la carrera del alumno' });
		}

		if (!['normal', 'becado', 'recursante'].includes(studentType)) {
			return fail(400, { error: 'Tipo de alumno inválido' });
		}

		const career = await prisma.career.findFirst({
			where: {
				id: careerId,
				active: true
			},
			select: {
				id: true,
				name: true,
				durationYears: true
			}
		});

		if (!career) {
			return fail(400, { error: 'La carrera seleccionada no existe o no está activa' });
		}

		if (locationId) {
			const location = await prisma.location.findFirst({
				where: {
					id: locationId,
					active: true
				},
				select: {
					id: true
				}
			});

			if (!location) {
				return fail(400, { error: 'La localidad/sede seleccionada no existe o no está activa' });
			}

			const careerLocation = await prisma.careerLocation.findFirst({
				where: {
					careerId,
					locationId
				},
				select: {
					careerId: true
				}
			});

			if (!careerLocation) {
				return fail(400, {
					error: 'La sede seleccionada no está habilitada para esa carrera'
				});
			}
		}

		let currentYear = 1;

		if (currentYearRaw) {
			currentYear = Number.parseInt(currentYearRaw, 10);

			if (!Number.isInteger(currentYear) || currentYear < 1 || currentYear > career.durationYears) {
				return fail(400, {
					error: `El año actual debe estar entre 1 y ${career.durationYears}`
				});
			}
		}

		let birthDate: Date | null = null;

		if (birthDateRaw) {
			birthDate = new Date(`${birthDateRaw}T00:00:00`);

			if (Number.isNaN(birthDate.getTime())) {
				return fail(400, { error: 'Fecha de nacimiento inválida' });
			}
		}

		const parseOptionalYear = (value: string, label: string): number | null => {
			if (!value) return null;

			const parsed = Number.parseInt(value, 10);

			if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2200) {
				throw new Error(`${label} inválido`);
			}

			return parsed;
		};

		let highSchoolYear: number | null;
		let instituteYear: number | null;

		try {
			highSchoolYear = parseOptionalYear(highSchoolYearRaw, 'Año del secundario');
			instituteYear = parseOptionalYear(instituteYearRaw, 'Año del instituto');
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Año inválido'
			});
		}

		try {
			await prisma.student.update({
				where: {
					id: targetUser.student.id
				},
				data: {
					careerId,
					locationId: locationId || null,
					currentYear,

					isBecado: studentType === 'becado',
					isRecursante: studentType === 'recursante',

					birthDate,
					bloodType: bloodType || null,
					phone: studentPhone || null,

					address: address || null,
					locality: locality || null,
					postalCode: postalCode || null,

					highSchool: highSchool || null,
					highSchoolYear,
					instituteYear,

					familyContactName: familyContactName || null,
					familyContactPhone: familyContactPhone || null,
					familyRelationship: familyRelationship || null
				}
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'STUDENT',
				entityId: targetUser.student.id,
				description: `Actualización de datos personales y académicos del alumno ${targetUser.firstName} ${targetUser.lastName}`
			});

			return {
				success: true,
				message: 'Datos del alumno actualizados correctamente'
			};
		} catch (error) {
			console.error('Error al actualizar datos del alumno:', error);

			return fail(500, {
				error: 'No se pudieron actualizar los datos del alumno'
			});
		}
	},

	updateRoles: async ({ request, params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'USER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);

		const secretaryLocationIds = await requireSecretaryTargetAccess(currentUser, params.id);

		const targetUser = await prisma.user.findUnique({
			where: {
				id: params.id
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				status: true,
				roles: {
					select: {
						role: {
							select: {
								code: true
							}
						}
					}
				}
			}
		});

		if (!targetUser) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		const formData = await request.formData();

		const roleIds = [...new Set(formData.getAll('roleIds').map((roleId) => roleId.toString()))];

		const roles =
			roleIds.length > 0
				? await prisma.role.findMany({
						where: {
							id: {
								in: roleIds
							}
						},
						select: {
							id: true,
							code: true
						}
					})
				: [];

		if (roles.length !== roleIds.length) {
			return fail(400, {
				error: 'Algunos roles no existen'
			});
		}

		if (!isSuperadmin(currentUser) && roles.some((role) => role.code === 'SUPERADMIN')) {
			return fail(403, {
				error: 'Solo SUPERADMIN puede asignar el rol SUPERADMIN'
			});
		}

		const targetCurrentlyIsSuperadmin = targetUser.roles.some(
			({ role }) => role.code === 'SUPERADMIN'
		);
		const targetWillRemainSuperadmin = roles.some((role) => role.code === 'SUPERADMIN');

		if (
			targetUser.status === 'ACTIVE' &&
			targetCurrentlyIsSuperadmin &&
			!targetWillRemainSuperadmin
		) {
			const activeSuperadminCount = await prisma.user.count({
				where: {
					status: 'ACTIVE',
					roles: {
						some: {
							role: {
								code: 'SUPERADMIN'
							}
						}
					}
				}
			});

			if (activeSuperadminCount <= 1) {
				return fail(400, {
					error: 'No se puede quitar el rol SUPERADMIN al último SUPERADMIN activo'
				});
			}
		}

		if (
			secretaryLocationIds &&
			roles.some((role) => !SECRETARY_ASSIGNABLE_ROLES.includes(role.code))
		) {
			return fail(403, {
				error: 'SECRETARIA solo puede asignar roles de alumno, docente o preceptor'
			});
		}

		try {
			await prisma.$transaction(async (tx) => {
				await tx.userRole.deleteMany({
					where: {
						userId: params.id
					}
				});

				if (roleIds.length > 0) {
					await tx.userRole.createMany({
						data: roleIds.map((roleId) => ({
							userId: params.id,
							roleId
						})),
						skipDuplicates: true
					});
				}
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'USER_ROLES',
				entityId: params.id,
				description: `Actualización de roles del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
			});

			return {
				success: true,
				message: 'Roles actualizados correctamente'
			};
		} catch (error) {
			console.error('Error al actualizar roles:', error);

			return fail(500, {
				error: 'Error al actualizar roles'
			});
		}
	},

	updateLocations: async ({ request, params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'USER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);

		const secretaryLocationIds = await requireSecretaryTargetAccess(currentUser, params.id);

		const targetUser = await prisma.user.findUnique({
			where: {
				id: params.id
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true
			}
		});

		if (!targetUser) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		const formData = await request.formData();

		const locationIds = [
			...new Set(formData.getAll('locationIds').map((locationId) => locationId.toString()))
		];

		const locations =
			locationIds.length > 0
				? await prisma.location.findMany({
						where: {
							id: {
								in: locationIds
							},
							active: true
						},
						select: {
							id: true
						}
					})
				: [];

		if (locations.length !== locationIds.length) {
			return fail(400, {
				error: 'Algunas sedes no existen o no están activas'
			});
		}

		if (
			secretaryLocationIds &&
			locationIds.some((locationId) => !secretaryLocationIds.includes(locationId))
		) {
			return fail(403, {
				error: 'Solo puedes asignar sedes dentro de tu ámbito autorizado'
			});
		}

		try {
			await prisma.$transaction(async (tx) => {
				if (secretaryLocationIds) {
					await tx.userLocationPermission.deleteMany({
						where: {
							userId: params.id,
							locationId: {
								in: secretaryLocationIds
							}
						}
					});
				} else {
					await tx.userLocationPermission.deleteMany({
						where: {
							userId: params.id
						}
					});
				}

				if (locationIds.length > 0) {
					await tx.userLocationPermission.createMany({
						data: locationIds.map((locationId) => ({
							userId: params.id,
							locationId
						})),
						skipDuplicates: true
					});
				}
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'USER_LOCATIONS',
				entityId: params.id,
				description: `Actualización de sedes del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
			});

			return {
				success: true,
				message: 'Sedes actualizadas correctamente'
			};
		} catch (error) {
			console.error('Error al actualizar sedes:', error);

			return fail(500, {
				error: 'Error al actualizar sedes'
			});
		}
	},

	addSubject: async ({ request, params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'TEACHER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);
		await requireSecretaryTargetAccess(currentUser, params.id);

		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString().trim() ?? '';
		const assignmentType = formData.get('assignmentType')?.toString().trim() ?? 'TITULAR';

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		if (!['TITULAR', 'SUPLENTE'].includes(assignmentType)) {
			return fail(400, { error: 'Condición docente inválida' });
		}

		try {
			const [teacher, subject] = await Promise.all([
				prisma.teacher.findUnique({
					where: {
						userId: params.id
					},
					select: {
						id: true,
						firstName: true,
						lastName: true
					}
				}),
				prisma.subject.findFirst({
					where: {
						id: subjectId,
						active: true
					},
					select: {
						id: true,
						code: true,
						name: true
					}
				})
			]);

			if (!teacher) {
				return fail(400, {
					error: 'El usuario no posee un perfil de docente'
				});
			}

			if (!subject) {
				return fail(400, {
					error: 'La materia no existe o no está activa'
				});
			}

			const existingAssignment = await prisma.subjectTeacher.findFirst({
				where: {
					subjectId,
					teacherId: teacher.id
				},
				select: {
					subjectId: true
				}
			});

			if (existingAssignment) {
				return fail(400, {
					error: 'La materia ya está asignada a este docente'
				});
			}

			await prisma.subjectTeacher.create({
				data: {
					subjectId,
					teacherId: teacher.id,
					assignmentType: assignmentType as 'TITULAR' | 'SUPLENTE'
				}
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.CREATE,
				entityType: 'SUBJECT_TEACHER',
				entityId: `${teacher.id}:${subject.id}`,
				description: `Asignación de ${subject.code} - ${subject.name} al docente ${teacher.firstName} ${teacher.lastName} como ${assignmentType}`
			});

			return {
				success: true,
				message: `Materia asignada como ${assignmentType === 'SUPLENTE' ? 'suplente' : 'titular'}`
			};
		} catch (error) {
			console.error('Error al agregar materia:', error);

			return fail(500, {
				error: 'Error al agregar materia'
			});
		}
	},

	updateSubjectAssignment: async ({ request, params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'TEACHER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);
		await requireSecretaryTargetAccess(currentUser, params.id);

		const formData = await request.formData();

		const subjectId = formData.get('subjectId')?.toString().trim() ?? '';
		const assignmentType = formData.get('assignmentType')?.toString().trim() ?? '';

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		if (!['TITULAR', 'SUPLENTE'].includes(assignmentType)) {
			return fail(400, { error: 'Condición docente inválida' });
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: {
					userId: params.id
				},
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			});

			if (!teacher) {
				return fail(400, {
					error: 'El usuario no posee un perfil de docente'
				});
			}

			const assignment = await prisma.subjectTeacher.findFirst({
				where: {
					subjectId,
					teacherId: teacher.id
				},
				select: {
					subject: {
						select: {
							id: true,
							code: true,
							name: true
						}
					}
				}
			});

			if (!assignment) {
				return fail(404, {
					error: 'La materia no está asignada a este docente'
				});
			}

			const result = await prisma.subjectTeacher.updateMany({
				where: {
					subjectId,
					teacherId: teacher.id
				},
				data: {
					assignmentType: assignmentType as 'TITULAR' | 'SUPLENTE'
				}
			});

			if (result.count === 0) {
				return fail(404, {
					error: 'La materia no está asignada a este docente'
				});
			}

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'SUBJECT_TEACHER',
				entityId: `${teacher.id}:${assignment.subject.id}`,
				description: `Actualización de ${assignment.subject.code} - ${assignment.subject.name} para ${teacher.firstName} ${teacher.lastName}: ${assignmentType}`
			});

			return {
				success: true,
				message: `Condición actualizada a ${assignmentType === 'SUPLENTE' ? 'Suplente' : 'Titular'}`
			};
		} catch (error) {
			console.error('Error al actualizar la condición docente:', error);

			return fail(500, {
				error: 'Error al actualizar la condición docente'
			});
		}
	},

	removeSubject: async ({ request, params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, [...USER_MANAGEMENT_ROLES]);
		await requirePermission(currentUser, 'TEACHER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);
		await requireSecretaryTargetAccess(currentUser, params.id);

		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString().trim() ?? '';

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: {
					userId: params.id
				},
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			});

			if (!teacher) {
				return fail(400, {
					error: 'El usuario no posee un perfil de docente'
				});
			}

			const assignment = await prisma.subjectTeacher.findFirst({
				where: {
					subjectId,
					teacherId: teacher.id
				},
				select: {
					subject: {
						select: {
							id: true,
							code: true,
							name: true
						}
					}
				}
			});

			if (!assignment) {
				return fail(404, {
					error: 'La materia no está asignada a este docente'
				});
			}

			const result = await prisma.subjectTeacher.deleteMany({
				where: {
					subjectId,
					teacherId: teacher.id
				}
			});

			if (result.count === 0) {
				return fail(404, {
					error: 'La materia no está asignada a este docente'
				});
			}

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.DELETE,
				entityType: 'SUBJECT_TEACHER',
				entityId: `${teacher.id}:${assignment.subject.id}`,
				description: `Remoción de ${assignment.subject.code} - ${assignment.subject.name} del docente ${teacher.firstName} ${teacher.lastName}`
			});

			return {
				success: true,
				message: 'Materia removida correctamente'
			};
		} catch (error) {
			console.error('Error al remover materia:', error);

			return fail(500, {
				error: 'Error al remover materia'
			});
		}
	},

	revokeAllSessions: async ({ params, locals }) => {
		const currentUser = locals.user;

		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		requireRole(currentUser, ['SUPERADMIN', 'DIRECTOR']);
		await requirePermission(currentUser, 'USER', 'update');
		await requireSuperadminTargetAccess(currentUser, params.id);

		if (currentUser.id === params.id) {
			return fail(400, {
				error: 'No puedes revocar tus propias sesiones. Usa la función de logout normal.'
			});
		}

		try {
			const targetUser = await prisma.user.findUnique({
				where: {
					id: params.id
				},
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			});

			if (!targetUser) {
				return fail(404, {
					error: 'Usuario no encontrado'
				});
			}

			const deletedSessions = await prisma.session.deleteMany({
				where: {
					userId: params.id
				}
			});

			await auditLog({
				userId: currentUser.id,
				action: AuditAction.DELETE,
				entityType: 'SESSION',
				entityId: params.id,
				description: `Revocación de todas las sesiones del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}). ${deletedSessions.count} sesiones eliminadas.`
			});

			return {
				success: true,
				message:
					deletedSessions.count === 1
						? '1 sesión revocada exitosamente'
						: `${deletedSessions.count} sesiones revocadas exitosamente`
			};
		} catch (error) {
			console.error('Error al revocar sesiones:', error);

			return fail(500, {
				error: 'Error al revocar sesiones'
			});
		}
	}
};
