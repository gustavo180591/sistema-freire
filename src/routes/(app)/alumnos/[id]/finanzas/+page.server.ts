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
import { studentFinancialSummaryService } from '$lib/server/financial/student-financial-summary-service';
import { studentTypeService } from '$lib/server/financial/student-type-service';
import {
	getScholarshipLifecycle,
	reinstateScholarshipManually,
	startScholarshipNegotiation,
	resolveScholarshipNegotiation
} from '$lib/server/financial/scholarship-lifecycle-service';
import { checkPermission, requirePermission } from '$lib/server/auth/permissions-granular';

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

			// Calcular pendiente correctamente (puede ser negativo para saldo a favor)
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

			// Desglose financiero detallado
			const normalAmount = amount;
			const scholarshipAppliedValue = Number(charge.scholarshipApplied);
			const discountAppliedValue = Number(charge.discountApplied);
			const lateFeeAppliedValue = Number(charge.lateFeeApplied);
			const paidAmountValue = Number(charge.paidAmount);

			// Buscar recibo asociado al cargo
			const allocation = await prisma.paymentAllocation.findFirst({
				where: { chargeId: charge.id },
				include: { payment: { include: { receipt: { select: { id: true } } } } },
				orderBy: { createdAt: 'desc' }
			});
			const receiptId = allocation?.payment?.receipt?.id || null;

			return {
				id: charge.id,
				concept: charge.concept.name,
				conceptCode: charge.concept.code,
				period: charge.periodLabel,
				normalAmount,
				scholarshipApplied: scholarshipAppliedValue,
				discountApplied: discountAppliedValue,
				lateFeeApplied: lateFeeAppliedValue,
				finalAmount,
				paid: paidAmountValue,
				pending,
				status: charge.status,
				benefitType: charge.benefitType,
				benefitReason: charge.benefitReason,
				chargeType,
				scholarshipLost,
				isOverdue,
				receiptId,
				dueDate: dueDate ? dueDate.toISOString() : null
			};
		})
	);

	const totalDebt = charges.reduce((acc, charge) => acc + charge.pending, 0);

	const totalPaid = student.payments.reduce((acc, payment) => acc + Number(payment.amount), 0);

	// Determinar si es saldo a favor o deuda pendiente
	const hasCredit = totalDebt < 0;
	const financialLabel = hasCredit ? 'Saldo a favor' : 'Deuda total';
	const financialAmount = Math.abs(totalDebt);

	// Obtener resumen financiero base para estado de bloqueo
	const financialSummary = await studentFinancialSummaryService.getStudentFinancialSummary(
		student.id
	);

	// Obtener estado de bloqueo financiero
	const blockingStatus = await shouldBlockStudent(student.id);

	// ---------------------------------------------------------
	// Ciclo de vida de la beca
	// ---------------------------------------------------------

	const lifecycle = await getScholarshipLifecycle(student.id);

	const canManageScholarship = await checkPermission(locals.user, 'SCHOLARSHIP', 'update');

	const scholarshipLifecycle = {
		isBecado: lifecycle.isBecado,
		status: lifecycle.status,
		scholarship: lifecycle.scholarship
			? {
					id: lifecycle.scholarship.id,
					name: lifecycle.scholarship.name,
					percentage: Number(lifecycle.scholarship.percentage),
					active: lifecycle.scholarship.active,
					status: lifecycle.scholarship.status,
					startDate: lifecycle.scholarship.startDate.toISOString(),
					endDate: lifecycle.scholarship.endDate?.toISOString() ?? null,
					suspendedAt: lifecycle.scholarship.suspendedAt?.toISOString() ?? null,
					suspensionReason: lifecycle.scholarship.suspensionReason,
					reinstatedAt: lifecycle.scholarship.reinstatedAt?.toISOString() ?? null,

					history: lifecycle.scholarship.history.map((item) => ({
						id: item.id,
						previousStatus: item.previousStatus,
						newStatus: item.newStatus,
						previousPercentage:
							item.previousPercentage !== null ? Number(item.previousPercentage) : null,
						newPercentage: item.newPercentage !== null ? Number(item.newPercentage) : null,
						reason: item.reason,
						notes: item.notes,
						changedByName: item.changedByName,
						createdAt: item.createdAt.toISOString()
					})),

					negotiations: lifecycle.scholarship.negotiations.map((item) => ({
						id: item.id,
						status: item.status,
						previousPercentage: Number(item.previousPercentage),
						requestedPercentage:
							item.requestedPercentage !== null ? Number(item.requestedPercentage) : null,
						approvedPercentage:
							item.approvedPercentage !== null ? Number(item.approvedPercentage) : null,
						debtAtRequest: Number(item.debtAtRequest),
						reason: item.reason,
						conditions: item.conditions,
						resolutionNotes: item.resolutionNotes,
						requestedAt: item.requestedAt.toISOString(),
						resolvedAt: item.resolvedAt?.toISOString() ?? null
					}))
				}
			: null
	};

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
			hasCredit,
			financialLabel,
			financialAmount,
			pendingCharges: charges.filter((c) => c.pending > 0).length,
			hasScholarship:
				lifecycle.status !== null && !['CANCELLED', 'EXPIRED'].includes(lifecycle.status),
			blocked: blockingStatus.isBlocked,
			blockingThreshold: blockingStatus.blockingThreshold,
			blockingReason: blockingStatus.reason
		},
		charges,
		scholarshipLifecycle,
		canManageScholarship
	};
};

export const actions: Actions = {
	startScholarshipNegotiation: async ({ params, locals, request }) => {
		await requireFinancialAccess(locals.user, params.id);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		await requirePermission(locals.user, 'SCHOLARSHIP', 'update');

		const data = await request.formData();

		const reason = data.get('reason')?.toString().trim() ?? '';
		const conditions = data.get('conditions')?.toString().trim() ?? '';

		if (!reason) {
			return {
				error: 'Ingresá el motivo de la negociación'
			};
		}

		try {
			await startScholarshipNegotiation(
				params.id,
				{
					reason,
					conditions: conditions || null
				},
				{
					userId: locals.user.id,
					userName: `${locals.user.firstName} ${locals.user.lastName}`
				}
			);

			return {
				success: true,
				message: 'Negociación de beca iniciada correctamente'
			};
		} catch (error) {
			console.error('Error al iniciar negociación de beca:', error);

			return {
				error: error instanceof Error ? error.message : 'No se pudo iniciar la negociación'
			};
		}
	},

	approveScholarshipNegotiation: async ({ params, locals, request }) => {
		await requireFinancialAccess(locals.user, params.id);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		await requirePermission(locals.user, 'SCHOLARSHIP', 'update');

		const data = await request.formData();

		const negotiationId = data.get('negotiationId')?.toString();

		const resolutionNotes = data.get('resolutionNotes')?.toString().trim() ?? '';

		if (!negotiationId) {
			return {
				error: 'Negociación no identificada'
			};
		}

		const negotiation = await prisma.scholarshipNegotiation.findFirst({
			where: {
				id: negotiationId,
				studentId: params.id
			},
			select: {
				id: true
			}
		});

		if (!negotiation) {
			return {
				error: 'La negociación no pertenece a este alumno'
			};
		}

		try {
			await resolveScholarshipNegotiation(
				negotiationId,
				{
					approved: true,
					resolutionNotes: resolutionNotes || null
				},
				{
					userId: locals.user.id,
					userName: `${locals.user.firstName} ${locals.user.lastName}`
				}
			);

			return {
				success: true,
				message: 'Beca recuperada correctamente mediante negociación'
			};
		} catch (error) {
			console.error('Error al aprobar negociación de beca:', error);

			return {
				error: error instanceof Error ? error.message : 'No se pudo aprobar la negociación'
			};
		}
	},

	rejectScholarshipNegotiation: async ({ params, locals, request }) => {
		await requireFinancialAccess(locals.user, params.id);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		await requirePermission(locals.user, 'SCHOLARSHIP', 'update');

		const data = await request.formData();

		const negotiationId = data.get('negotiationId')?.toString();

		const resolutionNotes = data.get('resolutionNotes')?.toString().trim() ?? '';

		if (!negotiationId) {
			return {
				error: 'Negociación no identificada'
			};
		}

		if (!resolutionNotes) {
			return {
				error: 'Indicá el motivo por el cual se rechaza la recuperación'
			};
		}

		const negotiation = await prisma.scholarshipNegotiation.findFirst({
			where: {
				id: negotiationId,
				studentId: params.id
			},
			select: {
				id: true
			}
		});

		if (!negotiation) {
			return {
				error: 'La negociación no pertenece a este alumno'
			};
		}

		try {
			await resolveScholarshipNegotiation(
				negotiationId,
				{
					approved: false,
					resolutionNotes
				},
				{
					userId: locals.user.id,
					userName: `${locals.user.firstName} ${locals.user.lastName}`
				}
			);

			return {
				success: true,
				message: 'Negociación rechazada. La beca continúa suspendida'
			};
		} catch (error) {
			console.error('Error al rechazar negociación de beca:', error);

			return {
				error: error instanceof Error ? error.message : 'No se pudo rechazar la negociación'
			};
		}
	},

	changeStudentType: async ({ params, locals, request }) => {
		await requireFinancialAccess(locals.user, params.id);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const newType = data.get('newType')?.toString() as 'NORMAL' | 'BECADO' | 'RECURSANTE';
		const reason = data.get('reason')?.toString();
		const recalculateCharges = data.get('recalculateCharges')?.toString() === 'true';

		if (!newType || !reason) {
			return { error: 'Tipo de alumno y motivo son requeridos' };
		}

		const validTypes = ['NORMAL', 'BECADO', 'RECURSANTE'];
		if (!validTypes.includes(newType)) {
			return { error: 'Tipo de alumno inválido' };
		}

		try {
			/*
			 * Si estaba suspendido por mora y Secretaría/Finanzas
			 * vuelve a seleccionar BECADO, se reactiva formalmente
			 * la beca y el motivo queda auditado.
			 *
			 * No se recalculan cargos ya emitidos.
			 */
			if (newType === 'BECADO') {
				const lifecycle = await getScholarshipLifecycle(params.id);

				if (lifecycle.status === 'SUSPENDED_DEBT' || lifecycle.status === 'NEGOTIATION') {
					await requirePermission(locals.user, 'SCHOLARSHIP', 'update');

					await reinstateScholarshipManually(params.id, reason, {
						userId: locals.user.id,
						userName: `${locals.user.firstName} ${locals.user.lastName}`
					});

					return {
						success: true,
						message: 'La beca fue reactivada correctamente'
					};
				}
			}

			await studentTypeService.changeStudentType({
				studentId: params.id,
				newType,
				reason,
				userId: locals.user.id,
				userName: `${locals.user.firstName} ${locals.user.lastName}`,
				recalculateCharges
			});

			return { success: true, message: 'Tipo de alumno actualizado correctamente' };
		} catch (error) {
			console.error('Error al cambiar tipo de alumno:', error);
			return { error: 'Error al cambiar tipo de alumno' };
		}
	},

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

			// Log recalculation for audit
			await prisma.financialMovement.create({
				data: {
					studentId: student.id,
					movementType: 'ADJUSTMENT',
					entityType: 'StudentCharge',
					entityId: charge.id,
					description: `Recálculo manual de cuota pendiente. Tipo actual: ${student.isBecado ? 'BECADO' : student.isRecursante ? 'RECURSANTE' : 'NORMAL'}`,
					amount: 0,
					balanceBefore: currentFinalAmount,
					balanceAfter: correctFinalAmount,
					metadata: {
						previousAmount: currentAmount,
						newAmount: correctBaseAmount,
						previousFinalAmount: currentFinalAmount,
						newFinalAmount: correctFinalAmount,
						periodLabel: charge.periodLabel,
						isBecado: student.isBecado,
						isRecursante: student.isRecursante
					},
					userId: locals.user?.id || 'system'
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
	},

	editCharge: async ({ params, locals, request }) => {
		await requireFinancialAccess(locals.user, params.id);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const chargeId = data.get('chargeId')?.toString();
		const paidAmountStr = data.get('paidAmount')?.toString();
		const chargeType = data.get('chargeType')?.toString() as 'NORMAL' | 'BECADO' | 'RECURSANTE';

		if (!chargeId || !paidAmountStr || !chargeType) {
			return { error: 'Todos los campos son requeridos' };
		}

		const paidAmount = Number(paidAmountStr);

		if (isNaN(paidAmount) || paidAmount < 0) {
			return { error: 'Importes inválidos' };
		}

		if (!['NORMAL', 'BECADO', 'RECURSANTE'].includes(chargeType)) {
			return { error: 'Tipo de cuota inválido' };
		}

		const charge = await prisma.studentCharge.findFirst({
			where: { id: chargeId, studentId: params.id },
			include: { concept: true }
		});

		if (!charge) {
			return { error: 'Cargo no encontrado' };
		}

		try {
			const previousFinalAmount = Number(charge.finalAmount);
			const previousPaidAmount = Number(charge.paidAmount);

			// Determinar flags de tipo de cuota
			const isBecado = chargeType === 'BECADO';
			const isRecursante = chargeType === 'RECURSANTE';

			let finalAmount: number;
			let benefitType: string | null = null;
			let benefitReason = 'Normal';
			let discountApplied = 0;
			let scholarshipApplied = 0;

			if (charge.concept.code === 'CUOTA_MENSUAL') {
				const benefitsConfig = await getBenefitsConfig(prisma);
				const periodParts = charge.periodLabel.split('-');
				const month = periodParts.length === 2 ? parseInt(periodParts[1], 10) : null;

				const benefitCalculation = calculateChargeBenefit(
					new Decimal(benefitsConfig.normalFeeAmount),
					{ isBecado, isRecursante },
					charge.installmentNumber,
					isNaN(month as number) ? null : month,
					benefitsConfig
				);

				finalAmount = Number(benefitCalculation.finalAmount);
				benefitType = benefitCalculation.benefitType;
				benefitReason = benefitCalculation.benefitReason || 'Normal';
				discountApplied = Number(benefitCalculation.discountApplied || 0);
				scholarshipApplied = Number(benefitCalculation.scholarshipApplied || 0);
			} else {
				finalAmount = previousFinalAmount;
			}

			let newStatus = charge.status;
			if (paidAmount === 0) {
				newStatus = 'PENDING';
			} else if (paidAmount >= finalAmount) {
				newStatus = 'PAID';
			} else {
				newStatus = 'PARTIAL';
			}

			const updateData: any = {
				paidAmount: new Decimal(paidAmount),
				status: newStatus
			};

			if (charge.concept.code === 'CUOTA_MENSUAL') {
				updateData.finalAmount = new Decimal(finalAmount);
				updateData.benefitType = benefitType;
				updateData.benefitReason = benefitReason;
				updateData.discountApplied = new Decimal(discountApplied);
				updateData.scholarshipApplied = new Decimal(scholarshipApplied);
			}

			await prisma.studentCharge.update({
				where: { id: chargeId },
				data: updateData
			});

			// Log audit movement
			await prisma.financialMovement.create({
				data: {
					studentId: params.id,
					movementType: 'ADJUSTMENT',
					entityType: 'StudentCharge',
					entityId: chargeId,
					description: `Edición manual de cargo: tipo cambiado a ${chargeType}`,
					amount: new Decimal(finalAmount).minus(new Decimal(previousFinalAmount)),
					balanceBefore: previousFinalAmount - previousPaidAmount,
					balanceAfter: finalAmount - paidAmount,
					metadata: {
						concept: charge.concept.name,
						periodLabel: charge.periodLabel,
						previousFinalAmount,
						newFinalAmount: finalAmount,
						previousPaidAmount,
						newPaidAmount: paidAmount,
						previousStatus: charge.status,
						newStatus,
						chargeType
					},
					userId: locals.user.id
				}
			});

			return { success: true, message: 'Cargo actualizado correctamente' };
		} catch (error) {
			console.error('Error al editar cargo:', error);
			return { error: 'Error al editar cargo' };
		}
	}
};
