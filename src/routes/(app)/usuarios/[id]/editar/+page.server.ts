import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

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

	// Verificar permisos: SECRETARIA no puede editar SUPERADMIN, SECRETARIA, DIRECTOR, APODERADO
	const isSecretary = currentUser.roles.includes('SECRETARIA');
	const restrictedRoles = ['SUPERADMIN', 'SECRETARIA', 'DIRECTOR', 'APODERADO'];

	if (isSecretary) {
		const hasRestrictedRole = user.roles.some((ur) => restrictedRoles.includes(ur.role.code));
		if (hasRestrictedRole) {
			throw error(403, 'No tienes permiso para editar usuarios con roles administrativos');
		}
	}

	const roles = await prisma.role.findMany({
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
		where: { active: true },
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
			const hasRestrictedRole = targetUser.roles.some((ur) =>
				restrictedRoles.includes(ur.role.code)
			);
			if (hasRestrictedRole) {
				return fail(403, {
					error: 'No tienes permiso para editar usuarios con roles administrativos'
				});
			}
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
		const validStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
		if (status && !validStatuses.includes(status)) {
			return fail(400, { error: 'Estado inválido' });
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
			await prisma.user.update({
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

			// Mantener sincronizados User y Student.
			const student = await prisma.student.findUnique({
				where: { userId: params.id }
			});

			if (student) {
				await prisma.student.update({
					where: { userId: params.id },
					data: {
						firstName,
						lastName,
						...(dni ? { dni } : {})
					}
				});
			}

			// Mantener sincronizados User y Teacher.
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (teacher) {
				await prisma.teacher.update({
					where: { userId: params.id },
					data: {
						firstName,
						lastName,
						...(dni ? { dni } : {})
					}
				});
			}

			// Registrar en auditoría
			await auditLog({
				userId: currentUser.id,
				action: AuditAction.UPDATE,
				entityType: 'USER',
				entityId: params.id,
				description: `Actualización de usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
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

			if (
				!Number.isInteger(currentYear) ||
				currentYear < 1 ||
				currentYear > career.durationYears
			) {
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

		const formData = await request.formData();
		const roleIds = formData.getAll('roleIds').map((r) => r.toString());

		try {
			// Validar que todos los roleIds existan
			if (roleIds.length > 0) {
				const roles = await prisma.role.findMany({
					where: { id: { in: roleIds } }
				});
				if (roles.length !== roleIds.length) {
					return fail(400, { error: 'Algunos roles no existen' });
				}
			}

			// Eliminar roles actuales
			await prisma.userRole.deleteMany({
				where: { userId: params.id }
			});

			// Agregar nuevos roles
			if (roleIds.length > 0) {
				await prisma.userRole.createMany({
					data: roleIds.map((roleId) => ({
						userId: params.id,
						roleId
					})),
					skipDuplicates: true
				});
			}

			// Registrar en auditoría
			const targetUser = await prisma.user.findUnique({
				where: { id: params.id }
			});
			if (targetUser) {
				await auditLog({
					userId: currentUser.id,
					action: AuditAction.UPDATE,
					entityType: 'USER_ROLES',
					entityId: params.id,
					description: `Actualización de roles del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar roles' });
		}
	},

	updateLocations: async ({ request, params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		const formData = await request.formData();
		const locationIds = formData.getAll('locationIds').map((r) => r.toString());

		try {
			// Validar que todos los locationIds existan y estén activos
			if (locationIds.length > 0) {
				const locations = await prisma.location.findMany({
					where: {
						id: { in: locationIds },
						active: true
					}
				});
				if (locations.length !== locationIds.length) {
					return fail(400, { error: 'Algunas sedes no existen o no están activas' });
				}
			}

			// Eliminar permisos actuales
			await prisma.userLocationPermission.deleteMany({
				where: { userId: params.id }
			});

			// Agregar nuevos permisos
			if (locationIds.length > 0) {
				await prisma.userLocationPermission.createMany({
					data: locationIds.map((locationId) => ({
						userId: params.id,
						locationId
					})),
					skipDuplicates: true
				});
			}

			// Registrar en auditoría
			const targetUser = await prisma.user.findUnique({
				where: { id: params.id }
			});
			if (targetUser) {
				await auditLog({
					userId: currentUser.id,
					action: AuditAction.UPDATE,
					entityType: 'USER_LOCATIONS',
					entityId: params.id,
					description: `Actualización de sedes del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar sedes' });
		}
	},

	addSubject: async ({ request, params }) => {
		const formData = await request.formData();
		const subjectId = formData.get('subjectId')?.toString();
		const assignmentType = formData.get('assignmentType')?.toString() ?? 'TITULAR';

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		if (!['TITULAR', 'SUPLENTE'].includes(assignmentType)) {
			return fail(400, { error: 'Condición docente inválida' });
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
			}

			const existingAssignment = await prisma.subjectTeacher.findFirst({
				where: {
					subjectId,
					teacherId: teacher.id
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

			return {
				success: true,
				message: `Materia asignada como ${assignmentType === 'SUPLENTE' ? 'suplente' : 'titular'}`
			};
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al agregar materia' });
		}
	},

	updateSubjectAssignment: async ({ request, params }) => {
		const formData = await request.formData();

		const subjectId = formData.get('subjectId')?.toString();
		const assignmentType = formData.get('assignmentType')?.toString();

		if (!subjectId) {
			return fail(400, { error: 'Materia requerida' });
		}

		if (!assignmentType || !['TITULAR', 'SUPLENTE'].includes(assignmentType)) {
			return fail(400, { error: 'Condición docente inválida' });
		}

		try {
			const teacher = await prisma.teacher.findUnique({
				where: { userId: params.id }
			});

			if (!teacher) {
				return fail(400, { error: 'El usuario no es docente' });
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

			return {
				success: true,
				message: `Condición actualizada a ${assignmentType === 'SUPLENTE' ? 'Suplente' : 'Titular'}`
			};
		} catch (e) {
			console.error(e);
			return fail(500, {
				error: 'Error al actualizar la condición docente'
			});
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
	},

	revokeAllSessions: async ({ params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		// Solo SUPERADMIN y DIRECTOR pueden revocar todas las sesiones
		if (!currentUser.roles.includes('SUPERADMIN') && !currentUser.roles.includes('DIRECTOR')) {
			return fail(403, { error: 'No tienes permisos para revocar sesiones' });
		}

		// Prevenir auto-revocación (un usuario no puede revocar sus propias sesiones)
		if (currentUser.id === params.id) {
			return fail(400, {
				error: 'No puedes revocar tus propias sesiones. Usa la función de logout normal.'
			});
		}

		try {
			// Obtener usuario objetivo
			const targetUser = await prisma.user.findUnique({
				where: { id: params.id }
			});

			if (!targetUser) {
				return fail(404, { error: 'Usuario no encontrado' });
			}

			// Eliminar todas las sesiones del usuario
			const deletedCount = await prisma.session.deleteMany({
				where: { userId: params.id }
			});

			// Registrar en auditoría
			await auditLog({
				userId: currentUser.id,
				action: AuditAction.DELETE,
				entityType: 'SESSION',
				entityId: params.id,
				description: `Revocación de todas las sesiones del usuario ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}). ${deletedCount.count} sesiones eliminadas.`
			});

			return { success: true, message: `${deletedCount.count} sesiones revocadas exitosamente` };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al revocar sesiones' });
		}
	}
};
