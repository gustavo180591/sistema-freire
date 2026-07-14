import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import bcrypt from 'bcryptjs';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';
import { generateAutomaticCharges } from '$lib/server/financial/charge-generator';

import type { RoleCode } from '@prisma/client';

const ROLE_MAP: Record<string, RoleCode> = {
	ALUMNO: 'ALUMNO',
	DOCENTE: 'DOCENTE',
	SECRETARIA: 'SECRETARIA',
	FINANZAS: 'FINANZAS',
	DIRECTOR: 'DIRECTOR',
	APODERADO: 'APODERADO',
	PRECEPTOR: 'PRECEPTOR',
	SIN_TIPO: 'SIN_TIPO'
};

// Función para generar ID de alumno con prefijo según localidad
function generateStudentId(locality: string): string {
	const prefix = locality === 'ALEM' ? 'A' : locality === 'CAPIOVI' ? 'C' : '';
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `${prefix}${timestamp}${random}`.toUpperCase();
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) {
		throw redirect(303, '/login');
	}

	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: { id: true, name: true }
	});

	// Si es SECRETARIA, filtrar localidades según sus permisos
	let locations;
	let secretaryLocationCode: string | null = null;
	if (currentUser.roles.includes('SECRETARIA')) {
		const userWithPermissions = await prisma.user.findUnique({
			where: { id: currentUser.id },
			include: {
				locationPermissions: {
					include: {
						location: true
					}
				}
			}
		});

		if (userWithPermissions && userWithPermissions.locationPermissions.length > 0) {
			locations = userWithPermissions.locationPermissions.map((lp) => lp.location);
			secretaryLocationCode = userWithPermissions.locationPermissions[0].location.code;
		} else {
			locations = await prisma.location.findMany({
				where: { active: true },
				orderBy: { name: 'asc' },
				select: { id: true, name: true, code: true }
			});
		}
	} else {
		locations = await prisma.location.findMany({
			where: { active: true },
			orderBy: { name: 'asc' },
			select: { id: true, name: true, code: true }
		});
	}

	const type = url.searchParams.get('type') || 'ALUMNO';

	return {
		careers,
		locations,
		type,
		isSecretary: currentUser.roles.includes('SECRETARIA'),
		secretaryLocationCode
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		const data = await request.formData();
		const email = data.get('email')?.toString();
		const firstName = data.get('firstName')?.toString();
		const lastName = data.get('lastName')?.toString();
		const type = data.get('type')?.toString();
		const dni = data.get('dni')?.toString();
		const cuil = data.get('cuil')?.toString()?.trim();
		const careerId = data.get('careerId')?.toString();
		const alumnoType = data.get('alumnoType')?.toString() || 'normal';
		const inscriptionPaid = data.get('inscriptionPaid')?.toString() === 'on';

		// Verificar permisos: SECRETARIA solo puede crear DOCENTE, ALUMNO, PRECEPTOR
		const isSecretary = currentUser.roles.includes('SECRETARIA');
		const allowedRolesForSecretary = ['DOCENTE', 'ALUMNO', 'PRECEPTOR'];

		if (isSecretary && type && !allowedRolesForSecretary.includes(type)) {
			return fail(403, {
				error: 'Como SECRETARIA solo puedes crear DOCENTES, ALUMNOS y PRECEPTORES'
			});
		}

		// Si es SECRETARIA, verificar que la localidad seleccionada esté en sus permisos
		if (isSecretary) {
			const userWithPermissions = await prisma.user.findUnique({
				where: { id: currentUser.id },
				include: {
					locationPermissions: {
						include: {
							location: true
						}
					}
				}
			});

			if (!userWithPermissions || userWithPermissions.locationPermissions.length === 0) {
				return fail(403, { error: 'No tienes permisos de localidad asignados' });
			}

			const allowedLocationCodes = userWithPermissions.locationPermissions.map(
				(lp) => lp.location.code
			);
			const selectedLocality = data.get('locality')?.toString();

			if (selectedLocality && !allowedLocationCodes.includes(selectedLocality)) {
				return fail(403, { error: 'Solo puedes crear usuarios de tu localidad asignada' });
			}
		}
		const isBecado = alumnoType === 'becado';
		const isRecursante = alumnoType === 'recursante';

		if (!email || !firstName || !lastName || !dni || !type) {
			return fail(400, { error: 'Por favor completá los datos esenciales', missing: true });
		}

		try {
			// Verificar si el email ya existe
			const existingUser = await prisma.user.findUnique({
				where: { email }
			});

			if (existingUser) {
				return fail(400, { error: 'El correo ya está registrado', exists: true });
			}

			// Verificar si el DNI ya existe (para alumnos y docentes)
			if (type === 'ALUMNO' || type === 'DOCENTE') {
				const existingDni =
					(await prisma.student
						.findUnique({
							where: { dni }
						})
						.catch(() => null)) ||
					(await prisma.teacher
						.findUnique({
							where: { dni }
						})
						.catch(() => null));

				if (existingDni) {
					return fail(400, { error: 'El DNI ya está registrado', exists: true });
				}
			}

			// Usar contraseña temporal por defecto
			const tempPassword = '12345678';
			const passwordHash = await bcrypt.hash(tempPassword, 10);

			// Buscar el rol
			const role = await prisma.role.findUnique({
				where: { code: ROLE_MAP[type] }
			});

			if (!role) {
				return fail(400, { error: 'Rol no encontrado' });
			}

			// Crear usuario en transacción
			const result = await prisma.$transaction(async (tx) => {
				// Crear el usuario
				const user = await tx.user.create({
					data: {
						email,
						passwordHash,
						firstName,
						lastName,
						dni: dni || null,
						cuil: cuil || null,
						status: 'ACTIVE'
					}
				});

				// Asignar rol
				await tx.userRole.create({
					data: {
						userId: user.id,
						roleId: role.id
					}
				});

				// Si es ALUMNO, crear el registro de estudiante con campos extendidos
				if (type === 'ALUMNO') {
					if (!careerId) {
						throw new Error('Debe seleccionar una carrera para el alumno');
					}

					// Capturar campos adicionales del formulario
					const birthDate = data.get('birthDate')?.toString();
					const bloodType = data.get('bloodType')?.toString();
					const phone = data.get('phone')?.toString();
					const address = data.get('address')?.toString();
					const locality = data.get('locality')?.toString();
					const postalCode = data.get('postalCode')?.toString();
					const highSchool = data.get('highSchool')?.toString();
					const highSchoolYear = data.get('highSchoolYear')?.toString()
						? parseInt(data.get('highSchoolYear')?.toString() || '0')
						: null;
					const instituteYear = data.get('instituteYear')?.toString()
						? parseInt(data.get('instituteYear')?.toString() || '0')
						: null;
					const currentYear = data.get('currentYear')?.toString()
						? parseInt(data.get('currentYear')?.toString() || '1')
						: 1;
					const familyContactName = data.get('familyContactName')?.toString();
					const familyContactPhone = data.get('familyContactPhone')?.toString();
					const familyRelationship = data.get('familyRelationship')?.toString();

					// Validar que se seleccione localidad
					if (!locality) {
						throw new Error('Debe seleccionar la localidad del alumno');
					}

					// Generar ID con prefijo según localidad
					const studentId = generateStudentId(locality);

					// Obtener locationId desde el code de locality
					const location = await tx.location.findUnique({
						where: { code: locality }
					});

					const student = await tx.student.create({
						data: {
							id: studentId,
							userId: user.id,
							dni,
							firstName,
							lastName,
							careerId,
							currentYear,
							birthDate: birthDate ? new Date(birthDate) : null,
							bloodType: bloodType || null,
							phone: phone || null,
							address: address || null,
							locality: locality || null,
							locationId: location?.id,
							postalCode: postalCode || null,
							highSchool: highSchool || null,
							highSchoolYear: highSchoolYear || null,
							instituteYear: instituteYear || null,
							familyContactName: familyContactName || null,
							familyContactPhone: familyContactPhone || null,
							familyRelationship: familyRelationship || null
						}
					});

					// Obtener el ciclo lectivo activo, considerando la sede del alumno
					let activeAcademicTerm;
					if (location?.id) {
						activeAcademicTerm = await tx.academicTerm.findFirst({
							where: { active: true, locationId: location.id }
						});
					}

					// Fallback a un ciclo lectivo activo general
					if (!activeAcademicTerm) {
						activeAcademicTerm = await tx.academicTerm.findFirst({
							where: { active: true }
						});
					}

					if (!activeAcademicTerm) {
						throw new Error('No hay un ciclo lectivo activo configurado');
					}

					// Generar cargos financieros automáticos
					await generateAutomaticCharges({
						studentId: student.id,
						studentFirstName: firstName,
						studentLastName: lastName,
						isBecado,
						isRecursante,
						careerId,
						inscriptionPaid,
						userId: currentUser.id,
						academicTermId: activeAcademicTerm.id,
						locationId: location?.id,
						tx
					});
				}

				// Si es DOCENTE, crear el registro de docente
				if (type === 'DOCENTE') {
					const locality = data.get('locality')?.toString();
					const hireDate = data.get('hireDate')?.toString();
					const observations = data.get('observations')?.toString();

					const teacher = await tx.teacher.create({
						data: {
							userId: user.id,
							dni,
							firstName,
							lastName,
							hireDate: hireDate ? new Date(hireDate) : null,
							observations: observations || null
						}
					});

					// Asignar permiso de localidad si se seleccionó
					if (locality) {
						const location = await tx.location.findUnique({
							where: { code: locality }
						});
						if (location) {
							await tx.userLocationPermission.create({
								data: {
									userId: user.id,
									locationId: location.id
								}
							});
						}
					}

					// Registrar en auditoría
					await auditLog({
						userId: currentUser.id,
						action: AuditAction.CREATE,
						entityType: 'TEACHER',
						entityId: teacher.id,
						description: `Creación de docente: ${lastName}, ${firstName} (DNI: ${dni})`
					});
				}

				// Si es PRECEPTOR, capturar localidad y asignar permiso
				if (type === 'PRECEPTOR') {
					const locality = data.get('locality')?.toString();

					// Asignar permiso de localidad si se seleccionó
					if (locality) {
						const location = await tx.location.findUnique({
							where: { code: locality }
						});
						if (location) {
							await tx.userLocationPermission.create({
								data: {
									userId: user.id,
									locationId: location.id
								}
							});
						}
					}
				}

				// Si es SECRETARIA, asignar permiso de localidad
				if (type === 'SECRETARIA') {
					const locality = data.get('locality')?.toString();

					// Asignar permiso de localidad si se seleccionó
					if (locality) {
						const location = await tx.location.findUnique({
							where: { code: locality }
						});
						if (location) {
							await tx.userLocationPermission.create({
								data: {
									userId: user.id,
									locationId: location.id
								}
							});
						}
					}
				}

				return user;
			});

			// Registrar en auditoría
			await auditLog({
				userId: result.id,
				action: AuditAction.CREATE,
				entityType: type,
				entityId: result.id,
				description: `Creación de usuario tipo ${type}: ${firstName} ${lastName} (${email})`
			});

			console.log('Usuario creado:', result.id, 'Contraseña temporal:', tempPassword);

			// TODO: Enviar email con la contraseña temporal

			return {
				success: `Usuario creado exitosamente. ID: ${result.id}, Contraseña temporal: 12345678`
			};
		} catch (error) {
			console.error('Error al crear usuario:', error);
			const message = error instanceof Error ? error.message : 'Error al crear el usuario';
			return fail(500, { error: message });
		}
	}
} satisfies Actions;
