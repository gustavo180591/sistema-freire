import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireFinancialAccess } from '$lib/server/auth/financial-access';
import { Decimal } from '@prisma/client/runtime/library';
import {
	getBenefitsConfig,
	calculateChargeBenefit
} from '$lib/server/financial/benefit-calculator';
import { Prisma } from '@prisma/client';
import * as DecimalHelpers from '$lib/server/financial/decimal-helpers';
import {
	updateStudentFinancialBlockStatus,
	shouldBlockStudent
} from '$lib/server/financial/student-blocking-service';
import {
	checkAndExpireScholarshipsForStudent,
	getChargeDueDate
} from '$lib/server/financial/scholarship-expiration-service';

/**
 * Genera cuotas mensuales faltantes desde el inicio del ciclo lectivo hasta el mes actual
 */
async function generateMissingMonthlyCharges(
	studentId: string,
	studentFirstName: string,
	studentLastName: string,
	isBecado: boolean,
	isRecursante: boolean,
	academicTermId: string,
	userId: string
): Promise<{ created: number; skipped: number }> {
	const benefitsConfig = await getBenefitsConfig(prisma);
	const monthlyConcept = await prisma.chargeConcept.findUnique({
		where: { code: 'CUOTA_MENSUAL' }
	});

	if (!monthlyConcept) {
		throw new Error('Concepto de cuota mensual no encontrado');
	}

	// Obtener el ciclo lectivo para usar su fecha de inicio
	const academicTerm = await prisma.academicTerm.findUnique({
		where: { id: academicTermId }
	});

	if (!academicTerm) {
		throw new Error('Ciclo lectivo no encontrado');
	}

	// Usar la fecha de inicio del ciclo lectivo
	const startDate = new Date(academicTerm.startDate);
	const startMonth = startDate.getMonth() + 1; // 1-12
	const startYear = startDate.getFullYear();

	// Mes actual
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth() + 1;
	const currentYear = currentDate.getFullYear();

	let created = 0;
	let skipped = 0;

	// Calcular cuotas a generar
	let installmentNumber = 1;
	for (let year = startYear; year <= currentYear; year++) {
		const monthStart = year === startYear ? startMonth : 1;
		const monthEnd = year === currentYear ? currentMonth : 12;

		for (let month = monthStart; month <= monthEnd; month++) {
			// Verificar si este mes está en los meses de beneficios
			const monthInBenefits = benefitsConfig.benefitsMonths.includes(month);

			// Determinar el monto base: siempre usar normalFeeAmount como amount
			// La beca se aplica como descuento en finalAmount
			const baseAmount = benefitsConfig.normalFeeAmount;

			// Formatear periodLabel como YYYY-MM
			const periodLabel = `${year}-${month.toString().padStart(2, '0')}`;

			// Verificar si ya existe un cargo para este período
			const existingCharge = await prisma.studentCharge.findUnique({
				where: {
					studentId_conceptId_periodLabel_academicTermId: {
						studentId,
						conceptId: monthlyConcept.id,
						periodLabel,
						academicTermId
					}
				}
			});

			if (existingCharge) {
				installmentNumber++;
				skipped++;
				continue;
			}

			// Calcular beneficios usando el sistema existente
			const benefitCalculation = calculateChargeBenefit(
				new Decimal(baseAmount),
				{ isBecado, isRecursante },
				installmentNumber,
				month,
				benefitsConfig
			);

			// Crear cuota mensual
			const monthlyCharge = await prisma.studentCharge.create({
				data: {
					studentId,
					conceptId: monthlyConcept.id,
					periodLabel,
					amount: new Decimal(baseAmount),
					dueDate: null,
					academicTermId,
					notes: `Cuota mensual - ${periodLabel}`,
					userId,
					lateFeeApplied: DecimalHelpers.zero(),
					discountApplied: benefitCalculation.discountApplied,
					scholarshipApplied: benefitCalculation.scholarshipApplied,
					finalAmount: benefitCalculation.finalAmount,
					status: 'PENDING',
					installmentNumber,
					benefitType: benefitCalculation.benefitType,
					benefitReason: benefitCalculation.benefitReason,
					ruleSnapshot: benefitCalculation.ruleSnapshot as Prisma.InputJsonValue
				}
			});

			// Crear movimiento financiero
			const currentCharges = await prisma.studentCharge.findMany({
				where: { studentId }
			});
			const currentBalance = currentCharges.reduce(
				(acc: Decimal, c: Prisma.StudentChargeGetPayload<{}>) =>
					DecimalHelpers.add(acc, DecimalHelpers.subtract(c.finalAmount, c.paidAmount)),
				DecimalHelpers.zero()
			);

			await prisma.financialMovement.create({
				data: {
					studentId,
					movementType: 'CHARGE',
					entityType: 'StudentCharge',
					entityId: monthlyCharge.id,
					description: `Cuota: ${monthlyConcept.name} - ${periodLabel}`,
					amount: benefitCalculation.finalAmount,
					balanceBefore: currentBalance,
					balanceAfter: DecimalHelpers.add(currentBalance, benefitCalculation.finalAmount),
					userId
				}
			});

			created++;
			installmentNumber++;
		}
	}

	return { created, skipped };
}

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireFinancialAccess(locals.user, params.id);

	// Expirar becas vencidas por pago fuera de término antes de cargar datos
	if (locals.user) {
		await checkAndExpireScholarshipsForStudent(
			params.id,
			locals.user.id,
			`${locals.user.firstName} ${locals.user.lastName}`
		);
	}

	const student = await prisma.student.findUniqueOrThrow({
		where: { id: params.id },
		include: {
			career: true,
			location: true,
			studentCharges: {
				include: {
					concept: true
				},
				orderBy: [{ periodLabel: 'desc' }]
			},
			payments: {
				orderBy: [{ paidAt: 'desc' }]
			}
		}
	});

	const benefitsConfig = await getBenefitsConfig(prisma);

	// Obtener el ciclo lectivo activo para el alumno
	const activeAcademicTerm = await prisma.academicTerm.findFirst({
		where: {
			active: true,
			...(student.locationId ? { locationId: student.locationId } : {})
		}
	});

	// Si hay un ciclo lectivo activo, generar cuotas faltantes
	if (activeAcademicTerm && locals.user) {
		await generateMissingMonthlyCharges(
			student.id,
			student.firstName,
			student.lastName,
			student.isBecado,
			student.isRecursante,
			activeAcademicTerm.id,
			locals.user.id
		);

		// Recargar los cargos después de generar los faltantes
		student.studentCharges = await prisma.studentCharge.findMany({
			where: { studentId: student.id },
			include: { concept: true },
			orderBy: [{ periodLabel: 'desc' }]
		});

		// Actualizar estado de bloqueo financiero del alumno
		await updateStudentFinancialBlockStatus(student.id);
	}

	const charges = await Promise.all(
		student.studentCharges.map(async (charge) => {
			const scholarshipApplied = Number(charge.scholarshipApplied);
			let amount = Number(charge.amount);
			let finalAmount = Number(charge.finalAmount);

			// Si el cargo no está pagado completamente, recalcular monto con configuración actual
			if (charge.status !== 'PAID' && charge.concept.code === 'CUOTA_MENSUAL') {
				const periodParts = charge.periodLabel.split('-');
				if (periodParts.length === 2) {
					const month = parseInt(periodParts[1], 10);
					if (!isNaN(month)) {
						const monthInBenefits = benefitsConfig.benefitsMonths.includes(month);

						// Determinar el monto base según configuración actual
						let baseAmount: number;
						if (student.isBecado && monthInBenefits) {
							baseAmount = benefitsConfig.becadoFeeAmount;
						} else if (student.isRecursante && monthInBenefits) {
							baseAmount = benefitsConfig.recursantFeeAmount;
						} else {
							baseAmount = benefitsConfig.normalFeeAmount;
						}

						// Recalcular beneficios con configuración actual
						const benefitCalculation = calculateChargeBenefit(
							new Decimal(baseAmount),
							{ isBecado: student.isBecado, isRecursante: student.isRecursante },
							charge.installmentNumber || 1,
							month,
							benefitsConfig
						);

						// Usar montos recalculados para display
						amount = baseAmount;
						finalAmount = Number(benefitCalculation.finalAmount);
					}
				}
			}

			// Calcular pendiente con el monto recalculado
			const pending = finalAmount - Number(charge.paidAmount);

			// Determine charge type based on student type, benefit month, and scholarship status
			let chargeType = 'Cuota Normal';
			let scholarshipLost = false;

			if (charge.concept.code === 'CUOTA_MENSUAL') {
				const periodParts = charge.periodLabel.split('-');
				if (periodParts.length === 2) {
					const month = parseInt(periodParts[1], 10);
					if (!isNaN(month) && benefitsConfig.benefitsMonths.includes(month)) {
						if (student.isBecado) {
							// Verificar si la beca se perdió (scholarshipApplied es 0 pero amount > finalAmount)
							if (scholarshipApplied === 0 && amount > finalAmount) {
								chargeType = 'Beca perdida';
								scholarshipLost = true;
							} else if (scholarshipApplied > 0) {
								chargeType = 'Cuota Becado';
							}
						} else if (student.isRecursante) {
							chargeType = 'Cuota Recursante';
						}
					}
				}
			}

			// Calcular estado de vencimiento
			let isOverdue = false;
			let dueDate: Date | null = null;

			if (charge.concept.code === 'CUOTA_MENSUAL' && charge.periodLabel) {
				dueDate = await getChargeDueDate(charge.periodLabel);
				const now = new Date();
				isOverdue = now > dueDate && pending > 0;
			}

			return {
				id: charge.id,
				concept: charge.concept.name,
				conceptCode: charge.concept.code,
				period: charge.periodLabel,
				amount,
				finalAmount,
				paid: Number(charge.paidAmount),
				pending,
				status: charge.status,
				benefitType: charge.benefitType,
				benefitReason: charge.benefitReason,
				chargeType,
				scholarshipLost,
				scholarshipApplied,
				isOverdue,
				dueDate: dueDate ? dueDate.toISOString() : null
			};
		})
	);

	const totalDebt = charges.reduce((acc, charge) => acc + charge.pending, 0);

	const totalPaid = student.payments.reduce((acc, payment) => acc + Number(payment.amount), 0);

	// Obtener estado de bloqueo financiero
	const blockingStatus = await shouldBlockStudent(student.id);

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			career: student.career.name,
			isBecado: student.isBecado,
			isRecursante: student.isRecursante,
			financialBlocked: student.financialBlocked
		},
		metrics: {
			totalDebt,
			totalPaid,
			pendingCharges: charges.filter((c) => c.pending > 0).length,
			hasScholarship: student.isBecado,
			blocked: blockingStatus.isBlocked,
			blockingThreshold: blockingStatus.blockingThreshold,
			blockingReason: blockingStatus.reason
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

			// Skip if already paid
			if (charge.status === 'PAID') {
				skippedCount++;
				continue;
			}

			// Skip if not PENDING or PARTIAL
			if (charge.status !== 'PENDING' && charge.status !== 'PARTIAL') {
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

			// Calculate correct base amount: always use normalFeeAmount
			// The scholarship is applied as discount in finalAmount
			const correctBaseAmount = benefitsConfig.normalFeeAmount;

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
