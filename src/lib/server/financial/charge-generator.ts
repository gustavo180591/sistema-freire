import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import * as DecimalHelpers from './decimal-helpers';
import {
	getBenefitsConfig,
	calculateChargeBenefit,
	type BenefitsConfig
} from './benefit-calculator';

export interface ChargeGenerationInput {
	studentId: string;
	studentFirstName: string;
	studentLastName: string;
	isBecado: boolean;
	isRecursante: boolean;
	careerId: string;
	inscriptionPaid: boolean;
	userId: string;
	academicTermId: string;
	locationId?: string;
	tx: Prisma.TransactionClient;
}

export interface ChargeGenerationResult {
	inscriptionChargeId: string | null;
	monthlyChargeIds: string[];
	totalCharges: number;
}

/**
 * Genera automáticamente los cargos financieros para un nuevo alumno:
 * - Cargo de inscripción (si no fue pagada)
 * - Cuotas mensuales desde el mes de inicio de clases hasta el mes actual
 */
export async function generateAutomaticCharges(
	input: ChargeGenerationInput
): Promise<ChargeGenerationResult> {
	const {
		studentId,
		studentFirstName,
		studentLastName,
		isBecado,
		isRecursante,
		inscriptionPaid,
		userId,
		academicTermId,
		tx
	} = input;

	// Obtener configuración de beneficios
	const benefitsConfig = await getBenefitsConfig(tx);

	// Obtener conceptos de cargo
	const inscriptionConcept = await tx.chargeConcept.findUnique({
		where: { code: 'INSCRIPCION' }
	});

	const monthlyConcept = await tx.chargeConcept.findUnique({
		where: { code: 'CUOTA_MENSUAL' }
	});

	if (!inscriptionConcept || !monthlyConcept) {
		throw new Error('Conceptos de cargo no configurados (INSCRIPCION o CUOTA_MENSUAL)');
	}

	const inscriptionChargeId: string | null = null;
	const monthlyChargeIds: string[] = [];

	// Generar cargo de inscripción (pagado o pendiente según el estado)
	const enrollmentAmount = new Decimal(benefitsConfig.enrollmentAmount);
	const currentYear = new Date().getFullYear();
	const periodLabel = `${currentYear}-INSCRIPCION`;

	const inscriptionCharge = await tx.studentCharge.create({
		data: {
			studentId,
			conceptId: inscriptionConcept.id,
			periodLabel,
			amount: enrollmentAmount,
			dueDate: null,
			academicTermId,
			notes: 'Inscripción',
			userId,
			lateFeeApplied: DecimalHelpers.zero(),
			discountApplied: DecimalHelpers.zero(),
			scholarshipApplied: DecimalHelpers.zero(),
			finalAmount: enrollmentAmount,
			status: inscriptionPaid ? 'PAID' : 'PENDING',
			paidAmount: inscriptionPaid ? enrollmentAmount : DecimalHelpers.zero(),
			installmentNumber: null,
			benefitType: 'NONE',
			benefitReason: 'Inscripción no tiene beneficios',
			ruleSnapshot: Prisma.JsonNull
		}
	});

	// Crear movimiento financiero del cargo
	await tx.financialMovement.create({
		data: {
			studentId,
			movementType: 'CHARGE',
			entityType: 'StudentCharge',
			entityId: inscriptionCharge.id,
			description: `Inscripción: ${studentFirstName} ${studentLastName}`,
			amount: enrollmentAmount,
			balanceBefore: DecimalHelpers.zero(),
			balanceAfter: enrollmentAmount,
			userId
		}
	});

	monthlyChargeIds.push(inscriptionCharge.id);

	// Si inscriptionPaid = true, crear Payment, PaymentAllocation y movimiento de pago
	if (inscriptionPaid) {
		const payment = await tx.payment.create({
			data: {
				studentId,
				amount: enrollmentAmount,
				method: 'CASH',
				notes: 'Inscripción marcada como pagada al crear alumno',
				academicTermId,
				userId
			}
		});

		await tx.paymentAllocation.create({
			data: {
				paymentId: payment.id,
				chargeId: inscriptionCharge.id,
				amount: enrollmentAmount
			}
		});

		// Crear movimiento financiero del pago
		await tx.financialMovement.create({
			data: {
				studentId,
				movementType: 'PAYMENT',
				entityType: 'Payment',
				entityId: payment.id,
				description: `Pago de inscripción: ${studentFirstName} ${studentLastName}`,
				amount: enrollmentAmount,
				balanceBefore: enrollmentAmount,
				balanceAfter: DecimalHelpers.zero(),
				userId
			}
		});
	}

	// Generar cuotas mensuales desde el mes de inicio hasta el mes actual
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth() + 1; // 1-12

	const startMonth = benefitsConfig.benefitsStartMonth; // 3 (marzo) por defecto
	const startYear = currentMonth >= startMonth ? currentYear : currentYear - 1;

	// Calcular cuotas a generar
	let installmentNumber = 1;
	for (let year = startYear; year <= currentYear; year++) {
		const monthStart = year === startYear ? startMonth : 1;
		const monthEnd = year === currentYear ? currentMonth : 12;

		for (let month = monthStart; month <= monthEnd; month++) {
			// Verificar si este mes está en los meses de beneficios
			const monthInBenefits = benefitsConfig.benefitsMonths.includes(month);

			// Determinar el monto base según el tipo de alumno
			let baseAmount: number;
			if (isBecado && monthInBenefits) {
				baseAmount = benefitsConfig.becadoFeeAmount;
			} else if (isRecursante && monthInBenefits) {
				baseAmount = benefitsConfig.recursantFeeAmount;
			} else {
				baseAmount = benefitsConfig.normalFeeAmount;
			}

			// Formatear periodLabel como YYYY-MM
			const periodLabel = `${year}-${month.toString().padStart(2, '0')}`;

			// Verificar si ya existe un cargo para este período
			const existingCharge = await tx.studentCharge.findUnique({
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
			const monthlyCharge = await tx.studentCharge.create({
				data: {
					studentId,
					conceptId: monthlyConcept.id,
					periodLabel,
					amount: new Decimal(baseAmount),
					dueDate: null, // Se puede configurar más adelante
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
			const currentCharges = await tx.studentCharge.findMany({
				where: { studentId }
			});
			const currentBalance = currentCharges.reduce(
				(acc: Decimal, c: Prisma.StudentChargeGetPayload<{}>) =>
					DecimalHelpers.add(acc, DecimalHelpers.subtract(c.finalAmount, c.paidAmount)),
				DecimalHelpers.zero()
			);

			await tx.financialMovement.create({
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

			monthlyChargeIds.push(monthlyCharge.id);
			installmentNumber++;
		}
	}

	return {
		inscriptionChargeId: monthlyChargeIds[0] || null,
		monthlyChargeIds,
		totalCharges: monthlyChargeIds.length
	};
}
