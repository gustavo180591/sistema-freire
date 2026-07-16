import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireCanAssignSubjects } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
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
				id: st.subject.id,
				code: st.subject.code,
				name: st.subject.name,
				yearLevel: st.subject.yearLevel,
				active: st.subject.active,
				careers: st.subject.careerSubjects.map((cs) => cs.career)
			})),
			availableSubjects: [],
			availableSubjectsByCareer: [],
			teacherLocation: null,
			error:
				'La docente no tiene una localidad asignada. Asigná una localidad antes de cargar materias.'
		};
	}

	// Obtener la localidad del docente (usar la primera si tiene múltiples)
	const teacherLocation = teacher.user.locationPermissions[0].location;
	const teacherLocationId = teacherLocation.id;

	// Obtener carreras disponibles en la localidad del docente
	const careerLocations = await prisma.careerLocation.findMany({
		where: { locationId: teacherLocationId },
		include: {
			career: true
		}
	});

	const careerIds = careerLocations.filter((cl) => cl.career.active).map((cl) => cl.careerId);

	// Obtener study plans activos de esas carreras
	const studyPlans = await prisma.studyPlan.findMany({
		where: {
			careerId: { in: careerIds },
			active: true
		},
		include: {
			career: true
		}
	});

	const studyPlanIds = studyPlans.map((sp) => sp.id);

	// Obtener materias de esos planes via PlanSubject
	const planSubjects = await prisma.planSubject.findMany({
		where: {
			planId: { in: studyPlanIds }
		},
		include: {
			subject: true,
			plan: {
				include: {
					career: true
				}
			}
		},
		orderBy: [
			{ sortOrder: 'asc' },
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
	const activePlanSubjects = planSubjects.filter((ps) => ps.subject.active);

	// Obtener IDs de materias ya asignadas
	const assignedSubjectIds = teacher.subjects.map((st) => st.subjectId);

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

	for (const planSubject of activePlanSubjects) {
		const careerId = planSubject.plan.careerId;
		const careerName = planSubject.plan.career.name;

		if (!subjectsByCareer.has(careerId)) {
			subjectsByCareer.set(careerId, []);
		}

		subjectsByCareer.get(careerId)?.push({
			id: planSubject.subject.id,
			code: planSubject.subject.code,
			name: planSubject.subject.name,
			yearLevel: planSubject.subject.yearLevel,
			careerId,
			careerName,
			sortOrder: planSubject.sortOrder,
			isAssigned: assignedSubjectIds.includes(planSubject.subject.id)
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
	const availableSubjects = activePlanSubjects
		.filter((ps) => !assignedSubjectIds.includes(ps.subject.id))
		.map((ps) => ({
			id: ps.subject.id,
			code: ps.subject.code,
			name: ps.subject.name,
			yearLevel: ps.subject.yearLevel,
			careers: [ps.plan.career]
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
			assignmentType: 'TITULAR' as const,
			id: st.subject.id,
			code: st.subject.code,
			name: st.subject.name,
			yearLevel: st.subject.yearLevel,
			active: st.subject.active,
			careers: st.subject.careerSubjects.map((cs) => cs.career)
		})),
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

			const teacherLocationId = teacher.user.locationPermissions[0].locationId;

			// Verificar que la materia existe
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			if (!subject) {
				return { error: 'Materia no encontrada' };
			}

			// Verificar que la materia pertenezca a una carrera disponible en la localidad del docente
			const careerLocations = await prisma.careerLocation.findMany({
				where: { locationId: teacherLocationId },
				include: {
					career: true
				}
			});

			const careerIds = careerLocations.filter((cl) => cl.career.active).map((cl) => cl.careerId);

			const studyPlans = await prisma.studyPlan.findMany({
				where: {
					careerId: { in: careerIds },
					active: true
				}
			});

			const studyPlanIds = studyPlans.map((sp) => sp.id);

			const planSubject = await prisma.planSubject.findFirst({
				where: {
					subjectId,
					planId: { in: studyPlanIds }
				}
			});

			if (!planSubject) {
				return {
					error:
						'La materia no pertenece a ninguna carrera disponible en la localidad de la docente'
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

			// Crear asignación usando $executeRaw para evitar problemas con tipos de Prisma
			await prisma.$executeRaw`
				INSERT INTO "subject_teachers" ("subjectId", "teacherId", "assignmentType")
				VALUES (${subjectId}, ${teacherId}, ${assignmentType}::"TeacherAssignmentType")
				ON CONFLICT ("subjectId", "teacherId") DO NOTHING
			`;

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

			// Actualizar tipo de asignación usando $executeRaw para evitar problemas con tipos de Prisma
			await prisma.$executeRaw`
				UPDATE "subject_teachers"
				SET "assignmentType" = ${assignmentType}::"TeacherAssignmentType"
				WHERE "subjectId" = ${subjectId} AND "teacherId" = ${teacherId}
			`;

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
