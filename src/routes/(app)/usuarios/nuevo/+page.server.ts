import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import bcrypt from 'bcryptjs';

import type { RoleCode } from '@prisma/client';

const ROLE_MAP: Record<string, RoleCode> = {
	ALUMNO: 'ALUMNO',
	DOCENTE: 'DOCENTE',
	SECRETARIA: 'SECRETARIA',
	FINANZAS: 'FINANZAS',
	DIRECTOR: 'DIRECTOR'
};

export const load: PageServerLoad = async () => {
	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: { id: true, name: true }
	});

	return { careers };
};

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const firstName = data.get('firstName')?.toString();
		const lastName = data.get('lastName')?.toString();
		const type = data.get('type')?.toString();
		const dni = data.get('dni')?.toString();
		const careerId = data.get('careerId')?.toString();
		const isBecado = data.get('isBecado') === 'on';
		const isRecursante = data.get('isRecursante') === 'on';

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

			// Generar contraseña temporal
			const tempPassword = Math.random().toString(36).slice(-8);
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

				// Si es ALUMNO, crear el registro de estudiante
				if (type === 'ALUMNO') {
					if (!careerId) {
						throw new Error('Debe seleccionar una carrera para el alumno');
					}
					await tx.student.create({
						data: {
							userId: user.id,
							dni,
							firstName,
							lastName,
							careerId,
							isBecado,
							isRecursante
						}
					});
				}

				// Si es DOCENTE, crear el registro de docente
				if (type === 'DOCENTE') {
					await tx.teacher.create({
						data: {
							userId: user.id,
							dni,
							firstName,
							lastName
						}
					});
				}

				return user;
			});

			console.log('Usuario creado:', result.id, 'Contraseña temporal:', tempPassword);

			// TODO: Enviar email con la contraseña temporal

			redirect(303, '/usuarios');
		} catch (error) {
			console.error('Error al crear usuario:', error);
			const message = error instanceof Error ? error.message : 'Error al crear el usuario';
			return fail(500, { error: message });
		}
	}
} satisfies Actions;
