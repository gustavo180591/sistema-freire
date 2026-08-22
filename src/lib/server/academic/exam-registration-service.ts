import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { getStudentFinancialExamEligibility } from './exam-eligibility-service';

function isWindowOpen(opensAt: Date | null, closesAt: Date | null, now = new Date()): boolean {
	if (!opensAt || !closesAt) return false;

	return now >= opensAt && now <= closesAt;
}

export async function getAvailableExamTablesForStudent(studentId: string) {
	const now = new Date();

	const enrollments = await prisma.subjectEnrollment.findMany({
		where: {
			studentId,
			status: 'ACTIVE'
		},
		select: {
			subjectId: true
		}
	});

	const subjectIds = [...new Set(enrollments.map((enrollment) => enrollment.subjectId))];

	if (subjectIds.length === 0) {
		return [];
	}

	const evaluations = await prisma.evaluation.findMany({
		where: {
			isClosed: false,
			registrationOpensAt: {
				not: null
			},
			registrationClosesAt: {
				not: null
			},
			subjectId: {
				in: subjectIds
			},
			evaluationDate: {
				gt: now
			}
		},
		include: {
			subject: true,
			createdByUser: {
				select: {
					firstName: true,
					lastName: true
				}
			},
			examRegistrations: {
				where: {
					studentId
				},
				select: {
					id: true,
					status: true,
					registeredAt: true,
					cancelledAt: true
				}
			}
		},
		orderBy: {
			evaluationDate: 'asc'
		}
	});

	return evaluations.map((evaluation) => {
		const registration = evaluation.examRegistrations[0] ?? null;
		const registrationOpen = isWindowOpen(
			evaluation.registrationOpensAt,
			evaluation.registrationClosesAt,
			now
		);

		return {
			id: evaluation.id,
			title: evaluation.title,
			description: evaluation.description,
			type: evaluation.type,
			evaluationDate: evaluation.evaluationDate,
			registrationOpensAt: evaluation.registrationOpensAt,
			registrationClosesAt: evaluation.registrationClosesAt,
			registrationOpen,
			subject: {
				id: evaluation.subject.id,
				code: evaluation.subject.code,
				name: evaluation.subject.name,
				yearLevel: evaluation.subject.yearLevel
			},
			teacher: `${evaluation.createdByUser.firstName} ${evaluation.createdByUser.lastName}`,
			registration
		};
	});
}

export async function registerStudentForExam(
	evaluationId: string,
	studentId: string,
	userId: string,
	userName: string
) {
	const financialEligibility = await getStudentFinancialExamEligibility(
		studentId,
		userId,
		userName
	);

	if (!financialEligibility.canTakeExam) {
		throw new Error(financialEligibility.message);
	}

	const now = new Date();

	const registration = await prisma.$transaction(async (tx) => {
		const evaluation = await tx.evaluation.findUnique({
			where: {
				id: evaluationId
			},
			include: {
				subject: true
			}
		});

		if (!evaluation) {
			throw new Error('La evaluación no existe');
		}

		if (evaluation.isClosed) {
			throw new Error('La evaluación está cerrada');
		}

		if (!isWindowOpen(evaluation.registrationOpensAt, evaluation.registrationClosesAt, now)) {
			throw new Error('El período de inscripción de 72 horas está cerrado');
		}

		if (evaluation.evaluationDate <= now) {
			throw new Error('La evaluación ya no admite inscripciones');
		}

		const enrollment = await tx.subjectEnrollment.findFirst({
			where: {
				studentId,
				subjectId: evaluation.subjectId,
				status: 'ACTIVE',
				...(evaluation.commissionId ? { commissionId: evaluation.commissionId } : {})
			},
			select: {
				id: true
			}
		});

		if (!enrollment) {
			throw new Error(
				'No tenés una inscripción activa en la materia y comisión correspondientes a esta evaluación'
			);
		}

		return tx.examRegistration.upsert({
			where: {
				evaluationId_studentId: {
					evaluationId,
					studentId
				}
			},
			create: {
				evaluationId,
				studentId,
				status: 'REGISTERED',
				registeredAt: now
			},
			update: {
				status: 'REGISTERED',
				registeredAt: now,
				cancelledAt: null
			}
		});
	});

	await auditLog({
		userId,
		action: 'CREATE',
		entityType: 'ExamRegistration',
		entityId: registration.id,
		description: `Alumno ${userName} se inscribió a la evaluación ${evaluationId}`
	});

	return registration;
}

export async function cancelExamRegistration(
	registrationId: string,
	studentId: string,
	userId: string,
	userName: string
) {
	const now = new Date();

	const registration = await prisma.examRegistration.findUnique({
		where: {
			id: registrationId
		},
		include: {
			evaluation: {
				include: {
					subject: true
				}
			}
		}
	});

	if (!registration) {
		throw new Error('Inscripción a examen no encontrada');
	}

	if (registration.studentId !== studentId) {
		throw new Error('No tenés permiso para cancelar esta inscripción');
	}

	if (registration.status !== 'REGISTERED') {
		throw new Error('La inscripción ya no está activa');
	}

	if (
		!isWindowOpen(
			registration.evaluation.registrationOpensAt,
			registration.evaluation.registrationClosesAt,
			now
		)
	) {
		throw new Error('La inscripción ya cerró y no puede cancelarse desde el portal');
	}

	const updated = await prisma.examRegistration.update({
		where: {
			id: registrationId
		},
		data: {
			status: 'CANCELLED',
			cancelledAt: now
		}
	});

	await auditLog({
		userId,
		action: 'UPDATE',
		entityType: 'ExamRegistration',
		entityId: registrationId,
		description: `Alumno ${userName} canceló su inscripción a ${registration.evaluation.subject.name}`
	});

	return updated;
}
