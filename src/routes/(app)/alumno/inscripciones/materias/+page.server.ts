import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, fail } from '@sveltejs/kit';
import { canStudentEnroll, getAvailableSubjects } from '$lib/server/academic/plan-logic';
import { auditLog } from '$lib/server/audit';
import { EnrollmentStatus } from '@prisma/client';
import { assertStudentNotFinanciallyBlocked } from '$lib/server/financial/student-blocking-service';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Verificar que sea alumno
	const isStudent = user.roles.includes('ALUMNO');
	if (!isStudent) {
		throw redirect(303, '/dashboard');
	}

	// Buscar el estudiante asociado al usuario
	const student = await prisma.student.findFirst({
		where: { userId: user.id },
		include: {
			career: {
				include: {
					studyPlans: {
						where: { active: true },
						orderBy: { createdAt: 'desc' },
						take: 1
					}
				}
			}
		}
	});

	if (!student) {
		throw redirect(303, '/dashboard');
	}

	// Obtener período lectivo activo
	const activeTerm = await prisma.academicTerm.findFirst({
		where: { active: true },
		orderBy: { startDate: 'desc' }
	});

	// Obtener materias disponibles usando plan-logic
	const availableSubjects = await getAvailableSubjects(student.id, student.careerId);

	// Obtener inscripciones del alumno en el período actual
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			studentId: student.id,
			...(activeTerm ? { academicTermId: activeTerm.id } : {})
		}
	});

	// Obtener comisiones disponibles para las materias
	const commissionMap = new Map<string, any[]>();
	for (const subject of availableSubjects) {
		const commissions = await prisma.subjectCommission.findMany({
			where: {
				subjectId: subject.subject.id,
				active: true,
				OR: [{ careerId: null }, { careerId: student.careerId }],
				...(activeTerm ? { academicTermId: activeTerm.id } : {})
			},
			include: {
				teacher: true,
				location: true
			}
		});
		commissionMap.set(subject.subject.id, commissions);
	}

	// Obtener materias ya inscriptas en el período actual
	const enrolledSubjectIds = enrollments
		.filter((e: any) => !activeTerm || e.academicTermId === activeTerm.id)
		.map((e: any) => e.subjectId);

	// Obtener estados académicos del alumno
	const subjectStatuses = await prisma.studentSubjectStatus.findMany({
		where: { studentId: student.id },
		include: { subject: true }
	});

	const approvedSubjectIds = subjectStatuses.filter((s) => s.approved).map((s) => s.subjectId);

	// Preparar datos de materias con estado de disponibilidad
	const subjectsWithStatus = availableSubjects.map((item) => {
		const subjectId = item.subject.id;
		const isEnrolled = enrolledSubjectIds.includes(subjectId);
		const isApproved = approvedSubjectIds.includes(subjectId);
		const commissions = commissionMap.get(subjectId) || [];

		return {
			...item,
			isEnrolled,
			isApproved,
			commissions,
			hasCommissions: commissions.length > 0
		};
	});

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			career: student.career.name,
			careerId: student.careerId,
			currentYear: student.currentYear
		},
		activeTerm,
		subjects: subjectsWithStatus,
		enrolledCount: enrolledSubjectIds.length
	};
};

export const actions: Actions = {
	// Inscribir a materias
	enroll: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const isStudent = user.roles.includes('ALUMNO');
		if (!isStudent) {
			return fail(403, { error: 'Solo alumnos pueden inscribirse' });
		}

		const formData = await request.formData();
		const subjectIds = formData.getAll('subjectIds') as string[];
		const commissionIds = formData.getAll('commissionIds') as string[];

		if (subjectIds.length === 0) {
			return fail(400, { error: 'Seleccioná al menos una materia' });
		}

		// Buscar el estudiante
		const student = await prisma.student.findFirst({
			where: { userId: user.id },
			include: { career: true }
		});

		if (!student) {
			return fail(404, { error: 'Alumno no encontrado' });
		}

		// Verificar si el alumno está bloqueado financieramente
		try {
			await assertStudentNotFinanciallyBlocked(student.id);
		} catch (error) {
			return fail(403, {
				error: error instanceof Error ? error.message : 'Alumno bloqueado por deuda'
			});
		}

		// Obtener período lectivo activo
		const activeTerm = await prisma.academicTerm.findFirst({
			where: { active: true }
		});

		if (!activeTerm) {
			return fail(400, { error: 'No hay período lectivo activo' });
		}

		// Obtener plan de estudio del alumno
		const studyPlan = await prisma.studyPlan.findFirst({
			where: {
				careerId: student.careerId,
				active: true
			}
		});

		// Procesar inscripciones
		const results = [];
		const errors = [];

		for (let i = 0; i < subjectIds.length; i++) {
			const subjectId = subjectIds[i];
			const commissionId = commissionIds[i] || null;

			try {
				// Validar correlativas
				const enrollmentCheck = await canStudentEnroll(student.id, subjectId, student.careerId);
				if (!enrollmentCheck.canEnroll) {
					errors.push({
						subjectId,
						reason: 'No cumple correlativas',
						details: enrollmentCheck.pending
					});
					continue;
				}

				// Verificar si ya está inscripto
				const existingEnrollment = await prisma.subjectEnrollment.findFirst({
					where: {
						studentId: student.id,
						subjectId,
						academicTermId: activeTerm.id
					}
				});

				if (existingEnrollment) {
					errors.push({
						subjectId,
						reason: 'Ya estás inscripto a esta materia'
					});
					continue;
				}

				// Verificar si ya está aprobada
				const existingStatus = await prisma.studentSubjectStatus.findFirst({
					where: {
						studentId: student.id,
						subjectId,
						approved: true
					}
				});

				if (existingStatus) {
					errors.push({
						subjectId,
						reason: 'La materia ya está aprobada'
					});
					continue;
				}

				// Verificar cupo si hay comisión
				if (commissionId) {
					const commission = await prisma.subjectCommission.findUnique({
						where: { id: commissionId }
					});

					if (commission && commission.currentEnrolled >= commission.maxCapacity) {
						errors.push({
							subjectId,
							reason: 'No hay cupo disponible en la comisión'
						});
						continue;
					}
				}

				// Crear inscripción
				const enrollment = await prisma.subjectEnrollment.create({
					data: {
						studentId: student.id,
						subjectId,
						commissionId,
						careerId: student.careerId,
						studyPlanId: studyPlan?.id,
						academicTermId: activeTerm.id,
						status: EnrollmentStatus.ACTIVE,
						confirmedAt: new Date(),
						enrolledBy: user.id
					}
				});

				// Actualizar cupo de comisión si corresponde
				if (commissionId) {
					await prisma.subjectCommission.update({
						where: { id: commissionId },
						data: {
							currentEnrolled: {
								increment: 1
							}
						}
					});
				}

				// Crear o actualizar StudentSubjectStatus
				const existingSubjectStatus = await prisma.studentSubjectStatus.findUnique({
					where: {
						studentId_subjectId: {
							studentId: student.id,
							subjectId
						}
					}
				});

				if (!existingSubjectStatus) {
					await prisma.studentSubjectStatus.create({
						data: {
							studentId: student.id,
							subjectId,
							regularityStatus: 'LIBRE',
							approved: false,
							promoted: false,
							attendancePercent: 0
						}
					});
				}

				// Auditoría
				await auditLog({
					userId: user.id,
					action: 'CREATE',
					entityType: 'SubjectEnrollment',
					entityId: enrollment.id,
					description: `Alumno ${student.lastName} ${student.firstName} se inscribió a materia ${subjectId}`
				});

				results.push({
					subjectId,
					enrollmentId: enrollment.id,
					status: 'success'
				});
			} catch (error) {
				console.error('Error en inscripción:', error);
				errors.push({
					subjectId,
					reason: 'Error al procesar inscripción'
				});
			}
		}

		return {
			success: results.length > 0,
			enrolled: results.length,
			errors: errors.length,
			results,
			errorDetails: errors
		};
	}
};
