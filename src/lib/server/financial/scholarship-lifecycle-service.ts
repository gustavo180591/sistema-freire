import type { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { prisma } from '$lib/server/db/prisma';
import { getBenefitsConfig } from './benefit-calculator';

const ScholarshipStatus = {
	ACTIVE: 'ACTIVE',
	SUSPENDED_DEBT: 'SUSPENDED_DEBT',
	NEGOTIATION: 'NEGOTIATION',
	CANCELLED: 'CANCELLED',
	EXPIRED: 'EXPIRED'
} as const;

const ScholarshipNegotiationStatus = {
	OPEN: 'OPEN',
	APPROVED: 'APPROVED',
	REJECTED: 'REJECTED',
	CANCELLED: 'CANCELLED'
} as const;

type Tx = Prisma.TransactionClient;

export interface ScholarshipActor {
	userId: string;
	userName: string;
}

async function getConfiguredScholarshipPercentage(tx: Tx): Promise<Decimal> {
	const config = await getBenefitsConfig(tx);

	if (config.normalFeeAmount <= 0) {
		return new Decimal(0);
	}

	const percentage =
		((config.normalFeeAmount - config.becadoFeeAmount) / config.normalFeeAmount) * 100;

	return new Decimal(Math.max(0, Math.min(100, percentage)).toFixed(2));
}

async function calculatePendingDebt(tx: Tx, studentId: string): Promise<Decimal> {
	const charges = await tx.studentCharge.findMany({
		where: {
			studentId,
			status: {
				in: ['PENDING', 'PARTIAL']
			}
		},
		select: {
			finalAmount: true,
			paidAmount: true
		}
	});

	return charges.reduce((total, charge) => {
		const pending = charge.finalAmount.sub(charge.paidAmount);

		if (pending.lte(0)) {
			return total;
		}

		return total.add(pending);
	}, new Decimal(0));
}

/**
 * Obtiene la beca vigente para el ciclo de vida.
 *
 * No reutiliza becas CANCELLED/EXPIRED como si estuvieran vigentes.
 * Si el alumno está marcado como becado pero todavía no tiene un
 * Scholarship formal, se crea uno para normalizar los datos históricos.
 */
async function ensureCurrentScholarship(tx: Tx, studentId: string, actor: ScholarshipActor) {
	const current = await tx.scholarship.findFirst({
		where: {
			studentId,
			status: {
				in: [
					ScholarshipStatus.ACTIVE,
					ScholarshipStatus.SUSPENDED_DEBT,
					ScholarshipStatus.NEGOTIATION
				]
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	if (current) {
		return current;
	}

	const student = await tx.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			id: true,
			isBecado: true
		}
	});

	if (!student) {
		throw new Error('Alumno no encontrado');
	}

	if (!student.isBecado) {
		throw new Error('El alumno no posee una beca activa que pueda normalizarse');
	}

	const percentage = await getConfiguredScholarshipPercentage(tx);

	const scholarship = await tx.scholarship.create({
		data: {
			studentId,
			name: 'Beca institucional',
			percentage,
			active: true,
			status: ScholarshipStatus.ACTIVE,
			startDate: new Date(),
			userId: actor.userId,
			applicableTo: ['CUOTA_MENSUAL'],
			autoApply: true
		}
	});

	await tx.scholarshipHistory.create({
		data: {
			scholarshipId: scholarship.id,
			studentId,
			previousStatus: null,
			newStatus: ScholarshipStatus.ACTIVE,
			previousPercentage: null,
			newPercentage: percentage,
			reason: 'Normalización de beca existente',
			notes:
				'Se creó el registro formal Scholarship a partir del estado becado existente del alumno.',
			changedByUserId: actor.userId,
			changedByName: actor.userName
		}
	});

	return scholarship;
}

export async function getScholarshipLifecycle(studentId: string) {
	const student = await prisma.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			id: true,
			isBecado: true,
			scholarships: {
				orderBy: {
					createdAt: 'desc'
				},
				take: 1,
				include: {
					history: {
						orderBy: {
							createdAt: 'desc'
						},
						take: 30
					},
					negotiations: {
						orderBy: {
							requestedAt: 'desc'
						},
						take: 20
					}
				}
			}
		}
	});

	if (!student) {
		throw new Error('Alumno no encontrado');
	}

	const scholarship = student.scholarships[0] ?? null;

	return {
		isBecado: student.isBecado,
		status: scholarship?.status ?? (student.isBecado ? ScholarshipStatus.ACTIVE : null),
		scholarship
	};
}

/**
 * Suspende la beca por mora.
 *
 * Regla central:
 * - Student.isBecado pasa a false para que las NUEVAS cuotas
 *   no reciban el beneficio.
 * - Scholarship pasa a SUSPENDED_DEBT.
 * - NO se modifica ningún StudentCharge ya emitido.
 */
export async function suspendScholarshipForDebt(
	studentId: string,
	triggerChargeId: string,
	actor: ScholarshipActor
) {
	return prisma.$transaction(async (tx) => {
		const student = await tx.student.findUnique({
			where: {
				id: studentId
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				isBecado: true
			}
		});

		if (!student) {
			throw new Error('Alumno no encontrado');
		}

		if (!student.isBecado) {
			return {
				suspended: false,
				reason: 'STUDENT_NOT_SCHOLARSHIP_ACTIVE'
			};
		}

		const scholarship = await ensureCurrentScholarship(tx, studentId, actor);

		if (
			scholarship.status === ScholarshipStatus.SUSPENDED_DEBT ||
			scholarship.status === ScholarshipStatus.NEGOTIATION
		) {
			return {
				suspended: false,
				reason: 'ALREADY_SUSPENDED'
			};
		}

		const triggerCharge = await tx.studentCharge.findUnique({
			where: {
				id: triggerChargeId
			},
			include: {
				concept: {
					select: {
						name: true,
						code: true
					}
				}
			}
		});

		if (!triggerCharge) {
			throw new Error('No se encontró la cuota que originó la suspensión');
		}

		const previousStatus = scholarship.status;

		await tx.student.update({
			where: {
				id: studentId
			},
			data: {
				isBecado: false
			}
		});

		await tx.scholarship.update({
			where: {
				id: scholarship.id
			},
			data: {
				active: false,
				status: ScholarshipStatus.SUSPENDED_DEBT,
				suspendedAt: new Date(),
				suspensionReason: `Mora en cuota ${triggerCharge.periodLabel}`
			}
		});

		await tx.scholarshipHistory.create({
			data: {
				scholarshipId: scholarship.id,
				studentId,
				previousStatus,
				newStatus: ScholarshipStatus.SUSPENDED_DEBT,
				previousPercentage: scholarship.percentage,
				newPercentage: scholarship.percentage,
				reason: `Suspensión automática por mora en cuota ${triggerCharge.periodLabel}`,
				notes:
					'La cuota que produjo la mora y las demás cuotas ya emitidas conservaron sus importes originales.',
				changedByUserId: actor.userId,
				changedByName: actor.userName
			}
		});

		await tx.studentFollowUp.create({
			data: {
				studentId,
				type: 'WARNING',
				title: 'Beca suspendida por mora',
				description:
					`La beca fue suspendida por mora en la cuota ${triggerCharge.periodLabel}. ` +
					'Las cuotas previamente emitidas conservaron el beneficio original. ' +
					'El alumno puede solicitar una negociación para recuperar la beca.',
				date: new Date(),
				createdBy: actor.userId,
				isAlert: true,
				isResolved: true,
				resolvedAt: new Date(),
				resolvedBy: actor.userId
			}
		});

		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: 'UPDATE',
				entityType: 'Scholarship',
				entityId: scholarship.id,
				description: `Beca suspendida por mora para ${student.lastName}, ${student.firstName}.`,
				metadata: {
					studentId,
					triggerChargeId,
					periodLabel: triggerCharge.periodLabel,
					conceptCode: triggerCharge.concept.code,
					previousStatus,
					newStatus: ScholarshipStatus.SUSPENDED_DEBT,
					existingChargesModified: false
				}
			}
		});

		return {
			suspended: true,
			scholarshipId: scholarship.id
		};
	});
}

export async function startScholarshipNegotiation(
	studentId: string,
	input: {
		reason: string;
		conditions?: string | null;
		requestedPercentage?: number | null;
	},
	actor: ScholarshipActor
) {
	if (!input.reason.trim()) {
		throw new Error('El motivo de la negociación es obligatorio');
	}

	return prisma.$transaction(async (tx) => {
		const scholarship = await tx.scholarship.findFirst({
			where: {
				studentId,
				status: ScholarshipStatus.SUSPENDED_DEBT
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		if (!scholarship) {
			throw new Error('El alumno no tiene una beca suspendida por mora');
		}

		const existing = await tx.scholarshipNegotiation.findFirst({
			where: {
				scholarshipId: scholarship.id,
				status: ScholarshipNegotiationStatus.OPEN
			}
		});

		if (existing) {
			throw new Error('Ya existe una negociación abierta para esta beca');
		}

		let requestedPercentage = scholarship.percentage;

		if (input.requestedPercentage !== null && input.requestedPercentage !== undefined) {
			requestedPercentage = new Decimal(input.requestedPercentage);
		}

		if (requestedPercentage.lt(0) || requestedPercentage.gt(100)) {
			throw new Error('El porcentaje solicitado debe estar entre 0 y 100');
		}

		const debtAtRequest = await calculatePendingDebt(tx, studentId);

		const negotiation = await tx.scholarshipNegotiation.create({
			data: {
				scholarshipId: scholarship.id,
				studentId,
				status: ScholarshipNegotiationStatus.OPEN,
				previousPercentage: scholarship.percentage,
				requestedPercentage,
				debtAtRequest,
				reason: input.reason.trim(),
				conditions: input.conditions?.trim() || null,
				requestedByUserId: actor.userId
			}
		});

		await tx.scholarship.update({
			where: {
				id: scholarship.id
			},
			data: {
				status: ScholarshipStatus.NEGOTIATION,
				active: false
			}
		});

		await tx.scholarshipHistory.create({
			data: {
				scholarshipId: scholarship.id,
				studentId,
				previousStatus: ScholarshipStatus.SUSPENDED_DEBT,
				newStatus: ScholarshipStatus.NEGOTIATION,
				previousPercentage: scholarship.percentage,
				newPercentage: scholarship.percentage,
				reason: 'Negociación de recuperación iniciada',
				notes: input.reason.trim(),
				changedByUserId: actor.userId,
				changedByName: actor.userName
			}
		});

		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: 'CREATE',
				entityType: 'ScholarshipNegotiation',
				entityId: negotiation.id,
				description: 'Inició negociación para recuperación de beca.',
				metadata: {
					studentId,
					scholarshipId: scholarship.id,
					debtAtRequest: debtAtRequest.toString(),
					requestedPercentage: requestedPercentage.toString()
				}
			}
		});

		return negotiation;
	});
}

export async function resolveScholarshipNegotiation(
	negotiationId: string,
	input: {
		approved: boolean;
		approvedPercentage?: number | null;
		resolutionNotes?: string | null;
	},
	actor: ScholarshipActor
) {
	return prisma.$transaction(async (tx) => {
		const negotiation = await tx.scholarshipNegotiation.findUnique({
			where: {
				id: negotiationId
			},
			include: {
				scholarship: true
			}
		});

		if (!negotiation) {
			throw new Error('Negociación no encontrada');
		}

		if (negotiation.status !== ScholarshipNegotiationStatus.OPEN) {
			throw new Error('La negociación ya fue resuelta');
		}

		const scholarship = negotiation.scholarship;

		if (!input.approved) {
			await tx.scholarshipNegotiation.update({
				where: {
					id: negotiationId
				},
				data: {
					status: ScholarshipNegotiationStatus.REJECTED,
					resolvedAt: new Date(),
					resolvedByUserId: actor.userId,
					resolutionNotes: input.resolutionNotes?.trim() || null
				}
			});

			await tx.scholarship.update({
				where: {
					id: scholarship.id
				},
				data: {
					status: ScholarshipStatus.SUSPENDED_DEBT,
					active: false
				}
			});

			await tx.scholarshipHistory.create({
				data: {
					scholarshipId: scholarship.id,
					studentId: negotiation.studentId,
					previousStatus: ScholarshipStatus.NEGOTIATION,
					newStatus: ScholarshipStatus.SUSPENDED_DEBT,
					previousPercentage: scholarship.percentage,
					newPercentage: scholarship.percentage,
					reason: 'Negociación de recuperación rechazada',
					notes: input.resolutionNotes?.trim() || null,
					changedByUserId: actor.userId,
					changedByName: actor.userName
				}
			});

			await tx.auditLog.create({
				data: {
					userId: actor.userId,
					action: 'UPDATE',
					entityType: 'ScholarshipNegotiation',
					entityId: negotiationId,
					description: 'Negociación de beca rechazada.',
					metadata: {
						studentId: negotiation.studentId,
						scholarshipId: scholarship.id
					}
				}
			});

			return {
				approved: false
			};
		}

		let percentage = scholarship.percentage;

		if (input.approvedPercentage !== null && input.approvedPercentage !== undefined) {
			percentage = new Decimal(input.approvedPercentage);
		}

		if (percentage.lt(0) || percentage.gt(100)) {
			throw new Error('El porcentaje aprobado debe estar entre 0 y 100');
		}

		await tx.scholarshipNegotiation.update({
			where: {
				id: negotiationId
			},
			data: {
				status: ScholarshipNegotiationStatus.APPROVED,
				approvedPercentage: percentage,
				resolvedAt: new Date(),
				resolvedByUserId: actor.userId,
				resolutionNotes: input.resolutionNotes?.trim() || null
			}
		});

		await tx.scholarship.update({
			where: {
				id: scholarship.id
			},
			data: {
				status: ScholarshipStatus.ACTIVE,
				active: true,
				percentage,
				suspendedAt: null,
				suspensionReason: null,
				reinstatedAt: new Date()
			}
		});

		await tx.student.update({
			where: {
				id: negotiation.studentId
			},
			data: {
				isBecado: true,
				isRecursante: false
			}
		});

		await tx.scholarshipHistory.create({
			data: {
				scholarshipId: scholarship.id,
				studentId: negotiation.studentId,
				previousStatus: ScholarshipStatus.NEGOTIATION,
				newStatus: ScholarshipStatus.ACTIVE,
				previousPercentage: scholarship.percentage,
				newPercentage: percentage,
				reason: 'Beca recuperada mediante negociación',
				notes: input.resolutionNotes?.trim() || null,
				changedByUserId: actor.userId,
				changedByName: actor.userName
			}
		});

		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: 'UPDATE',
				entityType: 'Scholarship',
				entityId: scholarship.id,
				description: 'Beca reactivada mediante negociación.',
				metadata: {
					studentId: negotiation.studentId,
					negotiationId,
					previousPercentage: scholarship.percentage.toString(),
					approvedPercentage: percentage.toString(),
					existingChargesModified: false
				}
			}
		});

		return {
			approved: true,
			percentage: percentage.toString()
		};
	});
}

/**
 * Reactiva manualmente una beca que había sido suspendida por mora.
 *
 * La reactivación:
 * - requiere un motivo;
 * - registra quién la realizó;
 * - vuelve a marcar al alumno como becado;
 * - NO recalcula ni modifica cargos ya emitidos.
 */
export async function reinstateScholarshipManually(
	studentId: string,
	reason: string,
	actor: ScholarshipActor
) {
	const cleanReason = reason.trim();

	if (!cleanReason) {
		throw new Error('El motivo de reactivación de la beca es obligatorio');
	}

	return prisma.$transaction(async (tx) => {
		const scholarship = await tx.scholarship.findFirst({
			where: {
				studentId,
				status: {
					in: [ScholarshipStatus.SUSPENDED_DEBT, ScholarshipStatus.NEGOTIATION]
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		if (!scholarship) {
			throw new Error('El alumno no posee una beca suspendida para reactivar');
		}

		const previousStatus = scholarship.status;
		const now = new Date();

		/*
		 * Si quedó alguna negociación vieja abierta por las
		 * pruebas anteriores, la cerramos automáticamente.
		 */
		await tx.scholarshipNegotiation.updateMany({
			where: {
				scholarshipId: scholarship.id,
				status: ScholarshipNegotiationStatus.OPEN
			},
			data: {
				status: ScholarshipNegotiationStatus.CANCELLED,
				resolvedAt: now,
				resolvedByUserId: actor.userId,
				resolutionNotes: 'Cerrada automáticamente por reactivación manual de la beca.'
			}
		});

		await tx.scholarship.update({
			where: {
				id: scholarship.id
			},
			data: {
				status: ScholarshipStatus.ACTIVE,
				active: true,
				reinstatedAt: now,
				suspendedAt: null,
				suspensionReason: null
			}
		});

		await tx.student.update({
			where: {
				id: studentId
			},
			data: {
				isBecado: true,
				isRecursante: false
			}
		});

		await tx.scholarshipHistory.create({
			data: {
				scholarshipId: scholarship.id,
				studentId,
				previousStatus,
				newStatus: ScholarshipStatus.ACTIVE,
				previousPercentage: scholarship.percentage,
				newPercentage: scholarship.percentage,
				reason: 'Reactivación manual de beca',
				notes: cleanReason,
				changedByUserId: actor.userId,
				changedByName: actor.userName
			}
		});

		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: 'UPDATE',
				entityType: 'Scholarship',
				entityId: scholarship.id,
				description: 'Beca reactivada manualmente.',
				metadata: {
					studentId,
					previousStatus,
					newStatus: ScholarshipStatus.ACTIVE,
					reason: cleanReason,
					existingChargesModified: false
				}
			}
		});

		return {
			reactivated: true,
			scholarshipId: scholarship.id
		};
	});
}
