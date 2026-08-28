import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ params, locals }) => {
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
					career: {
						include: {
							locations: {
								include: {
									location: true
								}
							}
						}
					},
					location: true
				}
			},
			teacher: {
				include: {
					subjects: {
						include: {
							subject: {
								include: {
									careerSubjects: {
										include: {
											career: {
												include: {
													locations: {
														include: {
															location: true
														}
													}
												}
											}
										}
									}
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

	// Obtener carrera del docente si tiene materias asignadas
	let teacherCareer: any = null;
	if (user.teacher && user.teacher.subjects.length > 0) {
		const firstSubject = user.teacher.subjects[0];
		if (firstSubject.subject.careerSubjects.length > 0) {
			const careerSubject = firstSubject.subject.careerSubjects[0];
			// Obtener localidades donde el docente presta servicio
			const locations = user.locationPermissions.map((lp) => lp.location.name);
			teacherCareer = {
				id: careerSubject.career.id,
				name: careerSubject.career.name,
				code: careerSubject.career.code,
				locations
			};
		}
	}

	// Serializar valores Decimal a números para evitar errores de serialización
	const serializedUser = {
		...user,
		teacher: user.teacher
			? {
					...user.teacher,
					subjects: user.teacher.subjects.map((st) => ({
						...st,
						subject: {
							...st.subject,
							approvalThreshold: st.subject.approvalThreshold
								? Number(st.subject.approvalThreshold)
								: null,
							promotionThreshold: st.subject.promotionThreshold
								? Number(st.subject.promotionThreshold)
								: null,
							careerSubjects: st.subject.careerSubjects.map((cs) => ({
								...cs,
								career: {
									...cs.career,
									locations: cs.career.locations.map((cl) => ({
										...cl,
										location: cl.location
									}))
								}
							}))
						}
					}))
				}
			: null
	};

	// Obtener usuario actual y sus roles
	const currentUser = locals.user;
	const currentUserRoles = currentUser?.roles || [];

	// Determinar si el usuario actual puede reestablecer contraseñas
	const canResetPassword = currentUserRoles.some((role) =>
		['SUPERADMIN', 'APODERADO', 'DIRECTOR', 'SECRETARIA'].includes(role)
	);

	// Determinar si el usuario tiene roles administrativos
	const isAdmin = user.roles.some((ur) =>
		['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'].includes(ur.role.code)
	);

	// Cargar evaluaciones creadas por el usuario o todas si es admin (nuevo modelo)
	const evaluations = await prisma.evaluation.findMany({
		where: isAdmin ? {} : { createdByUserId: user.id },
		include: {
			subject: true,
			createdByUser: {
				select: {
					firstName: true,
					lastName: true
				}
			}
		},
		orderBy: { evaluationDate: 'desc' }
	});

	return {
		user: serializedUser,
		teacherCareer,
		canResetPassword,
		evaluations: evaluations.map((e) => ({
			id: e.id,
			title: e.title,
			type: e.type,
			date: e.evaluationDate,
			subject: e.subject.name,
			subjectCode: e.subject.code,
			creator: `${e.createdByUser.firstName} ${e.createdByUser.lastName}`
		}))
	};
};

export const actions: Actions = {
	resetPassword: async ({ params, locals }) => {
		const currentUser = locals.user;
		if (!currentUser) {
			return fail(401, { error: 'No autorizado' });
		}

		const currentUserRoles = currentUser.roles || [];

		// Validar permisos: solo SUPERADMIN, APODERADO, DIRECTOR, SECRETARIA
		const hasPermission = currentUserRoles.some((role) =>
			['SUPERADMIN', 'APODERADO', 'DIRECTOR', 'SECRETARIA'].includes(role)
		);

		if (!hasPermission) {
			return fail(403, { error: 'No tenés permisos para reestablecer contraseñas' });
		}

		// Verificar que el usuario existe
		const user = await prisma.user.findUnique({
			where: { id: params.id },
			select: { id: true, email: true, firstName: true, lastName: true }
		});

		if (!user) {
			return fail(404, { error: 'Usuario no encontrado' });
		}

		// Hashear la contraseña por defecto
		const defaultPassword = '12345678';
		const passwordHash = await bcrypt.hash(defaultPassword, 10);

		// Actualizar la contraseña
		await prisma.user.update({
			where: { id: params.id },
			data: { passwordHash }
		});

		return {
			success: true,
			message: `Contraseña reestablecida a ${defaultPassword} para ${user.firstName} ${user.lastName}`
		};
	}
};
