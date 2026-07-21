import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import * as DecimalHelpers from './decimal-helpers';

export type BenefitType = 'NONE' | 'SCHOLARSHIP' | 'RECURSANT';
export type RecursantBenefitType = 'FIXED_FINAL_AMOUNT' | 'PER_SUBJECT_AMOUNT';
export type BenefitCombinationStrategy = 'BEST_AMOUNT';

export interface BenefitsConfig {
	// Montos por tipo de alumno
	normalFeeAmount: number;
	becadoFeeAmount: number;
	recursantFeeAmount: number;
	enrollmentAmount: number;

	// Configuración de beneficios
	benefitsStartMonth: number; // 1-12 (enero-diciembre)
	benefitsEndMonth: number; // 1-12 (enero-diciembre)
	benefitsMonths: number[]; // Array de meses donde aplican beneficios [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

	recursantBenefitType: RecursantBenefitType;
	recursantBenefitValue: number;
	benefitCombinationStrategy: BenefitCombinationStrategy;

	// Configuración de vencimiento
	paymentDueGraceDays: number; // Días de tolerancia después del fin del mes antes de considerar vencida la cuota
}

export interface ChargeCalculation {
	finalAmount: Decimal;
	discountApplied: Decimal;
	scholarshipApplied: Decimal;
	benefitType: BenefitType;
	benefitReason: string;
	installmentNumber: number | null;
	ruleSnapshot: Prisma.JsonValue;
}

export interface StudentBenefitInfo {
	isBecado: boolean;
	isRecursante: boolean;
	scholarshipPercentage?: Decimal;
}

/**
 * Calcula el monto final de una cuota aplicando beneficios de beca y recursante
 * según la configuración institucional.
 */
export function calculateChargeBenefit(
	baseAmount: Decimal,
	studentBenefitInfo: StudentBenefitInfo,
	installmentNumber: number | null,
	monthNumber: number | null,
	config: BenefitsConfig
): ChargeCalculation {
	// Si no hay número de cuota ni mes, no aplicar beneficios (cuotas históricas)
	if (installmentNumber === null && monthNumber === null) {
		return {
			finalAmount: baseAmount,
			discountApplied: DecimalHelpers.zero(),
			scholarshipApplied: DecimalHelpers.zero(),
			benefitType: 'NONE',
			benefitReason: 'Cuota histórica sin número de cuota/mes',
			installmentNumber: null,
			ruleSnapshot: null
		};
	}

	// Verificar si los beneficios aplican según el mes
	const monthToCheck = monthNumber || installmentNumber;
	if (monthToCheck && !config.benefitsMonths.includes(monthToCheck)) {
		return {
			finalAmount: baseAmount,
			discountApplied: DecimalHelpers.zero(),
			scholarshipApplied: DecimalHelpers.zero(),
			benefitType: 'NONE',
			benefitReason: 'Los beneficios no aplican para este mes',
			installmentNumber,
			ruleSnapshot: createRuleSnapshot(
				baseAmount,
				installmentNumber,
				config,
				studentBenefitInfo,
				'NONE'
			)
		};
	}

	// Calcular alternativas de monto final
	const normalAmount = baseAmount;
	const scholarshipAmount = calculateScholarshipAmount(baseAmount, studentBenefitInfo, config);
	const recursantAmount = calculateRecursantAmount(baseAmount, config);

	// Seleccionar el monto más favorable (menor monto final)
	const amounts = [
		{ type: 'NONE' as BenefitType, amount: normalAmount, reason: 'Sin beneficio' },
		{ type: 'SCHOLARSHIP' as BenefitType, amount: scholarshipAmount, reason: 'Beca aplicada' },
		{
			type: 'RECURSANT' as BenefitType,
			amount: recursantAmount,
			reason: 'Beneficio recursante aplicado'
		}
	];

	// Filtrar solo las opciones que aplican según el tipo de alumno
	const applicableAmounts = amounts.filter((option) => {
		if (option.type === 'SCHOLARSHIP' && !studentBenefitInfo.isBecado) return false;
		if (option.type === 'RECURSANT' && !studentBenefitInfo.isRecursante) return false;
		return true;
	});

	// Si no hay beneficios aplicables, usar monto normal
	if (applicableAmounts.length === 0) {
		return {
			finalAmount: normalAmount,
			discountApplied: DecimalHelpers.zero(),
			scholarshipApplied: DecimalHelpers.zero(),
			benefitType: 'NONE',
			benefitReason: 'Alumno no tiene beneficios aplicables',
			installmentNumber,
			ruleSnapshot: createRuleSnapshot(
				baseAmount,
				installmentNumber,
				config,
				studentBenefitInfo,
				'NONE'
			)
		};
	}

	// Elegir el monto más favorable (menor)
	const bestOption = applicableAmounts.reduce((best, current) =>
		DecimalHelpers.isLessThan(current.amount, best.amount) ? current : best
	);

	// Calcular descuento aplicado
	const discountApplied = DecimalHelpers.subtract(baseAmount, bestOption.amount);
	const scholarshipApplied =
		bestOption.type === 'SCHOLARSHIP' ? discountApplied : DecimalHelpers.zero();

	return {
		finalAmount: bestOption.amount,
		discountApplied,
		scholarshipApplied,
		benefitType: bestOption.type,
		benefitReason: `${bestOption.reason} (monto más favorable)`,
		installmentNumber,
		ruleSnapshot: createRuleSnapshot(
			baseAmount,
			installmentNumber,
			config,
			studentBenefitInfo,
			bestOption.type
		)
	};
}

/**
 * Calcula el monto final aplicando beca por monto fijo.
 * Para alumnos becados: finalAmount = becadoFeeAmount (monto fijo)
 * scholarshipApplied = normalFeeAmount - becadoFeeAmount
 */
function calculateScholarshipAmount(
	baseAmount: Decimal,
	studentBenefitInfo: StudentBenefitInfo,
	config: BenefitsConfig
): Decimal {
	if (!studentBenefitInfo.isBecado) {
		return baseAmount;
	}

	// Usar becadoFeeAmount como monto final fijo
	return new Decimal(config.becadoFeeAmount);
}

/**
 * Calcula el monto final aplicando beneficio de recursante.
 */
function calculateRecursantAmount(baseAmount: Decimal, config: BenefitsConfig): Decimal {
	if (config.recursantBenefitType === 'FIXED_FINAL_AMOUNT') {
		// El valor configurado es el monto final, no un descuento
		return new Decimal(config.recursantBenefitValue);
	}

	// PER_SUBJECT_AMOUNT no implementado en esta fase
	return baseAmount;
}

/**
 * Crea un snapshot de las reglas aplicadas para auditoría.
 */
function createRuleSnapshot(
	baseAmount: Decimal,
	installmentNumber: number | null,
	config: BenefitsConfig,
	studentBenefitInfo: StudentBenefitInfo,
	selectedBenefit: BenefitType
): Prisma.JsonValue {
	return {
		baseAmount: baseAmount.toString(),
		installmentNumber,
		benefitsMonths: config.benefitsMonths,
		studentFlags: {
			isBecado: studentBenefitInfo.isBecado,
			isRecursante: studentBenefitInfo.isRecursante,
			scholarshipPercentage: studentBenefitInfo.scholarshipPercentage?.toString()
		},
		benefitCombinationStrategy: config.benefitCombinationStrategy,
		recursantBenefitType: config.recursantBenefitType,
		recursantBenefitValue: config.recursantBenefitValue,
		selectedBenefit,
		timestamp: new Date().toISOString()
	};
}

/**
 * Obtiene la configuración de beneficios desde FinancialConfig.
 */
export async function getBenefitsConfig(prisma: Prisma.TransactionClient): Promise<BenefitsConfig> {
	const config = await prisma.financialConfig.findUnique({
		where: { key: 'financial.benefits' }
	});

	if (!config) {
		// Configuración por defecto
		return {
			normalFeeAmount: 50000,
			becadoFeeAmount: 25000,
			recursantFeeAmount: 30000,
			enrollmentAmount: 50000,
			benefitsStartMonth: 3,
			benefitsEndMonth: 12,
			benefitsMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
			recursantBenefitType: 'FIXED_FINAL_AMOUNT',
			recursantBenefitValue: 30000,
			benefitCombinationStrategy: 'BEST_AMOUNT',
			paymentDueGraceDays: 0
		};
	}

	// Validar estructura de configuración
	const value = config.value;
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		const cfg = value;
		if (
			typeof cfg.normalFeeAmount === 'number' &&
			typeof cfg.becadoFeeAmount === 'number' &&
			typeof cfg.recursantFeeAmount === 'number' &&
			typeof cfg.enrollmentAmount === 'number' &&
			Array.isArray(cfg.benefitsMonths) &&
			typeof cfg.recursantBenefitType === 'string' &&
			typeof cfg.recursantBenefitValue === 'number' &&
			typeof cfg.benefitCombinationStrategy === 'string'
		) {
			return {
				normalFeeAmount: cfg.normalFeeAmount,
				becadoFeeAmount: cfg.becadoFeeAmount,
				recursantFeeAmount: cfg.recursantFeeAmount,
				enrollmentAmount: cfg.enrollmentAmount,
				benefitsStartMonth: typeof cfg.benefitsStartMonth === 'number' ? cfg.benefitsStartMonth : 3,
				benefitsEndMonth: typeof cfg.benefitsEndMonth === 'number' ? cfg.benefitsEndMonth : 12,
				benefitsMonths: cfg.benefitsMonths as number[],
				recursantBenefitType: cfg.recursantBenefitType as RecursantBenefitType,
				recursantBenefitValue: cfg.recursantBenefitValue,
				benefitCombinationStrategy: cfg.benefitCombinationStrategy as BenefitCombinationStrategy,
				paymentDueGraceDays:
					typeof cfg.paymentDueGraceDays === 'number' ? cfg.paymentDueGraceDays : 0
			};
		}
	}

	// Si la configuración es inválida, usar valores por defecto
	return {
		normalFeeAmount: 50000,
		becadoFeeAmount: 25000,
		recursantFeeAmount: 30000,
		enrollmentAmount: 50000,
		benefitsStartMonth: 3,
		benefitsEndMonth: 12,
		benefitsMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		recursantBenefitType: 'FIXED_FINAL_AMOUNT',
		recursantBenefitValue: 30000,
		benefitCombinationStrategy: 'BEST_AMOUNT',
		paymentDueGraceDays: 0
	};
}
