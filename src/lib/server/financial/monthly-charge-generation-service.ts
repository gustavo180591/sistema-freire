import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '$lib/server/db/prisma';
import {
	calculateChargeBenefit,
	getBenefitsConfig
} from '$lib/server/financial/benefit-calculator';
import * as DecimalHelpers from '$lib/server/financial/decimal-helpers';

const INSTITUTION_TIME_ZONE = 'America/Argentina/Cordoba';

interface YearMonth {
	year: number;
	month: number;
}

export interface MonthlyChargeGenerationResult {
	created: number;
	skipped: number;
}

export interface GlobalMonthlyChargeGenerationResult {
	processedStudents: number;
	createdCharges: number;
	skippedCharges: number;
	studentsWithoutAcademicTerm: number;
	errors: Array<{
		studentId: string;
		message: string;
	}>;
}

function currentInstitutionYearMonth(date: Date): YearMonth {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: INSTITUTION_TIME_ZONE,
		year: 'numeric',
		month: 'numeric'
	}).formatToParts(date);

	const year = Number(parts.find((part) => part.type === 'year')?.value);

	const month = Number(parts.find((part) => part.type === 'month')?.value);

	return {
		year,
		month
	};
}

function databaseDateYearMonth(date: Date): YearMonth {
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1
	};
}

function compareYearMonth(left: YearMonth, right: YearMonth): number {
	if (left.year !== right.year) {
		return left.year - right.year;
	}

	return left.month - right.month;
}

function nextYearMonth(value: YearMonth): YearMonth {
	if (value.month === 12) {
		return {
			year: value.year + 1,
			month: 1
		};
	}

	return {
		year: value.year,
		month: value.month + 1
	};
}

function minYearMonth(left: YearMonth, right: YearMonth): YearMonth {
	return compareYearMonth(left, right) <= 0 ? left : right;
}

function installmentNumberFor(start: YearMonth, current: YearMonth): number {
	return (current.year - start.year) * 12 + (current.month - start.month) + 1;
}

function periodLabelFor(value: YearMonth): string {
	return `${value.year}-${String(value.month).padStart(2, '0')}`;
}

async function getStudentBalance(
	tx: Prisma.TransactionClient,
	studentId: string
): Promise<Decimal> {
	const charges = await tx.studentCharge.findMany({
		where: {
			studentId
		},
		select: {
			finalAmount: true,
			paidAmount: true
		}
	});

	return charges.reduce(
		(balance, charge) =>
			DecimalHelpers.add(balance, DecimalHelpers.subtract(charge.finalAmount, charge.paidAmount)),
		DecimalHelpers.zero()
	);
}

/**
 * Completa todas las cuotas faltantes desde el inicio del ciclo
 * hasta el mes institucional actual.
 *
 * Es idempotente gracias al unique:
 * studentId + conceptId + periodLabel + academicTermId.
 */
export async function generateMissingMonthlyCharges(
	studentId: string,
	studentFirstName: string,
	studentLastName: string,
	isBecado: boolean,
	isRecursante: boolean,
	academicTermId: string,
	userId: string | null = null,
	now = new Date()
): Promise<MonthlyChargeGenerationResult> {
	const [benefitsConfig, monthlyConcept, academicTerm] = await Promise.all([
		getBenefitsConfig(prisma),

		prisma.chargeConcept.findUnique({
			where: {
				code: 'CUOTA_MENSUAL'
			}
		}),

		prisma.academicTerm.findUnique({
			where: {
				id: academicTermId
			},
			select: {
				id: true,
				startDate: true,
				endDate: true
			}
		})
	]);

	if (!monthlyConcept) {
		throw new Error('Concepto CUOTA_MENSUAL no configurado');
	}

	if (!academicTerm) {
		throw new Error('Ciclo lectivo no encontrado');
	}

	const startPeriod = databaseDateYearMonth(academicTerm.startDate);

	const termEndPeriod = databaseDateYearMonth(academicTerm.endDate);

	const currentPeriod = currentInstitutionYearMonth(now);

	const lastPeriod = minYearMonth(currentPeriod, termEndPeriod);

	if (compareYearMonth(startPeriod, lastPeriod) > 0) {
		return {
			created: 0,
			skipped: 0
		};
	}

	let created = 0;
	let skipped = 0;
	let period = startPeriod;

	while (compareYearMonth(period, lastPeriod) <= 0) {
		const currentPeriodValue = period;
		const periodLabel = periodLabelFor(currentPeriodValue);

		const installmentNumber = installmentNumberFor(startPeriod, currentPeriodValue);

		const monthInBenefits = benefitsConfig.benefitsMonths.includes(currentPeriodValue.month);

		const baseAmount = benefitsConfig.normalFeeAmount;

		const benefitCalculation = calculateChargeBenefit(
			new Decimal(baseAmount),
			{
				isBecado,
				isRecursante
			},
			installmentNumber,
			currentPeriodValue.month,
			benefitsConfig
		);

		const wasCreated = await prisma.$transaction(async (tx) => {
			const existingCharge = await tx.studentCharge.findUnique({
				where: {
					studentId_conceptId_periodLabel_academicTermId: {
						studentId,
						conceptId: monthlyConcept.id,
						periodLabel,
						academicTermId
					}
				},
				select: {
					id: true
				}
			});

			if (existingCharge) {
				return false;
			}

			const balanceBefore = await getStudentBalance(tx, studentId);

			const monthlyCharge = await tx.studentCharge.create({
				data: {
					studentId,
					conceptId: monthlyConcept.id,
					periodLabel,
					amount: new Decimal(baseAmount),
					dueDate: null,
					academicTermId,
					notes: userId
						? `Cuota mensual - ${periodLabel}`
						: `Cuota mensual automática - ${periodLabel}`,
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

			await tx.financialMovement.create({
				data: {
					studentId,
					movementType: 'CHARGE',
					entityType: 'StudentCharge',
					entityId: monthlyCharge.id,
					description: `Cuota: ${monthlyConcept.name} - ${periodLabel}`,
					amount: benefitCalculation.finalAmount,
					balanceBefore,
					balanceAfter: DecimalHelpers.add(balanceBefore, benefitCalculation.finalAmount),
					userId,
					metadata: {
						source: userId ? 'MANUAL_SYNCHRONIZATION' : 'MONTHLY_SCHEDULER',
						periodLabel,
						monthInBenefits
					}
				}
			});

			return true;
		});

		if (wasCreated) {
			created += 1;
		} else {
			skipped += 1;
		}

		period = nextYearMonth(period);
	}

	return {
		created,
		skipped
	};
}

/**
 * Sincronización mensual global.
 *
 * Se ejecutará automáticamente el día 1.
 * Solamente procesa alumnos ACTIVE.
 */
export async function generateMonthlyChargesForActiveStudents(
	now = new Date()
): Promise<GlobalMonthlyChargeGenerationResult> {
	const [students, academicTerms] = await Promise.all([
		prisma.student.findMany({
			where: {
				status: 'ACTIVE'
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				isBecado: true,
				isRecursante: true,
				locationId: true
			}
		}),

		prisma.academicTerm.findMany({
			where: {
				active: true,
				startDate: {
					lte: now
				},
				endDate: {
					gte: now
				}
			},
			select: {
				id: true,
				locationId: true,
				year: true,
				startDate: true
			},
			orderBy: [
				{
					year: 'desc'
				},
				{
					startDate: 'desc'
				}
			]
		})
	]);

	let processedStudents = 0;
	let createdCharges = 0;
	let skippedCharges = 0;
	let studentsWithoutAcademicTerm = 0;

	const errors: GlobalMonthlyChargeGenerationResult['errors'] = [];

	for (const student of students) {
		const academicTerm =
			academicTerms.find(
				(term) => term.locationId !== null && term.locationId === student.locationId
			) ?? academicTerms.find((term) => term.locationId === null);

		if (!academicTerm) {
			studentsWithoutAcademicTerm += 1;
			continue;
		}

		try {
			const result = await generateMissingMonthlyCharges(
				student.id,
				student.firstName,
				student.lastName,
				student.isBecado,
				student.isRecursante,
				academicTerm.id,
				null,
				now
			);

			processedStudents += 1;
			createdCharges += result.created;
			skippedCharges += result.skipped;
		} catch (cause) {
			errors.push({
				studentId: student.id,
				message: cause instanceof Error ? cause.message : 'Error desconocido'
			});
		}
	}

	return {
		processedStudents,
		createdCharges,
		skippedCharges,
		studentsWithoutAcademicTerm,
		errors
	};
}
