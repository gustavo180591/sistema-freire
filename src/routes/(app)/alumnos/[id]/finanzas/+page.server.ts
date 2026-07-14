import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireFinancialAccess } from '$lib/server/auth/financial-access';
import { Decimal } from '@prisma/client/runtime/library';
import {
	getBenefitsConfig,
	calculateChargeBenefit
} from '$lib/server/financial/benefit-calculator';
import { Prisma } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireFinancialAccess(locals.user, params.id);

	const student = await prisma.student.findUniqueOrThrow({
		where: { id: params.id },
		include: {
			career: true,
			studentCharges: {
				include: {
					concept: true
				},
				orderBy: [{ createdAt: 'desc' }]
			},
			payments: {
				orderBy: [{ paidAt: 'desc' }]
			}
		}
	});

	const benefitsConfig = await getBenefitsConfig(prisma);

	const charges = student.studentCharges.map((charge) => {
		const pending = Number(charge.finalAmount) - Number(charge.paidAmount);

		// Determine charge type based on student type and benefit month
		let chargeType = 'Cuota Normal';
		if (charge.concept.code === 'CUOTA_MENSUAL') {
			const periodParts = charge.periodLabel.split('-');
			if (periodParts.length === 2) {
				const month = parseInt(periodParts[1], 10);
				if (!isNaN(month) && benefitsConfig.benefitsMonths.includes(month)) {
					if (student.isBecado) {
						chargeType = 'Cuota Becado';
					} else if (student.isRecursante) {
						chargeType = 'Cuota Recursante';
					}
				}
			}
		}

		return {
			id: charge.id,
			concept: charge.concept.name,
			conceptCode: charge.concept.code,
			period: charge.periodLabel,
			amount: Number(charge.amount),
			finalAmount: Number(charge.finalAmount),
			paid: Number(charge.paidAmount),
			pending,
			status: charge.status,
			benefitType: charge.benefitType,
			benefitReason: charge.benefitReason,
			chargeType
		};
	});

	const totalDebt = charges.reduce((acc, charge) => acc + charge.pending, 0);

	const totalPaid = student.payments.reduce((acc, payment) => acc + Number(payment.amount), 0);

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			career: student.career.name,
			isBecado: student.isBecado,
			isRecursante: student.isRecursante
		},
		metrics: {
			totalDebt,
			totalPaid,
			pendingCharges: charges.filter((c) => c.pending > 0).length,
			hasScholarship: student.isBecado,
			blocked: totalDebt > 0
		},
		charges
	};
};

export const actions: Actions = {
	recalculateCharges: async ({ params, locals }) => {
		await requireFinancialAccess(locals.user, params.id);

		const student = await prisma.student.findUniqueOrThrow({
			where: { id: params.id },
			include: {
				studentCharges: {
					include: {
						concept: true,
						allocations: true
					}
				}
			}
		});

		const benefitsConfig = await getBenefitsConfig(prisma);

		let updatedCount = 0;
		let skippedCount = 0;

		for (const charge of student.studentCharges) {
			// Skip if not monthly fee
			if (charge.concept.code !== 'CUOTA_MENSUAL') {
				skippedCount++;
				continue;
			}

			// Skip if not pending
			if (charge.status !== 'PENDING') {
				skippedCount++;
				continue;
			}

			// Skip if has payments
			if (charge.allocations.length > 0) {
				skippedCount++;
				continue;
			}

			// Skip if paidAmount > 0
			if (Number(charge.paidAmount) > 0) {
				skippedCount++;
				continue;
			}

			// Parse period label to get month
			const periodParts = charge.periodLabel.split('-');
			if (periodParts.length !== 2) {
				skippedCount++;
				continue;
			}

			const month = parseInt(periodParts[1], 10);
			if (isNaN(month)) {
				skippedCount++;
				continue;
			}

			// Check if month is in benefits months
			const monthInBenefits = benefitsConfig.benefitsMonths.includes(month);

			// Calculate correct base amount
			let correctBaseAmount: number;
			if (student.isBecado && monthInBenefits) {
				correctBaseAmount = benefitsConfig.becadoFeeAmount;
			} else if (student.isRecursante && monthInBenefits) {
				correctBaseAmount = benefitsConfig.recursantFeeAmount;
			} else {
				correctBaseAmount = benefitsConfig.normalFeeAmount;
			}

			// Calculate benefit
			const benefitCalculation = calculateChargeBenefit(
				new Decimal(correctBaseAmount),
				{ isBecado: student.isBecado, isRecursante: student.isRecursante },
				charge.installmentNumber,
				month,
				benefitsConfig
			);

			const currentAmount = Number(charge.amount);
			const currentFinalAmount = Number(charge.finalAmount);
			const correctFinalAmount = Number(benefitCalculation.finalAmount);

			// Check if update is needed
			if (currentAmount === correctBaseAmount && currentFinalAmount === correctFinalAmount) {
				skippedCount++;
				continue;
			}

			// Update the charge
			await prisma.studentCharge.update({
				where: { id: charge.id },
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

			// Update financial movement
			const movement = await prisma.financialMovement.findFirst({
				where: {
					entityType: 'StudentCharge',
					entityId: charge.id,
					movementType: 'CHARGE'
				}
			});

			if (movement) {
				await prisma.financialMovement.update({
					where: { id: movement.id },
					data: {
						amount: benefitCalculation.finalAmount
					}
				});
			}

			updatedCount++;
		}

		return {
			success: true,
			updatedCount,
			skippedCount
		};
	}
};
