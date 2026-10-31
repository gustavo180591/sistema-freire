import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '$lib/server/db/prisma';

const INSTITUTION_TIME_ZONE = 'America/Argentina/Cordoba';

const VALID_CONCEPTS = ['INSCRIPCION', 'CUOTA_MENSUAL'] as const;

const VALID_PAYMENT_METHODS = [
	'CASH',
	'BANK_TRANSFER',
	'DEBIT_CARD',
	'CREDIT_CARD',
	'QR',
	'SCHOLARSHIP'
] as const;

type HistoricalConcept = (typeof VALID_CONCEPTS)[number];

type HistoricalPaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export interface RegisterHistoricalPaidEntryInput {
	studentId: string;
	academicYear: number;
	concept: HistoricalConcept;
	month: number | null;
	amount: number;
	paidAt: string | null;
	paymentMethod: HistoricalPaymentMethod | null;
	notes: string | null;
}

interface FinancialHistoryActor {
	userId: string;
	userName: string;
}

function getCurrentInstitutionYear(): number {
	return Number(
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			timeZone: INSTITUTION_TIME_ZONE
		}).format(new Date())
	);
}

function parsePeriodYear(periodLabel: string): number | null {
	const match = periodLabel.match(/^(\d{4})-/);

	if (!match) {
		return null;
	}

	const year = Number(match[1]);

	return Number.isInteger(year) ? year : null;
}

function buildPeriodKey(
	academicYear: number,
	concept: HistoricalConcept,
	month: number | null
): string {
	if (concept === 'INSCRIPCION') {
		return `${academicYear}-INSCRIPCION`;
	}

	if (month === null || month < 1 || month > 12) {
		throw new Error('El mes de la cuota histórica es inválido');
	}

	return `${academicYear}-${String(month).padStart(2, '0')}`;
}

function parseHistoricalPaidAt(value: string | null): Date | null {
	if (!value) {
		return null;
	}

	const date = new Date(`${value}T12:00:00-03:00`);

	if (Number.isNaN(date.getTime())) {
		throw new Error('La fecha de pago histórica es inválida');
	}

	return date;
}

async function validateHistoricalYear(studentId: string, academicYear: number): Promise<void> {
	const currentYear = getCurrentInstitutionYear();

	if (!Number.isInteger(academicYear) || academicYear < 1900 || academicYear >= currentYear) {
		throw new Error('El historial financiero solo puede cargarse para años anteriores al actual');
	}

	const student = await prisma.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			status: true,
			academicHistory: {
				select: {
					year: true
				}
			},
			studentCharges: {
				select: {
					periodLabel: true
				}
			}
		}
	});

	if (!student) {
		throw new Error('Alumno no encontrado');
	}

	const knownYears = [
		...student.academicHistory.map((item) => item.year),
		...student.studentCharges
			.map((charge) => parsePeriodYear(charge.periodLabel))
			.filter((year): year is number => year !== null)
	];

	if (knownYears.length === 0) {
		throw new Error('No se pudo determinar el año de ingreso del alumno');
	}

	const firstInstitutionYear = Math.min(...knownYears);

	const lastInstitutionYear = student.status === 'ACTIVE' ? currentYear : Math.max(...knownYears);

	if (academicYear < firstInstitutionYear || academicYear > lastInstitutionYear) {
		throw new Error(
			'El año indicado no pertenece al período conocido del alumno en la institución'
		);
	}
}

export async function listStudentFinancialHistory(studentId: string) {
	const entries = await prisma.studentFinancialHistory.findMany({
		where: {
			studentId
		},
		orderBy: [
			{
				academicYear: 'desc'
			},
			{
				periodKey: 'desc'
			}
		]
	});

	return entries.map((entry) => ({
		id: entry.id,
		academicYear: entry.academicYear,
		periodKey: entry.periodKey,
		concept: entry.concept,
		month: entry.month,
		amount: Number(entry.amount),
		paidAmount: Number(entry.paidAmount),
		status: entry.status,
		paidAt: entry.paidAt?.toISOString() ?? null,
		paymentMethod: entry.paymentMethod,
		notes: entry.notes
	}));
}

export async function registerHistoricalPaidEntry(
	input: RegisterHistoricalPaidEntryInput,
	actor: FinancialHistoryActor
) {
	await validateHistoricalYear(input.studentId, input.academicYear);

	if (!VALID_CONCEPTS.includes(input.concept)) {
		throw new Error('Concepto financiero histórico inválido');
	}

	if (!Number.isFinite(input.amount) || input.amount <= 0) {
		throw new Error('El importe histórico debe ser mayor que cero');
	}

	if (input.paymentMethod !== null && !VALID_PAYMENT_METHODS.includes(input.paymentMethod)) {
		throw new Error('Medio de pago histórico inválido');
	}

	const periodKey = buildPeriodKey(input.academicYear, input.concept, input.month);

	const paidAt = parseHistoricalPaidAt(input.paidAt);

	return prisma.$transaction(async (tx) => {
		/*
		 * Si ya existe un StudentCharge real para este
		 * período, no duplicamos la información dentro
		 * del historial legado.
		 */
		const operationalCharge = await tx.studentCharge.findFirst({
			where: {
				studentId: input.studentId,
				periodLabel: periodKey,
				concept: {
					code: input.concept
				}
			},
			select: {
				id: true
			}
		});

		if (operationalCharge) {
			throw new Error(
				'Este período ya posee un cargo financiero real y no necesita un registro histórico adicional'
			);
		}

		const existing = await tx.studentFinancialHistory.findUnique({
			where: {
				studentId_periodKey: {
					studentId: input.studentId,
					periodKey
				}
			}
		});

		const amount = new Decimal(input.amount);

		const entry = await tx.studentFinancialHistory.upsert({
			where: {
				studentId_periodKey: {
					studentId: input.studentId,
					periodKey
				}
			},
			create: {
				studentId: input.studentId,
				academicYear: input.academicYear,
				periodKey,
				concept: input.concept,
				month: input.concept === 'CUOTA_MENSUAL' ? input.month : null,
				amount,
				paidAmount: amount,
				status: 'PAID',
				paidAt,
				paymentMethod: input.paymentMethod,
				notes: input.notes,
				createdByUserId: actor.userId
			},
			update: {
				academicYear: input.academicYear,
				concept: input.concept,
				month: input.concept === 'CUOTA_MENSUAL' ? input.month : null,
				amount,
				paidAmount: amount,
				status: 'PAID',
				paidAt,
				paymentMethod: input.paymentMethod,
				notes: input.notes
			}
		});

		await tx.auditLog.create({
			data: {
				userId: actor.userId,
				action: existing ? 'UPDATE' : 'CREATE',
				entityType: 'StudentFinancialHistory',
				entityId: entry.id,
				description: `${existing ? 'Actualización' : 'Registro'} de pago histórico ${periodKey} para alumno ${input.studentId}`,
				metadata: {
					studentId: input.studentId,
					academicYear: input.academicYear,
					periodKey,
					concept: input.concept,
					amount: input.amount,
					paidAt: input.paidAt,
					paymentMethod: input.paymentMethod,
					actorName: actor.userName
				} satisfies Prisma.InputJsonValue
			}
		});

		return {
			id: entry.id,
			periodKey: entry.periodKey
		};
	});
}
