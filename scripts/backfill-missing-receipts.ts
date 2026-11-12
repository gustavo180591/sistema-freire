import 'dotenv/config';

import { Decimal } from '@prisma/client/runtime/library';

import { prisma } from '../src/lib/server/db/prisma';
import { createReceiptForPayment } from '../src/lib/server/financial/receipt-service';

const ARG_EXECUTE = '--execute';
const EXECUTION_CONFIRMATION = 'GENERAR_RECIBOS_HISTORICOS';
const INSTITUTION_TIME_ZONE = 'America/Argentina/Cordoba';

const execute = process.argv.includes(ARG_EXECUTE);

const currencyFormatter = new Intl.NumberFormat('es-AR', {
	style: 'currency',
	currency: 'ARS',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	timeZone: INSTITUTION_TIME_ZONE
});

type Candidate = Awaited<ReturnType<typeof getCandidates>>[number];

function formatMoney(value: Decimal | number): string {
	return currencyFormatter.format(Number(value));
}

function formatDate(value: Date): string {
	return dateFormatter.format(value);
}

function sumAllocations(candidate: Candidate): Decimal {
	return candidate.allocations.reduce(
		(total, allocation) => total.add(allocation.amount),
		new Decimal(0)
	);
}

function getPaymentConcepts(candidate: Candidate): string[] {
	return candidate.allocations.map((allocation) => {
		if (!allocation.charge) {
			return 'ORIGEN NO SOPORTADO';
		}

		return `${allocation.charge.concept.name} · ${allocation.charge.periodLabel ?? 'Sin período'} · ${formatMoney(
			allocation.amount
		)}`;
	});
}

async function getCandidates() {
	return prisma.payment.findMany({
		where: {
			receiptId: null,
			isCancelled: false
		},
		include: {
			student: {
				include: {
					location: {
						include: {
							receiptConfig: true
						}
					}
				}
			},
			allocations: {
				include: {
					charge: {
						include: {
							concept: true
						}
					},
					installment: true
				}
			},
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			}
		},
		orderBy: [{ paidAt: 'asc' }, { id: 'asc' }]
	});
}

function validateCandidates(candidates: Candidate[]): void {
	const errors: string[] = [];

	for (const payment of candidates) {
		if (payment.allocations.length === 0) {
			errors.push(`${payment.id}: no tiene imputaciones`);
			continue;
		}

		if (!payment.student.locationId || !payment.student.location) {
			errors.push(`${payment.id}: el alumno no tiene sede asignada`);
		}

		if (!payment.student.location?.receiptConfig) {
			errors.push(
				`${payment.id}: no existe configuración de recibos para ${
					payment.student.location?.name ?? 'sede desconocida'
				}`
			);
		}

		const unsupportedAllocations = payment.allocations.filter(
			(allocation) =>
				allocation.installmentId !== null ||
				allocation.chargeId === null ||
				allocation.charge === null
		);

		if (unsupportedAllocations.length > 0) {
			errors.push(
				`${payment.id}: contiene ${unsupportedAllocations.length} imputación(es) no soportada(s)`
			);
		}

		const allocatedAmount = sumAllocations(payment);

		if (!allocatedAmount.equals(payment.amount)) {
			errors.push(
				`${payment.id}: pago ${formatMoney(payment.amount)} != imputado ${formatMoney(
					allocatedAmount
				)}`
			);
		}
	}

	if (errors.length > 0) {
		console.error('\n❌ El backfill no puede continuar porque se encontraron inconsistencias:\n');

		for (const error of errors) {
			console.error(`- ${error}`);
		}

		throw new Error(`Se encontraron ${errors.length} inconsistencia(s)`);
	}
}

function groupCandidatesByLocation(candidates: Candidate[]) {
	const groups = new Map<string, Candidate[]>();

	for (const candidate of candidates) {
		const locationId = candidate.student.locationId;

		if (!locationId) {
			continue;
		}

		const current = groups.get(locationId) ?? [];
		current.push(candidate);
		groups.set(locationId, current);
	}

	for (const [, payments] of groups) {
		payments.sort((a, b) => {
			const dateDifference = a.paidAt.getTime() - b.paidAt.getTime();

			if (dateDifference !== 0) {
				return dateDifference;
			}

			return a.id.localeCompare(b.id);
		});
	}

	return groups;
}

function printDryRun(candidates: Candidate[]): void {
	const groups = groupCandidatesByLocation(candidates);
	let grandTotal = new Decimal(0);
	let totalAllocations = 0;

	console.log('\n============================================================');
	console.log(' RECUPERACIÓN DE RECIBOS HISTÓRICOS - DRY RUN');
	console.log('============================================================');
	console.log('No se modificará ningún dato.\n');

	const orderedGroups = [...groups.values()].sort((a, b) => {
		const locationA = a[0]?.student.location?.name ?? '';
		const locationB = b[0]?.student.location?.name ?? '';

		return locationA.localeCompare(locationB, 'es');
	});

	for (const payments of orderedGroups) {
		const firstPayment = payments[0];

		if (!firstPayment?.student.location?.receiptConfig) {
			continue;
		}

		const location = firstPayment.student.location;
		const config = location.receiptConfig;
		let plannedReceiptNumber = config.lastReceiptNumber;

		const locationTotal = payments.reduce(
			(total, payment) => total.add(payment.amount),
			new Decimal(0)
		);

		console.log(`\nSEDE: ${location.name}`);
		console.log(`Punto de venta: ${config.pointOfSale}`);
		console.log(`Último recibo actual: ${config.lastReceiptNumber}`);
		console.log(`Pagos a recuperar: ${payments.length}`);
		console.log(`Total: ${formatMoney(locationTotal)}`);
		console.log('------------------------------------------------------------');

		for (const payment of payments) {
			plannedReceiptNumber += 1;
			grandTotal = grandTotal.add(payment.amount);
			totalAllocations += payment.allocations.length;

			const studentName =
				`${payment.student.lastName}, ${payment.student.firstName}`.toLocaleUpperCase('es-AR');

			console.log(`\n${config.pointOfSale}-${String(plannedReceiptNumber).padStart(8, '0')}`);
			console.log(`Payment: ${payment.id}`);
			console.log(`Alumno: ${studentName}`);
			console.log(`Fecha de pago: ${formatDate(payment.paidAt)}`);
			console.log(`Importe: ${formatMoney(payment.amount)}`);
			console.log(`Medio: ${payment.method}`);
			console.log(`Imputaciones: ${payment.allocations.length}`);

			for (const concept of getPaymentConcepts(payment)) {
				console.log(`  - ${concept}`);
			}
		}

		console.log(
			`\nNumeración proyectada: ${config.pointOfSale}-${String(
				config.lastReceiptNumber + 1
			).padStart(8, '0')} → ${config.pointOfSale}-${String(plannedReceiptNumber).padStart(8, '0')}`
		);
	}

	console.log('\n============================================================');
	console.log(' RESUMEN');
	console.log('============================================================');
	console.log(`Recibos a crear: ${candidates.length}`);
	console.log(`Imputaciones: ${totalAllocations}`);
	console.log(`Importe total: ${formatMoney(grandTotal)}`);
	console.log('\nNo se modificó ningún dato.');
	console.log('============================================================\n');
}

async function validatePaymentImmediatelyBeforeExecution(paymentId: string) {
	const payment = await prisma.payment.findUnique({
		where: {
			id: paymentId
		},
		include: {
			student: {
				include: {
					location: {
						include: {
							receiptConfig: true
						}
					}
				}
			},
			allocations: true
		}
	});

	if (!payment) {
		throw new Error(`${paymentId}: el pago ya no existe`);
	}

	if (payment.isCancelled) {
		throw new Error(`${paymentId}: el pago fue anulado`);
	}

	if (payment.receiptId) {
		return {
			status: 'ALREADY_HAS_RECEIPT' as const,
			payment
		};
	}

	if (payment.allocations.length === 0) {
		throw new Error(`${paymentId}: el pago quedó sin imputaciones`);
	}

	if (!payment.student.locationId || !payment.student.location) {
		throw new Error(`${paymentId}: el alumno quedó sin sede`);
	}

	if (!payment.student.location.receiptConfig) {
		throw new Error(
			`${paymentId}: la sede ${payment.student.location.name} quedó sin configuración de recibos`
		);
	}

	if (
		payment.allocations.some(
			(allocation) => allocation.installmentId !== null || allocation.chargeId === null
		)
	) {
		throw new Error(`${paymentId}: contiene una imputación no soportada`);
	}

	const allocatedAmount = payment.allocations.reduce(
		(total, allocation) => total.add(allocation.amount),
		new Decimal(0)
	);

	if (!allocatedAmount.equals(payment.amount)) {
		throw new Error(`${paymentId}: el importe del pago ya no coincide con sus imputaciones`);
	}

	return {
		status: 'READY' as const,
		payment
	};
}

async function executeBackfill(candidates: Candidate[]): Promise<void> {
	if (process.env.BACKFILL_CONFIRM !== EXECUTION_CONFIRMATION) {
		throw new Error(`Ejecución bloqueada. Definí BACKFILL_CONFIRM=${EXECUTION_CONFIRMATION}`);
	}

	console.log('\n============================================================');
	console.log(' EJECUCIÓN REAL DEL BACKFILL');
	console.log('============================================================');
	console.log(`Pagos candidatos: ${candidates.length}`);
	console.log('Cada pago será revalidado antes de emitir su recibo.\n');

	const groups = groupCandidatesByLocation(candidates);
	let createdCount = 0;
	let skippedCount = 0;
	let createdTotal = new Decimal(0);

	const orderedGroups = [...groups.values()].sort((a, b) => {
		const locationA = a[0]?.student.location?.name ?? '';
		const locationB = b[0]?.student.location?.name ?? '';

		return locationA.localeCompare(locationB, 'es');
	});

	for (const payments of orderedGroups) {
		for (const candidate of payments) {
			const validation = await validatePaymentImmediatelyBeforeExecution(candidate.id);

			if (validation.status === 'ALREADY_HAS_RECEIPT') {
				skippedCount += 1;

				console.log(
					`↷ ${candidate.id}: omitido porque ya posee recibo ${validation.payment.receiptId}`
				);

				continue;
			}

			const issuerId = validation.payment.userId ?? 'SYSTEM-BACKFILL';

			const receipt = await createReceiptForPayment(candidate.id, issuerId);

			const updatedPayment = await prisma.payment.findUnique({
				where: {
					id: candidate.id
				},
				select: {
					receiptId: true
				}
			});

			if (updatedPayment?.receiptId !== receipt.id) {
				throw new Error(
					`${candidate.id}: el recibo fue creado pero el pago no quedó correctamente vinculado`
				);
			}

			try {
				await prisma.auditLog.create({
					data: {
						action: 'CREATE',
						entityType: 'RECEIPT_BACKFILL',
						entityId: receipt.id,
						description: `Recibo histórico recuperado para pago ${candidate.id}`,
						userId: validation.payment.userId,
						metadata: {
							paymentId: candidate.id,
							originalPaidAt: candidate.paidAt.toISOString(),
							backfillExecutedAt: new Date().toISOString(),
							locationId: validation.payment.student.locationId,
							locationName: validation.payment.student.location?.name ?? null,
							receiptNumber: receipt.receiptNumber,
							receiptYear: receipt.receiptYear,
							amount: candidate.amount.toString()
						}
					}
				});
			} catch (auditError) {
				console.error(
					`⚠ ${candidate.id}: recibo creado, pero falló la auditoría del backfill`,
					auditError
				);
			}

			createdCount += 1;
			createdTotal = createdTotal.add(candidate.amount);

			console.log(
				`✓ ${candidate.id} → ${receipt.pointOfSale}-${String(receipt.receiptNumber).padStart(
					8,
					'0'
				)} · ${formatMoney(candidate.amount)} · pago ${formatDate(candidate.paidAt)}`
			);
		}
	}

	console.log('\n============================================================');
	console.log(' RESULTADO DEL BACKFILL');
	console.log('============================================================');
	console.log(`Recibos creados: ${createdCount}`);
	console.log(`Pagos omitidos por tener recibo: ${skippedCount}`);
	console.log(`Importe recuperado: ${formatMoney(createdTotal)}`);
	console.log('============================================================\n');
}

async function main() {
	const candidates = await getCandidates();

	if (candidates.length === 0) {
		console.log('No existen pagos activos sin recibo.');
		return;
	}

	validateCandidates(candidates);
	printDryRun(candidates);

	if (!execute) {
		return;
	}

	await executeBackfill(candidates);
}

main()
	.catch((error) => {
		console.error('\n❌ Error fatal en backfill de recibos:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
