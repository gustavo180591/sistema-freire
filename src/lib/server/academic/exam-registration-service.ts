import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { getStudentFinancialExamEligibility } from './exam-eligibility-service';

function isWindowOpen(opensAt: Date | null, closesAt: Date | null, now = new Date()): boolean {
	if (!opensAt || !closesAt) return false;

	return now >= opensAt && now <= closesAt;
}

function getRegistrationWindow(evaluation: {
	createdAt: Date;
	registrationOpensAt: Date | null;
	registrationClosesAt: Date | null;
}) {
	const opensAt = evaluation.registrationOpensAt ?? evaluation.createdAt;
	const closesAt =
		evaluation.registrationClosesAt ?? new Date(opensAt.getTime() + 72 * 60 * 60 * 1000);

	return {
		opensAt,
		closesAt
	};
}

export async function getExamRegistrationEligibility({
	studentId,
	evaluationId
}: {
	studentId: string;
	evaluationId: string;
}) {
	const now = new Date();

	const [student, evaluation] = await Promise.all([
		prisma.student.findUnique({
			where: {
				id: studentId
			},
			select: {
				id: true,
				careerId: true,
				locationId: true,
				status: true
			}
		}),
		prisma.evaluation.findUnique({
			where: {
				id: evaluationId
			},
			include: {
				subject: true,
				career: true,
				location: true,
				examRegistrations: {
					where: {
						studentId
					},
					orderBy: {
						registeredAt: 'desc'
					}
				}
			}
		})
	]);

	if (!student) {
		return {
			evaluation: null,
			existingRegistration: null,
			canRegister: false,
			reason: 'Alumno no encontrado'
		};
	}

	if (student.status !== 'ACTIVE') {
		return {
			evaluation: null,
			existingRegistration: null,
			canRegister: false,
			reason: 'Tu condición de alumno no se encuentra activa'
		};
	}

	if (!evaluation) {
		return {
			evaluation: null,
			existingRegistration: null,
			canRegister: false,
			reason: 'Mesa de examen no encontrada'
		};
	}

	const existingRegistration = evaluation.examRegistrations[0] ?? null;

	if (evaluation.type !== 'MESA_EXAMEN') {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'La evaluación seleccionada no corresponde a una mesa de examen'
		};
	}

	if (!evaluation.careerId || !evaluation.locationId) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'La mesa de examen no tiene carrera o sede configurada'
		};
	}

	if (evaluation.careerId !== student.careerId) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'La mesa de examen no corresponde a la carrera del alumno'
		};
	}

	if (evaluation.locationId !== student.locationId) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'La mesa de examen no corresponde a la sede del alumno'
		};
	}

	if (evaluation.isClosed) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'La mesa de examen se encuentra cerrada'
		};
	}

	if (evaluation.evaluationDate <= now) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'La fecha de la mesa de examen ya pasó'
		};
	}

	const { opensAt: registrationOpensAt, closesAt: registrationClosesAt } =
		getRegistrationWindow(evaluation);

	if (!isWindowOpen(registrationOpensAt, registrationClosesAt, now)) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'El período de inscripción de 72 horas se encuentra cerrado'
		};
	}

	if (existingRegistration?.status === 'REGISTERED') {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'Ya estás inscripto a esta mesa de examen'
		};
	}

	const enrollment = await prisma.subjectEnrollment.findFirst({
		where: {
			studentId,
			subjectId: evaluation.subjectId,
			status: 'ACTIVE',
			...(evaluation.commissionId
				? {
						commissionId: evaluation.commissionId
					}
				: {})
		},
		select: {
			id: true
		}
	});

	if (!enrollment) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: 'No tenés una inscripción activa en la materia correspondiente'
		};
	}

	const financialEligibility = await getStudentFinancialExamEligibility(studentId);

	if (!financialEligibility.canTakeExam) {
		return {
			evaluation,
			existingRegistration,
			canRegister: false,
			reason: financialEligibility.message
		};
	}

	return {
		evaluation,
		existingRegistration,
		canRegister: true,
		reason: ''
	};
}

export async function getAvailableExamTablesForStudent(studentId: string) {
	const now = new Date();

	const student = await prisma.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			careerId: true,
			locationId: true,
			status: true
		}
	});

	if (!student?.locationId || student.status !== 'ACTIVE') {
		return [];
	}

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
			type: 'MESA_EXAMEN',
			isClosed: false,
			careerId: student.careerId,
			locationId: student.locationId,
			subjectId: {
				in: subjectIds
			},
			evaluationDate: {
				gt: now
			}
		},
		include: {
			subject: true,
			career: {
				select: {
					id: true,
					name: true
				}
			},
			location: {
				select: {
					id: true,
					name: true
				}
			},
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
		const { opensAt, closesAt } = getRegistrationWindow(evaluation);
		const registrationOpen = isWindowOpen(opensAt, closesAt, now);

		return {
			id: evaluation.id,
			title: evaluation.title,
			description: evaluation.description,
			type: evaluation.type,
			evaluationDate: evaluation.evaluationDate,
			registrationOpensAt: opensAt,
			registrationClosesAt: closesAt,
			registrationOpen,
			subject: {
				id: evaluation.subject.id,
				code: evaluation.subject.code,
				name: evaluation.subject.name,
				yearLevel: evaluation.subject.yearLevel
			},
			career: evaluation.career
				? {
						id: evaluation.career.id,
						name: evaluation.career.name
					}
				: null,
			location: evaluation.location
				? {
						id: evaluation.location.id,
						name: evaluation.location.name
					}
				: null,
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
	/*
	 * La UI no es una barrera de seguridad.
	 * La elegibilidad se verifica nuevamente en el servicio antes
	 * de iniciar cualquier escritura.
	 */
	const eligibility = await getExamRegistrationEligibility({
		studentId,
		evaluationId
	});

	if (!eligibility.canRegister) {
		throw new Error(eligibility.reason);
	}

	const now = new Date();

	const registration = await prisma.$transaction(async (tx) => {
		/*
		 * Revalidar dentro de la transacción las invariantes críticas
		 * para evitar depender solamente del chequeo previo.
		 */
		const [student, evaluation] = await Promise.all([
			tx.student.findUnique({
				where: {
					id: studentId
				},
				select: {
					careerId: true,
					locationId: true,
					status: true
				}
			}),
			tx.evaluation.findUnique({
				where: {
					id: evaluationId
				},
				include: {
					subject: true
				}
			})
		]);

		if (!student) {
			throw new Error('Alumno no encontrado');
		}

		if (student.status !== 'ACTIVE') {
			throw new Error('Tu condición de alumno no se encuentra activa');
		}

		if (!evaluation) {
			throw new Error('La mesa de examen no existe');
		}

		if (evaluation.type !== 'MESA_EXAMEN') {
			throw new Error('La evaluación seleccionada no corresponde a una mesa de examen');
		}

		if (!evaluation.careerId || !evaluation.locationId) {
			throw new Error('La mesa de examen no tiene carrera o sede configurada');
		}

		if (evaluation.careerId !== student.careerId) {
			throw new Error('La mesa de examen no corresponde a la carrera del alumno');
		}

		if (evaluation.locationId !== student.locationId) {
			throw new Error('La mesa de examen no corresponde a la sede del alumno');
		}

		if (evaluation.isClosed) {
			throw new Error('La mesa de examen está cerrada');
		}

		if (evaluation.evaluationDate <= now) {
			throw new Error('La mesa de examen ya no admite inscripciones');
		}

		const { opensAt, closesAt } = getRegistrationWindow(evaluation);

		if (!isWindowOpen(opensAt, closesAt, now)) {
			throw new Error('El período de inscripción a la mesa se encuentra cerrado');
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
				'No tenés una inscripción activa en la materia y comisión correspondientes a esta mesa'
			);
		}

		const existingRegistration = await tx.examRegistration.findUnique({
			where: {
				evaluationId_studentId: {
					evaluationId,
					studentId
				}
			},
			select: {
				status: true
			}
		});

		if (existingRegistration?.status === 'REGISTERED') {
			throw new Error('Ya estás inscripto a esta mesa de examen');
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
		description: `Alumno ${userName} se inscribió a la mesa de examen ${evaluationId}`
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

	const { opensAt, closesAt } = getRegistrationWindow(registration.evaluation);

	if (!isWindowOpen(opensAt, closesAt, now)) {
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
