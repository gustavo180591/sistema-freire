import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { error, fail } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const student = await prisma.student.findUnique({
		where: { id: params.id },
		include: {
			career: true,
			location: true,
			subjectStatuses: {
				include: {
					subject: true
				}
			},
			studentCharges: true
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	// Cargar inscripciones a materias (SubjectEnrollment)
	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			studentId: student.id,
			status: 'ACTIVE'
		},
		include: {
			subject: true,
			commission: {
				include: {
					academicTerm: true,
					location: true
				}
			},
			academicTerm: true
		}
	});

	// Cargar asistencias del alumno
	const attendanceEntries = await prisma.attendanceEntry.findMany({
		where: {
			studentId: student.id
		},
		include: {
			attendance: true
		}
	});

	// Agrupar asistencias por comisión (más preciso que por materia sola)
	const attendanceByCommission = new Map<string, { present: number; total: number }>();
	for (const entry of attendanceEntries) {
		const key = entry.attendance.id; // Usar attendanceId como clave única por registro
		// Para agrupar por comisión, necesitamos saber a qué comisión pertenece el registro
		// Como AttendanceRecord está vinculado a Subject, y SubjectCommission está vinculado a Subject,
		// agrupamos por subjectId + attendanceId para evitar mezclar comisiones diferentes
		const subjectId = entry.attendance.subjectId;
		const commissionKey =
			enrollments.find((e) => e.subjectId === subjectId)?.commissionId || subjectId;

		if (!attendanceByCommission.has(commissionKey)) {
			attendanceByCommission.set(commissionKey, { present: 0, total: 0 });
		}
		const stats = attendanceByCommission.get(commissionKey)!;
		stats.total++;
		if (entry.present) {
			stats.present++;
		}
	}

	// Construir lista de materias asignadas (solo inscripciones activas)
	const assignedSubjects = enrollments.map((enrollment) => {
		// Usar commissionId como clave para buscar asistencia específica de esa comisión
		const attendanceKey = enrollment.commissionId || enrollment.subjectId;
		const attendanceStats = attendanceByCommission.get(attendanceKey) || { present: 0, total: 0 };
		const attendancePercent =
			attendanceStats.total > 0
				? Math.round((attendanceStats.present / attendanceStats.total) * 100)
				: 0;

		// Buscar status académico si existe
		const subjectStatus = student.subjectStatuses.find((s) => s.subjectId === enrollment.subjectId);

		return {
			id: enrollment.id,
			subject: enrollment.subject.name,
			subjectId: enrollment.subject.id,
			yearLevel: enrollment.subject.yearLevel,
			commission: enrollment.commission?.code || null,
			commissionId: enrollment.commission?.id || null,
			academicTerm: enrollment.commission?.academicTerm || enrollment.academicTerm,
			attendancePercent,
			attendancePresent: attendanceStats.present,
			attendanceTotal: attendanceStats.total,
			regularityStatus: subjectStatus?.regularityStatus || 'LIBRE',
			approved: subjectStatus?.approved || false,
			status: enrollment.status
		};
	});

	// Obtener materias disponibles para cursar según carrera y año actual del alumno
	// Primero buscar el StudyPlan activo/default de la carrera
	const studyPlan = await prisma.studyPlan.findFirst({
		where: {
			careerId: student.careerId,
			active: true,
			isDefault: true
		}
	});

	// Si no hay plan default, buscar el plan activo más reciente
	const activeStudyPlan =
		studyPlan ||
		(await prisma.studyPlan.findFirst({
			where: {
				careerId: student.careerId,
				active: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		}));

	// Obtener materias del plan de estudio
	const planSubjects = activeStudyPlan
		? await prisma.planSubject.findMany({
				where: {
					planId: activeStudyPlan.id
				},
				include: {
					subject: {
						include: {
							correlatives: {
								where: {
									isActive: true,
									OR: [{ careerId: student.careerId }, { careerId: null }]
								},
								include: {
									requiredSubject: true
								}
							}
						}
					}
				},
				orderBy: {
					sortOrder: 'asc'
				}
			})
		: [];

	// Obtener IDs de materias aprobadas y regulares del alumno
	const approvedSubjectIds = student.subjectStatuses
		.filter((s) => s.approved)
		.map((s) => s.subjectId);
	const regularSubjectIds = student.subjectStatuses
		.filter((s) => s.regularityStatus === 'REGULAR')
		.map((s) => s.subjectId);
	const enrolledSubjectIds = enrollments.map((e) => e.subjectId);

	// Calcular estado de cada materia disponible
	const availableSubjects = planSubjects
		.filter((planSubject) => {
			// Filtrar por año actual del alumno
			if (planSubject.subject.yearLevel !== student.currentYear) {
				return false;
			}
			// Filtrar solo materias activas
			if (!planSubject.subject.active) {
				return false;
			}
			return true;
		})
		.map((planSubject) => {
			const subject = planSubject.subject;
			const isEnrolled = enrolledSubjectIds.includes(subject.id);
			const isApproved = approvedSubjectIds.includes(subject.id);
			const isRegular = regularSubjectIds.includes(subject.id);

			// Para alumnos de 1º año, no verificar correlatividades
			// Las materias de 1º año deben estar disponibles por defecto
			const isFirstYear = student.currentYear === 1;

			// Verificar correlatividades (solo para 2º año en adelante)
			let blockedByCorrelatives: string[] = [];
			let allCorrelativesMet = true;

			if (!isFirstYear && subject.correlatives.length > 0) {
				for (const correlative of subject.correlatives) {
					const requiredSubjectId = correlative.requiredSubjectId;
					const isRequiredApproved = approvedSubjectIds.includes(requiredSubjectId);
					const isRequiredRegular = regularSubjectIds.includes(requiredSubjectId);

					// Para la mayoría de las correlatividades, se requiere estar regular o aprobado
					const isCorrelativeMet = isRequiredApproved || isRequiredRegular;

					if (!isCorrelativeMet) {
						allCorrelativesMet = false;
						blockedByCorrelatives.push(correlative.requiredSubject.name);
					}
				}
			}

			// Determinar estado
			let state: 'AVAILABLE' | 'TAKING' | 'APPROVED' | 'REGULAR' | 'BLOCKED';
			if (isApproved) {
				state = 'APPROVED';
			} else if (isEnrolled) {
				state = 'TAKING';
			} else if (isRegular) {
				state = 'REGULAR';
			} else if (!isFirstYear && !allCorrelativesMet) {
				state = 'BLOCKED';
			} else {
				state = 'AVAILABLE';
			}

			return {
				id: subject.id,
				code: subject.code,
				name: subject.name,
				yearLevel: subject.yearLevel,
				subjectType: subject.subjectType,
				trainingField: subject.trainingField,
				isMandatory: true, // PlanSubject no tiene isMandatory, asumimos todas son obligatorias en el plan
				state,
				blockedByCorrelatives: blockedByCorrelatives.length > 0 ? blockedByCorrelatives : null
			};
		});

	// Calcular progreso real del alumno
	const allCareerSubjects = await prisma.subject.findMany({
		where: {
			active: true,
			careerSubjects: {
				some: {
					careerId: student.careerId
				}
			}
		},
		select: { id: true }
	});

	const totalCareerSubjects = allCareerSubjects.length;
	const approvedCount = student.subjectStatuses.filter((s) => s.approved).length;
	const progress =
		totalCareerSubjects > 0 ? Math.round((approvedCount / totalCareerSubjects) * 100) : 0;

	// Calcular deuda financiera real (usar finalAmount según tipo de alumno)
	const totalCharges = student.studentCharges.reduce(
		(sum, charge) => sum + Number(charge.finalAmount),
		0
	);
	const totalPayments = await prisma.payment.aggregate({
		where: {
			studentId: student.id
		},
		_sum: {
			amount: true
		}
	});
	const totalDebt = totalCharges - Number(totalPayments._sum.amount || 0);

	// Calcular métricas adicionales
	const currentSubjects = assignedSubjects.filter((s) => s.status === 'ACTIVE').length;
	const regularSubjects = assignedSubjects.filter((s) => s.regularityStatus === 'REGULAR').length;
	const averageAttendance =
		assignedSubjects.length > 0
			? Math.round(
					assignedSubjects.reduce((sum, s) => sum + s.attendancePercent, 0) /
						assignedSubjects.length
				)
			: 0;
	const lowAttendanceSubjects = assignedSubjects.filter(
		(s) => s.attendancePercent < 75 && s.attendanceTotal > 0
	).length;

	return {
		student: {
			id: student.id,
			userId: student.userId,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			status: student.status,
			career: student.career.name,
			currentYear: student.currentYear,
			isRecursante: student.isRecursante,
			location: student.location?.name || null
		},
		academic: {
			totalSubjects: assignedSubjects.length,
			approvedSubjects: approvedCount,
			regularSubjects,
			currentSubjects,
			progress,
			averageAttendance,
			lowAttendanceSubjects,
			assignedSubjects,
			availableSubjects
		},
		financial: {
			totalDebt
		}
	};
};

export const actions: Actions = {
	resetPassword: async ({ params, locals, request }) => {
		await requireStudentAccess(locals.user, params.id);

		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const student = await prisma.student.findUnique({
			where: { id: params.id },
			include: { user: true }
		});

		if (!student) {
			return fail(404, { error: 'Alumno no encontrado' });
		}

		const defaultPassword = '12345678';
		const hashedPassword = await bcrypt.hash(defaultPassword, 10);

		try {
			await prisma.user.update({
				where: { id: student.userId },
				data: { passwordHash: hashedPassword }
			});

			await auditLog({
				userId: locals.user.id,
				action: AuditAction.UPDATE,
				entityType: 'USER',
				entityId: student.userId,
				description: `Contraseña restablecida para alumno: ${student.firstName} ${student.lastName} (${student.dni})`
			});

			return { success: true, message: 'Contraseña restablecida a 12345678' };
		} catch (error) {
			console.error('Error al restablecer contraseña:', error);
			return fail(500, { error: 'Error al restablecer la contraseña' });
		}
	}
};
