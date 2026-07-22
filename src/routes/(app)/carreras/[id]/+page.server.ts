import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const career = await prisma.career.findUnique({
		where: {
			id: params.id
		},
		include: {
			students: {
				select: {
					id: true
				}
			},
			studyPlans: {
				where: {
					active: true
				},
				include: {
					subjects: {
						select: {
							subjectId: true
						}
					}
				},
				orderBy: {
					version: 'desc'
				}
			},
			careerSubjects: {
				include: {
					subject: {
						include: {
							teachers: {
								include: {
									teacher: {
										include: {
											user: true
										}
									}
								}
							}
						}
					}
				}
			}
		}
	});

	if (!career) {
		throw error(404, 'Carrera no encontrada');
	}

	// Obtener docentes únicos de la carrera
	const teacherMap = new Map<string, any>();
	career.careerSubjects.forEach((cs) => {
		cs.subject.teachers.forEach((st) => {
			if (!teacherMap.has(st.teacher.id)) {
				teacherMap.set(st.teacher.id, {
					id: st.teacher.id,
					firstName: st.teacher.firstName,
					lastName: st.teacher.lastName,
					email: st.teacher.user.email,
					dni: st.teacher.dni
				});
			}
		});
	});

	const teachers = Array.from(teacherMap.values());

	const normalizedCareer = {
		id: career.id,
		code: career.code,
		name: career.name,
		active: career.active,
		students: career.students.length,
		plans: career.studyPlans.map((plan) => ({
			id: plan.id,
			name: plan.name,
			version: plan.version,
			active: plan.active,
			subjects: plan.subjects.length
		}))
	};

	return {
		career: normalizedCareer,
		teachers,
		metrics: {
			totalStudents: normalizedCareer.students,
			totalPlans: normalizedCareer.plans.length,
			totalSubjects: normalizedCareer.plans.reduce((acc, plan) => acc + plan.subjects, 0),
			totalTeachers: teachers.length
		}
	};
};

export const actions: Actions = {
	deletePlan: async ({ request, params }) => {
		const formData = await request.formData();
		const planId = formData.get('planId') as string;

		if (!planId) {
			return fail(400, { error: 'ID de plan no proporcionado' });
		}

		try {
			// Verificar que el plan pertenezca a esta carrera
			const plan = await prisma.studyPlan.findFirst({
				where: {
					id: planId,
					careerId: params.id
				},
				include: {
					subjects: true
				}
			});

			if (!plan) {
				return fail(404, { error: 'Plan de estudio no encontrado' });
			}

			// Verificar si tiene materias asociadas
			if (plan.subjects.length > 0) {
				return fail(400, {
					error:
						'No se puede eliminar: el plan tiene materias asociadas. Elimine las materias primero.'
				});
			}

			// Eliminar el plan
			await prisma.studyPlan.delete({
				where: { id: planId }
			});

			return { success: true };
		} catch (error) {
			console.error('Error al eliminar plan:', error);
			return fail(500, { error: 'Error al eliminar el plan de estudio' });
		}
	}
};
