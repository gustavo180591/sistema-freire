import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '$lib/server/db/prisma';
import {
	calculateChargeBenefit,
	getBenefitsConfig
} from '$lib/server/financial/benefit-calculator';

export type PendingChargeRecalculationSource =
	| 'MANUAL'
	| 'STUDENT_TYPE_CHANGE'
	| 'SCHOLARSHIP_REINSTATEMENT'
	| 'CONFIGURATION_CHANGE'
	| 'SYSTEM';

export interface PendingChargeRecalculationInput {
	studentId: string;
	userId: string | null;
	userName?: string | null;
	source: PendingChargeRecalculationSource;
	reason?: string | null;
}

export interface PendingChargeRecalculationResult {
	updatedCount: number;
	skippedCount: number;
}

export async function recalculatePendingStudentChargesWithClient(
	tx: Prisma.TransactionClient,
	input: PendingChargeRecalculationInput
): Promise<PendingChargeRecalculationResult> {
	const student = await tx.student.findUnique({
		where: {
			id: input.studentId
		},
		select: {
			id: true,
			isBecado: true,
			isRecursante: true
		}
	});

	if (!student) {
		throw new Error('Alumno no encontrado');
	}

	const benefitsConfig = await getBenefitsConfig(tx);

	const charges = await tx.studentCharge.findMany({
		where: {
			studentId: input.studentId,
			status: {
				in: ['PENDING', 'PARTIAL']
			},
			concept: {
				code: 'CUOTA_MENSUAL'
			}
		},
		select: {
			id: true,
			periodLabel: true,
			amount: true,
			finalAmount: true,
			discountApplied: true,
			scholarshipApplied: true,
			benefitType: true,
			benefitReason: true,
			installmentNumber: true
		}
	});

	let updatedCount = 0;
	let skippedCount = 0;

	for (const charge of charges) {
		const match = charge.periodLabel.match(/^(\d{4})-(\d{2})$/);

		if (!match) {
			skippedCount += 1;
			continue;
		}

		const month = Number(match[2]);

		if (!Number.isInteger(month) || month < 1 || month > 12) {
			skippedCount += 1;
			continue;
		}

		const correctBaseAmount = benefitsConfig.normalFeeAmount;

		const benefitCalculation = calculateChargeBenefit(
			new Decimal(correctBaseAmount),
			{
				isBecado: student.isBecado,
				isRecursante: student.isRecursante
			},
			charge.installmentNumber ?? 1,
			month,
			benefitsConfig
		);

		const currentAmount = Number(charge.amount);

		const currentFinalAmount = Number(charge.finalAmount);

		const correctFinalAmount = Number(benefitCalculation.finalAmount);

		const currentDiscount = Number(charge.discountApplied);

		const correctDiscount = Number(benefitCalculation.discountApplied);

		const currentScholarship = Number(charge.scholarshipApplied);

		const correctScholarship = Number(benefitCalculation.scholarshipApplied);

		const needsUpdate =
			currentAmount !== correctBaseAmount ||
			currentFinalAmount !== correctFinalAmount ||
			currentDiscount !== correctDiscount ||
			currentScholarship !== correctScholarship ||
			charge.benefitType !== benefitCalculation.benefitType ||
			charge.benefitReason !== benefitCalculation.benefitReason;

		if (!needsUpdate) {
			skippedCount += 1;
			continue;
		}

		await tx.studentCharge.update({
			where: {
				id: charge.id
			},
			data: {
				amount: new Decimal(correctBaseAmount),
				finalAmount: benefitCalculation.finalAmount,
				discountApplied: benefitCalculation.discountApplied,
				scholarshipApplied: benefitCalculation.scholarshipApplied,
				benefitType: benefitCalculation.benefitType,
				benefitReason: benefitCalculation.benefitReason,
				ruleSnapshot: benefitCalculation.ruleSnapshot as Prisma.InputJsonValue
			}
		});

		await tx.financialMovement.create({
			data: {
				studentId: student.id,
				movementType: 'ADJUSTMENT',
				entityType: 'StudentCharge',
				entityId: charge.id,
				description:
					input.source === 'MANUAL'
						? 'Recálculo manual de cuota pendiente'
						: 'Recálculo automático de cuota pendiente',
				amount: 0,
				balanceBefore: currentFinalAmount,
				balanceAfter: correctFinalAmount,
				userId: input.userId,
				metadata: {
					source: input.source,
					reason: input.reason ?? null,
					userName: input.userName ?? null,
					periodLabel: charge.periodLabel,
					previousAmount: currentAmount,
					newAmount: correctBaseAmount,
					previousFinalAmount: currentFinalAmount,
					newFinalAmount: correctFinalAmount,
					isBecado: student.isBecado,
					isRecursante: student.isRecursante
				}
			}
		});

		/*
		 * Compatibilidad con reportes existentes que toman
		 * el importe desde el movimiento CHARGE original.
		 */
		const originalMovement = await tx.financialMovement.findFirst({
			where: {
				entityType: 'StudentCharge',
				entityId: charge.id,
				movementType: 'CHARGE'
			},
			orderBy: {
				createdAt: 'asc'
			}
		});

		if (originalMovement) {
			await tx.financialMovement.update({
				where: {
					id: originalMovement.id
				},
				data: {
					amount: benefitCalculation.finalAmount
				}
			});
		}

		updatedCount += 1;
	}

	return {
		updatedCount,
		skippedCount
	};
}

export async function recalculatePendingStudentCharges(
	input: PendingChargeRecalculationInput
): Promise<PendingChargeRecalculationResult> {
	return prisma.$transaction((tx) => recalculatePendingStudentChargesWithClient(tx, input));
}

export interface GlobalPendingChargeRecalculationResult {
	processedStudents: number;
	updatedCount: number;
	skippedCount: number;
	errors: Array<{
		studentId: string;
		message: string;
	}>;
}

/**
 * Recalcula todas las cuotas mensuales pendientes existentes.
 *
 * Se utiliza cuando cambia la configuración financiera general.
 * Nunca modifica cargos PAID.
 */
export async function recalculatePendingChargesForAllStudents(input: {
	userId: string | null;
	userName?: string | null;
	reason?: string | null;
}): Promise<GlobalPendingChargeRecalculationResult> {
	const studentsWithPendingCharges = await prisma.studentCharge.findMany({
		where: {
			status: {
				in: ['PENDING', 'PARTIAL']
			},
			concept: {
				code: 'CUOTA_MENSUAL'
			}
		},
		distinct: ['studentId'],
		select: {
			studentId: true
		}
	});

	let processedStudents = 0;
	let updatedCount = 0;
	let skippedCount = 0;

	const errors: GlobalPendingChargeRecalculationResult['errors'] = [];

	for (const item of studentsWithPendingCharges) {
		try {
			const result = await recalculatePendingStudentCharges({
				studentId: item.studentId,
				userId: input.userId,
				userName: input.userName ?? null,
				source: 'CONFIGURATION_CHANGE',
				reason: input.reason ?? 'Cambio en la configuración general de cuotas'
			});

			processedStudents += 1;
			updatedCount += result.updatedCount;
			skippedCount += result.skippedCount;
		} catch (cause) {
			errors.push({
				studentId: item.studentId,
				message: cause instanceof Error ? cause.message : 'Error desconocido'
			});
		}
	}

	return {
		processedStudents,
		updatedCount,
		skippedCount,
		errors
	};
}
