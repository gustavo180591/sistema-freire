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
 * Calcula el monto final de una cuota según el tipo de alumno y configuración.
 *
 * Regla:
 * - Alumno normal → paga normalFeeAmount
 * - Alumno becado → paga becadoFeeAmount
 * - Alumno recursante → paga recursantFeeAmount
 *
 * Los montos se toman directamente de la configuración, no se calculan como descuento.
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
			finalAmount: new Decimal(config.normalFeeAmount),
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

	// Determinar el monto según el tipo de alumno
	let finalAmount: Decimal;
	let benefitType: BenefitType;
	let benefitReason: string;
	let scholarshipApplied: Decimal;
	let discountApplied: Decimal;

	if (studentBenefitInfo.isBecado) {
		// Alumno becado: usa becadoFeeAmount
		finalAmount = new Decimal(config.becadoFeeAmount);
		benefitType = 'SCHOLARSHIP';
		benefitReason = 'Cuota Becado';
		scholarshipApplied = DecimalHelpers.subtract(
			new Decimal(config.normalFeeAmount),
			new Decimal(config.becadoFeeAmount)
		);
		discountApplied = DecimalHelpers.zero();
	} else if (studentBenefitInfo.isRecursante) {
		// Alumno recursante: usa recursantFeeAmount
		finalAmount = new Decimal(config.recursantFeeAmount);
		benefitType = 'RECURSANT';
		benefitReason = 'Cuota Recursante';
		scholarshipApplied = DecimalHelpers.zero();
		discountApplied = DecimalHelpers.subtract(
			new Decimal(config.normalFeeAmount),
			new Decimal(config.recursantFeeAmount)
		);
	} else {
		// Alumno normal: usa normalFeeAmount
		finalAmount = new Decimal(config.normalFeeAmount);
		benefitType = 'NONE';
		benefitReason = 'Cuota Normal';
		scholarshipApplied = DecimalHelpers.zero();
		discountApplied = DecimalHelpers.zero();
	}

	return {
		finalAmount,
		discountApplied,
		scholarshipApplied,
		benefitType,
		benefitReason,
		installmentNumber,
		ruleSnapshot: createRuleSnapshot(
			baseAmount,
			installmentNumber,
			config,
			studentBenefitInfo,
			benefitType
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
