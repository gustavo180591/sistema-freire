import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireCanAssignSubjects } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction, TeacherAssignmentType } from '@prisma/client';

type AssignedSubject = {
	subjectId: string;
	teacherId: string;
	assignmentType: 'TITULAR' | 'SUPLENTE';
	id: string;
	code: string;
	name: string;
	yearLevel: number;
	active: boolean;
	careers: Array<{
		id: string;
		name: string;
	}>;
};

type CommissionSummary = {
	id: string;
	code: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	careerName: string;
	locationName: string;
	academicTermName: string;
};

function toCommissionSummary(commission: {
	id: string;
	code: string;
	subjectId: string;
	subject: { code: string; name: string };
	career: { name: string } | null;
	location: { name: string } | null;
	academicTerm: { name: string } | null;
}): CommissionSummary {
	return {
		id: commission.id,
		code: commission.code,
		subjectId: commission.subjectId,
		subjectCode: commission.subject.code,
		subjectName: commission.subject.name,
		careerName: commission.career?.name || 'Sin carrera',
		locationName: commission.location?.name || 'Sin localidad',
		academicTermName: commission.academicTerm?.name || 'Sin período'
	};
}

export const load: PageServerLoad = async ({
	params,
	locals
}): Promise<{
	teacher: {
		id: string;
		userId: string;
		dni: string;
		firstName: string;
		lastName: string;
		email: string;
	};
	assignedSubjects: AssignedSubject[];
	assignedCommissions: CommissionSummary[];
	availableCommissions: CommissionSummary[];
	availableSubjects: Array<{
		id: string;
		code: string;
		name: string;
		yearLevel: number;
		careers: Array<{
			id: string;
			name: string;
		}>;
	}>;
	availableSubjectsByCareer: Array<{
		careerId: string;
		careerName: string;
		subjects: Array<{
			id: string;
			code: string;
			name: string;
			yearLevel: number;
			careerId: string;
			careerName: string;
			sortOrder: number;
			isAssigned: boolean;
		}>;
	}>;
	teacherLocation: {
		id: string;
		name: string;
		code: string;
	} | null;
	error?: string;
}> => {
	requireCanAssignSubjects(locals.user);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const teacherId = params.id;

	// Obtener el docente con sus permisos de localidad
	const teacher = await prisma.teacher.findUnique({
		where: { id: teacherId },
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
					subject: {
						include: {
							careerSubjects: {
								include: {
									career: true
								}
							}
						}
					}
				}
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/docentes');
	}

	const assignedCommissions = (
		await prisma.subjectCommission.findMany({
			where: {
				teacherId,
				active: true
			},
			include: {
				subject: true,
				career: true,
				location: true,
				academicTerm: true
			},
			orderBy: { code: 'asc' }
		})
	).map(toCommissionSummary);

	// Verificar si el docente tiene localidad asignada
	if (teacher.user.locationPermissions.length === 0) {
		return {
			teacher: {
				id: teacher.id,
				userId: teacher.userId,
				dni: teacher.dni,
				firstName: teacher.firstName,
				lastName: teacher.lastName,
				email: teacher.user.email
			},
			assignedSubjects: teacher.subjects.map((st) => ({
				subjectId: st.subjectId,
				teacherId: st.teacherId,
				assignmentType: (st as { assignmentType: 'TITULAR' | 'SUPLENTE' }).assignmentType,
				id: st.subject.id,
				code: st.subject.code,
				name: st.subject.name,
				yearLevel: st.subject.yearLevel,
				active: st.subject.active,
				careers: st.subject.careerSubjects.map((cs) => cs.career)
			})),
			assignedCommissions,
			availableCommissions: [],
			availableSubjects: [],
			availableSubjectsByCareer: [],
			teacherLocation: null,
			error:
				'La docente no tiene una localidad asignada. Asigná una localidad antes de cargar materias.'
		};
	}

	// Obtener la localidad del docente (usar la primera si tiene múltiples)
	const teacherLocation = teacher.user.locationPermissions[0].location;
	const teacherLocationIds = teacher.user.locationPermissions.map(
		(locationPermission) => locationPermission.location.id
	);

	// Obtener carreras disponibles en las localidades del docente
	const careerLocations = await prisma.careerLocation.findMany({
		where: { locationId: { in: teacherLocationIds } },
		include: {
			career: true
		}
	});

	const careerIds = careerLocations.filter((cl) => cl.career.active).map((cl) => cl.careerId);

	// Obtener materias vinculadas a esas carreras via CareerSubject
	const careerSubjects = await prisma.careerSubject.findMany({
		where: {
			careerId: { in: careerIds }
		},
		include: {
			subject: true,
			career: true
		},
		orderBy: [
			{ yearLevel: 'asc' },
			{
				subject: {
					yearLevel: 'asc'
				}
			},
			{
				subject: {
					name: 'asc'
				}
			}
		]
	});

	// Filtrar solo materias activas
	const activeCareerSubjects = careerSubjects.filter(
		(careerSubject) => careerSubject.subject.active
	);

	// Obtener IDs de materias ya asignadas
	const assignedSubjectIds = teacher.subjects.map((st) => st.subjectId);

	const availableCommissions = (
		await prisma.subjectCommission.findMany({
			where: {
				active: true,
				teacherId: null,
				subjectId: { in: assignedSubjectIds },
				locationId: { in: teacherLocationIds }
			},
			include: {
				subject: true,
				career: true,
				location: true,
				academicTerm: true
			},
			orderBy: { code: 'asc' }
		})
	).map(toCommissionSummary);

	// Agrupar materias por carrera
	const subjectsByCareer = new Map<
		string,
		Array<{
			id: string;
			code: string;
			name: string;
			yearLevel: number;
			careerId: string;
			careerName: string;
			sortOrder: number;
			isAssigned: boolean;
		}>
	>();

	for (const careerSubject of activeCareerSubjects) {
		const careerId = careerSubject.careerId;
		const careerName = careerSubject.career.name;

		if (!subjectsByCareer.has(careerId)) {
			subjectsByCareer.set(careerId, []);
		}

		subjectsByCareer.get(careerId)?.push({
			id: careerSubject.subject.id,
			code: careerSubject.subject.code,
			name: careerSubject.subject.name,
			yearLevel: careerSubject.subject.yearLevel,
			careerId,
			careerName,
			sortOrder: careerSubject.yearLevel,
			isAssigned: assignedSubjectIds.includes(careerSubject.subject.id)
		});
	}

	// Convertir a array y ordenar por carrera
	const availableSubjectsByCareer = Array.from(subjectsByCareer.entries())
		.map(([careerId, subjects]) => ({
			careerId,
			careerName: subjects[0].careerName,
			subjects: subjects.sort((a, b) => {
				if (a.yearLevel !== b.yearLevel) return a.yearLevel - b.yearLevel;
				if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
				return a.name.localeCompare(b.name);
			})
		}))
		.sort((a, b) => a.careerName.localeCompare(b.careerName));

	// Materias no asignadas (para compatibilidad con UI actual)
	const availableSubjects = activeCareerSubjects
		.filter((careerSubject) => !assignedSubjectIds.includes(careerSubject.subject.id))
		.map((careerSubject) => ({
			id: careerSubject.subject.id,
			code: careerSubject.subject.code,
			name: careerSubject.subject.name,
			yearLevel: careerSubject.subject.yearLevel,
			careers: [careerSubject.career]
		}));

	return {
		teacher: {
			id: teacher.id,
			userId: teacher.userId,
			dni: teacher.dni,
			firstName: teacher.firstName,
			lastName: teacher.lastName,
			email: teacher.user.email
		},
		assignedSubjects: teacher.subjects.map((st) => ({
			subjectId: st.subjectId,
			teacherId: st.teacherId,
			assignmentType: (st as { assignmentType: 'TITULAR' | 'SUPLENTE' }).assignmentType,
			id: st.subject.id,
			code: st.subject.code,
			name: st.subject.name,
			yearLevel: st.subject.yearLevel,
			active: st.subject.active,
			careers: st.subject.careerSubjects.map((cs) => cs.career)
		})) satisfies AssignedSubject[],
		assignedCommissions,
		availableCommissions,
		availableSubjects,
		availableSubjectsByCareer,
		teacherLocation: {
			id: teacherLocation.id,
			name: teacherLocation.name,
			code: teacherLocation.code
		}
	};
};

export const actions: Actions = {
	assignSubject: async ({ request, locals }) => {
		requireCanAssignSubjects(locals.user);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const teacherId = data.get('teacherId')?.toString();
		const subjectId = data.get('subjectId')?.toString();
		const assignmentType = data.get('assignmentType')?.toString();

		if (!teacherId || !subjectId || !assignmentType) {
			return { error: 'Datos requeridos faltantes' };
		}

		// Validar assignmentType
		if (assignmentType !== 'TITULAR' && assignmentType !== 'SUPLENTE') {
			return { error: 'Tipo de asignación inválido' };
		}

		const normalizedAssignmentType =
			assignmentType === 'TITULAR' ? TeacherAssignmentType.TITULAR : TeacherAssignmentType.SUPLENTE;

		try {
			// Verificar que el docente existe y obtener su localidad
			const teacher = await prisma.teacher.findUnique({
				where: { id: teacherId },
				include: {
					user: {
						include: {
							locationPermissions: {
								include: {
									location: true
								}
							}
						}
					}
				}
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			// Verificar que el docente tenga localidad asignada
			if (teacher.user.locationPermissions.length === 0) {
				return { error: 'La docente no tiene una localidad asignada' };
			}

			const teacherLocationIds = teacher.user.locationPermissions.map(
				(locationPermission) => locationPermission.location.id
			);

			// Verificar que la materia existe
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			if (!subject) {
				return { error: 'Materia no encontrada' };
			}

			if (!subject.active) {
				return { error: 'La materia no está activa' };
			}

			// Verificar que la materia pertenezca a una carrera disponible en las localidades del docente
			const careerLocations = await prisma.careerLocation.findMany({
				where: { locationId: { in: teacherLocationIds } },
				include: {
					career: true
				}
			});

			const careerIds = careerLocations.filter((cl) => cl.career.active).map((cl) => cl.careerId);

			const careerSubject = await prisma.careerSubject.findFirst({
				where: {
					subjectId,
					careerId: { in: careerIds }
				}
			});

			if (!careerSubject) {
				return {
					error:
						'La materia no pertenece a ninguna carrera disponible en las localidades de la docente'
				};
			}

			// Verificar que no esté ya asignada
			const existingAssignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				}
			});

			if (existingAssignment) {
				return { error: 'La materia ya está asignada a este docente' };
			}

			await prisma.subjectTeacher.create({
				data: {
					subjectId,
					teacherId,
					assignmentType: normalizedAssignmentType
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'SUBJECT_TEACHER',
				entityId: teacherId,
				description: `Asignación de materia ${subject.code} - ${subject.name} al docente ${teacher.lastName}, ${teacher.firstName} como ${assignmentType}`
			});

			return { success: 'Materia asignada exitosamente' };
		} catch (error) {
			console.error('Error al asignar materia:', error);
			return { error: 'Error al asignar la materia' };
		}
	},

	assignCommission: async ({ request, locals }) => {
		requireCanAssignSubjects(locals.user);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const teacherId = data.get('teacherId')?.toString();
		const commissionId = data.get('commissionId')?.toString();

		if (!teacherId || !commissionId) {
			return { error: 'Docente y comisión son requeridos' };
		}

		try {
			const commission = await prisma.subjectCommission.findUnique({
				where: { id: commissionId },
				include: {
					subject: true,
					location: true
				}
			});

			if (!commission || !commission.active) {
				return { error: 'La comisión no existe o no está activa' };
			}

			if (!commission.locationId) {
				return { error: 'La comisión debe tener una localidad antes de asignar docente' };
			}

			if (commission.teacherId) {
				return { error: 'La comisión ya tiene un docente asignado' };
			}

			const eligibleTeacher = await prisma.teacher.findFirst({
				where: {
					id: teacherId,
					status: 'ACTIVE',
					subjects: { some: { subjectId: commission.subjectId } },
					user: {
						locationPermissions: { some: { locationId: commission.locationId } }
					}
				}
			});

			if (!eligibleTeacher) {
				return { error: 'El docente no está habilitado para la materia o la localidad' };
			}

			const updated = await prisma.subjectCommission.updateMany({
				where: {
					id: commissionId,
					teacherId: null,
					active: true
				},
				data: { teacherId }
			});

			if (updated.count !== 1) {
				return { error: 'La comisión fue modificada por otro usuario. Volvé a intentar.' };
			}

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'SubjectCommission',
				entityId: commissionId,
				description: `Asignó la comisión ${commission.code} de ${commission.subject.name} al docente ${eligibleTeacher.lastName}, ${eligibleTeacher.firstName}`
			});

			return { success: 'Comisión asignada exitosamente' };
		} catch (error) {
			console.error('Error al asignar comisión:', error);
			return { error: 'Error al asignar la comisión' };
		}
	},

	removeCommission: async ({ request, locals }) => {
		requireCanAssignSubjects(locals.user);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const teacherId = data.get('teacherId')?.toString();
		const commissionId = data.get('commissionId')?.toString();

		if (!teacherId || !commissionId) {
			return { error: 'Docente y comisión son requeridos' };
		}

		try {
			const commission = await prisma.subjectCommission.findFirst({
				where: {
					id: commissionId,
					teacherId
				},
				include: {
					subject: true,
					teacher: true
				}
			});

			if (!commission || !commission.teacher) {
				return { error: 'La comisión no está asignada a este docente' };
			}

			await prisma.subjectCommission.update({
				where: { id: commissionId },
				data: { teacherId: null }
			});

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'SubjectCommission',
				entityId: commissionId,
				description: `Desasignó la comisión ${commission.code} de ${commission.subject.name} del docente ${commission.teacher.lastName}, ${commission.teacher.firstName}`
			});

			return { success: 'Comisión desasignada exitosamente' };
		} catch (error) {
			console.error('Error al desasignar comisión:', error);
			return { error: 'Error al desasignar la comisión' };
		}
	},

	updateAssignmentType: async ({ request, locals }) => {
		requireCanAssignSubjects(locals.user);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const teacherId = data.get('teacherId')?.toString();
		const subjectId = data.get('subjectId')?.toString();
		const assignmentType = data.get('assignmentType')?.toString();

		if (!teacherId || !subjectId || !assignmentType) {
			return { error: 'Datos requeridos faltantes' };
		}

		// Validar assignmentType
		if (assignmentType !== 'TITULAR' && assignmentType !== 'SUPLENTE') {
			return { error: 'Tipo de asignación inválido' };
		}

		const normalizedAssignmentType =
			assignmentType === 'TITULAR' ? TeacherAssignmentType.TITULAR : TeacherAssignmentType.SUPLENTE;

		try {
			// Verificar que la asignación existe
			const assignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				},
				include: {
					subject: true,
					teacher: true
				}
			});

			if (!assignment) {
				return { error: 'Asignación no encontrada' };
			}

			await prisma.subjectTeacher.update({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				},
				data: {
					assignmentType: normalizedAssignmentType
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'SUBJECT_TEACHER',
				entityId: teacherId,
				description: `Actualización de condición de materia ${assignment.subject.code} - ${assignment.subject.name} al docente ${assignment.teacher.lastName}, ${assignment.teacher.firstName} a ${assignmentType}`
			});

			return { success: 'Condición actualizada exitosamente' };
		} catch (error) {
			console.error('Error al actualizar condición:', error);
			return { error: 'Error al actualizar la condición' };
		}
	},

	removeSubject: async ({ request, locals }) => {
		requireCanAssignSubjects(locals.user);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const subjectId = data.get('subjectId')?.toString();
		const teacherId = data.get('teacherId')?.toString();

		if (!subjectId || !teacherId) {
			return { error: 'Datos requeridos faltantes' };
		}

		try {
			// Obtener la asignación para auditoría
			const assignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				},
				include: {
					subject: true,
					teacher: true
				}
			});

			if (!assignment) {
				return { error: 'Asignación no encontrada' };
			}

			const linkedCommissionCount = await prisma.subjectCommission.count({
				where: {
					teacherId,
					subjectId,
					active: true
				}
			});

			if (linkedCommissionCount > 0) {
				return {
					error: `Desasigná primero las ${linkedCommissionCount} comisiones activas vinculadas a esta materia`
				};
			}

			// Eliminar asignación
			await prisma.subjectTeacher.delete({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId
					}
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.DELETE,
				entityType: 'SUBJECT_TEACHER',
				entityId: teacherId,
				description: `Eliminación de materia ${assignment.subject.code} - ${assignment.subject.name} del docente ${assignment.teacher.lastName}, ${assignment.teacher.firstName}`
			});

			return { success: 'Materia eliminada exitosamente' };
		} catch (error) {
			console.error('Error al eliminar materia:', error);
			return { error: 'Error al eliminar la materia' };
		}
	}
};
