import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireStudentFinancialReadAccess } from '$lib/server/auth/financial-access';
import { Decimal } from '@prisma/client/runtime/library';
import {
	getBenefitsConfig,
	calculateChargeBenefit
} from '$lib/server/financial/benefit-calculator';
import { Prisma } from '@prisma/client';
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
	listStudentFinancialHistory,
	registerHistoricalPaidEntry
} from '$lib/server/financial/student-financial-history-service';
import {
	getScholarshipLifecycle,
	reinstateScholarshipManually,
	startScholarshipNegotiation,
	resolveScholarshipNegotiation
} from '$lib/server/financial/scholarship-lifecycle-service';
import { checkPermission, requirePermission } from '$lib/server/auth/permissions-granular';
import { generateMissingMonthlyCharges } from '$lib/server/financial/monthly-charge-generation-service';
import { recalculatePendingStudentCharges } from '$lib/server/financial/pending-charge-recalculation-service';

/**
 * Genera cuotas mensuales faltantes desde el inicio del ciclo lectivo hasta el mes actual
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	await requireStudentFinancialReadAccess(locals.user, params.id);

	const student = await prisma.student.findUniqueOrThrow({
		where: { id: params.id },
		include: {
			career: true,
			location: true,
			academicHistory: {
				select: {
					year: true
				},
				orderBy: {
					year: 'desc'
				}
			},
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

	const financialHistory = await listStudentFinancialHistory(student.id);

	const chargeYears = student.studentCharges
		.map((charge) => {
			const match = charge.periodLabel.match(/^(\d{4})-/);

			return match ? Number(match[1]) : null;
		})
		.filter((year): year is number => year !== null);

	const knownInstitutionYears = [
		...new Set([...student.academicHistory.map((history) => history.year), ...chargeYears])
	];

	const currentInstitutionYear = Number(
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			timeZone: 'America/Argentina/Cordoba'
		}).format(new Date())
	);

	const firstInstitutionYear =
		knownInstitutionYears.length > 0 ? Math.min(...knownInstitutionYears) : currentInstitutionYear;

	const lastKnownInstitutionYear =
		knownInstitutionYears.length > 0 ? Math.max(...knownInstitutionYears) : currentInstitutionYear;

	/*
	 * Un alumno ACTIVE pertenece a la institución
	 * hasta el año institucional actual, aunque todavía
	 * no tenga cargos o historial cargados en cada año.
	 *
	 * Para alumnos inactivos/graduados conservamos como
	 * último año el último año efectivamente conocido.
	 */
	const lastInstitutionYear =
		student.status === 'ACTIVE'
			? Math.max(currentInstitutionYear, lastKnownInstitutionYear)
			: lastKnownInstitutionYear;

	const institutionYears = Array.from(
		{
			length: lastInstitutionYear - firstInstitutionYear + 1
		},
		(_, index) => lastInstitutionYear - index
	);

	const charges = await Promise.all(
		student.studentCharges.map(async (charge) => {
			const scholarshipApplied = Number(charge.scholarshipApplied);
			let amount = Number(charge.amount);
			let finalAmount = Number(charge.finalAmount);

			// Para cuotas pendientes usar la configuración actual,
			// respetando el tipo específico guardado en cada cargo.
			//
			// Esto permite que una edición manual NORMAL/BECADO/RECURSANTE
			// no sea reemplazada visualmente por el tipo general del alumno.
			if (charge.status !== 'PAID' && charge.concept.code === 'CUOTA_MENSUAL') {
				const effectiveChargeType =
					charge.benefitType === 'SCHOLARSHIP'
						? 'BECADO'
						: charge.benefitType === 'RECURSANT'
							? 'RECURSANTE'
							: charge.benefitType === 'NONE'
								? 'NORMAL'
								: student.isBecado
									? 'BECADO'
									: student.isRecursante
										? 'RECURSANTE'
										: 'NORMAL';

				amount = benefitsConfig.normalFeeAmount;

				finalAmount =
					effectiveChargeType === 'BECADO'
						? benefitsConfig.becadoFeeAmount
						: effectiveChargeType === 'RECURSANTE'
							? benefitsConfig.recursantFeeAmount
							: benefitsConfig.normalFeeAmount;
			}

			// Calcular pendiente correctamente (puede ser negativo para saldo a favor)
			const pending = finalAmount - Number(charge.paidAmount);

			// Determinar el tipo efectivo guardado en este cargo.
			// Un cambio posterior del tipo general del alumno no debe alterar
			// cómo se identifica históricamente esta cuota.
			let chargeType = 'Cuota Normal';
			let scholarshipLost = false;

			if (charge.concept.code === 'CUOTA_MENSUAL') {
				if (charge.benefitType === 'SCHOLARSHIP') {
					chargeType = 'Cuota Becado';
				} else if (charge.benefitType === 'RECURSANT') {
					chargeType = 'Cuota Recursante';
				} else if (charge.benefitType === 'NONE') {
					chargeType = 'Cuota Normal';
				} else {
					// Compatibilidad con cargos históricos que no tengan benefitType.
					const periodParts = charge.periodLabel.split('-');

					if (periodParts.length === 2) {
						const month = parseInt(periodParts[1], 10);

						if (!isNaN(month) && benefitsConfig.benefitsMonths.includes(month)) {
							if (student.isBecado) {
								if (scholarshipApplied === 0 && amount > finalAmount) {
									chargeType = 'Beca perdida';
									scholarshipLost = true;
								} else {
									chargeType = 'Cuota Becado';
								}
							} else if (student.isRecursante) {
								chargeType = 'Cuota Recursante';
							}
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
				include: {
					payment: {
						select: {
							paidAt: true,
							method: true,
							receipt: {
								select: {
									id: true
								}
							}
						}
					}
				},
				orderBy: { createdAt: 'desc' }
			});

			const receiptId = allocation?.payment?.receipt?.id || null;
			const paymentDate = allocation?.payment?.paidAt?.toISOString() ?? null;
			const paymentMethod = allocation?.payment?.method ?? null;

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
				paymentDate,
				paymentMethod,
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

	const canManageFinancialHistory = await checkPermission(locals.user, 'STUDENT_CHARGE', 'update');

	const [canCreateCharges, canUpdateFinancialBlock] = await Promise.all([
		checkPermission(locals.user, 'STUDENT_CHARGE', 'create'),
		checkPermission(locals.user, 'FINANCIAL_BLOCK', 'update')
	]);

	const canSynchronizeFinancialState =
		canManageScholarship && canCreateCharges && canUpdateFinancialBlock;

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
		institutionYears,
		charges,
		financialHistory,
		canManageFinancialHistory,
		feeAmounts: {
			NORMAL: benefitsConfig.normalFeeAmount,
			BECADO: benefitsConfig.becadoFeeAmount,
			RECURSANTE: benefitsConfig.recursantFeeAmount
		},
		scholarshipLifecycle,
		canManageScholarship,
		canSynchronizeFinancialState
	};
};

export const actions: Actions = {
	saveHistoricalPayment: async ({ params, locals, request }) => {
		await requireStudentFinancialReadAccess(locals.user, params.id);

		if (!locals.user) {
			return {
				error: 'No autenticado'
			};
		}

		await requirePermission(locals.user, 'STUDENT_CHARGE', 'update');

		const formData = await request.formData();

		const academicYear = Number(formData.get('academicYear'));

		const concept = formData.get('concept')?.toString() as 'INSCRIPCION' | 'CUOTA_MENSUAL';

		const monthRaw = formData.get('month')?.toString();

		const month = monthRaw ? Number(monthRaw) : null;

		const amount = Number(formData.get('amount'));

		const paidAt = formData.get('paidAt')?.toString().trim() || null;

		const paymentMethodRaw = formData.get('paymentMethod')?.toString().trim();

		const paymentMethod = paymentMethodRaw
			? (paymentMethodRaw as
					| 'CASH'
					| 'BANK_TRANSFER'
					| 'DEBIT_CARD'
					| 'CREDIT_CARD'
					| 'QR'
					| 'SCHOLARSHIP')
			: null;

		const notes = formData.get('notes')?.toString().trim() || null;

		try {
			const result = await registerHistoricalPaidEntry(
				{
					studentId: params.id,
					academicYear,
					concept,
					month,
					amount,
					paidAt,
					paymentMethod,
					notes
				},
				{
					userId: locals.user.id,
					userName: `${locals.user.firstName} ${locals.user.lastName}`
				}
			);

			return {
				success: true,
				message: `Pago histórico ${result.periodKey} registrado correctamente`
			};
		} catch (error) {
			console.error('Error al guardar pago histórico:', error);

			return {
				error: error instanceof Error ? error.message : 'No se pudo registrar el pago histórico'
			};
		}
	},

	synchronizeFinancialState: async ({ params, locals }) => {
		await requireStudentFinancialReadAccess(locals.user, params.id);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		/*
		 * Esta operación puede:
		 * - crear cuotas faltantes;
		 * - suspender una beca vencida;
		 * - actualizar el estado de bloqueo financiero.
		 *
		 * Por eso requiere capacidades de gestión y nunca se ejecuta
		 * automáticamente desde el load de la página.
		 */
		await requirePermission(locals.user, 'STUDENT_CHARGE', 'create');
		await requirePermission(locals.user, 'SCHOLARSHIP', 'update');
		await requirePermission(locals.user, 'FINANCIAL_BLOCK', 'update');

		const student = await prisma.student.findUnique({
			where: { id: params.id },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				isBecado: true,
				isRecursante: true,
				locationId: true
			}
		});

		if (!student) {
			return { error: 'Alumno no encontrado' };
		}

		const activeAcademicTerm = await prisma.academicTerm.findFirst({
			where: {
				active: true,
				...(student.locationId ? { locationId: student.locationId } : {})
			},
			select: {
				id: true
			}
		});

		try {
			const scholarshipResult = await checkAndExpireScholarshipsForStudent(
				student.id,
				locals.user.id,
				`${locals.user.firstName} ${locals.user.lastName}`
			);

			let chargeResult = {
				created: 0,
				skipped: 0
			};

			if (activeAcademicTerm) {
				chargeResult = await generateMissingMonthlyCharges(
					student.id,
					student.firstName,
					student.lastName,
					student.isBecado,
					student.isRecursante,
					activeAcademicTerm.id,
					locals.user.id
				);
			}

			await updateStudentFinancialBlockStatus(student.id);

			return {
				success: true,
				message: 'Estado financiero sincronizado correctamente',
				createdCharges: chargeResult.created,
				skippedCharges: chargeResult.skipped,
				scholarshipSuspended: scholarshipResult.scholarshipLost
			};
		} catch (error) {
			console.error('Error al sincronizar estado financiero:', error);

			return {
				error:
					error instanceof Error ? error.message : 'No se pudo sincronizar el estado financiero'
			};
		}
	},

	startScholarshipNegotiation: async ({ params, locals, request }) => {
		await requireStudentFinancialReadAccess(locals.user, params.id);

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
		await requireStudentFinancialReadAccess(locals.user, params.id);

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
		await requireStudentFinancialReadAccess(locals.user, params.id);

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
		await requireStudentFinancialReadAccess(locals.user, params.id);
		await requirePermission(locals.user, 'STUDENT_CHARGE', 'update');

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const newType = data.get('newType')?.toString() as 'NORMAL' | 'BECADO' | 'RECURSANTE';
		const reason = data.get('reason')?.toString();

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

					await recalculatePendingStudentCharges({
						studentId: params.id,
						userId: locals.user.id,
						userName: `${locals.user.firstName} ${locals.user.lastName}`,
						source: 'SCHOLARSHIP_REINSTATEMENT',
						reason
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
				userName: `${locals.user.firstName} ${locals.user.lastName}`
			});

			return { success: true, message: 'Tipo de alumno actualizado correctamente' };
		} catch (error) {
			console.error('Error al cambiar tipo de alumno:', error);
			return { error: 'Error al cambiar tipo de alumno' };
		}
	},

	editCharge: async ({ params, locals, request }) => {
		await requireStudentFinancialReadAccess(locals.user, params.id);
		await requirePermission(locals.user, 'STUDENT_CHARGE', 'update');

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

			let configuredNormalAmount: number | null = null;

			if (charge.concept.code === 'CUOTA_MENSUAL') {
				const benefitsConfig = await getBenefitsConfig(prisma);

				configuredNormalAmount = benefitsConfig.normalFeeAmount;

				if (chargeType === 'BECADO') {
					finalAmount = benefitsConfig.becadoFeeAmount;
					benefitType = 'SCHOLARSHIP';
					benefitReason = 'Cuota Becado';
					scholarshipApplied = benefitsConfig.normalFeeAmount - benefitsConfig.becadoFeeAmount;
					discountApplied = 0;
				} else if (chargeType === 'RECURSANTE') {
					finalAmount = benefitsConfig.recursantFeeAmount;
					benefitType = 'RECURSANT';
					benefitReason = 'Cuota Recursante';
					discountApplied = benefitsConfig.normalFeeAmount - benefitsConfig.recursantFeeAmount;
					scholarshipApplied = 0;
				} else {
					finalAmount = benefitsConfig.normalFeeAmount;
					benefitType = 'NONE';
					benefitReason = 'Cuota Normal';
					discountApplied = 0;
					scholarshipApplied = 0;
				}
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
				updateData.amount = new Decimal(configuredNormalAmount ?? finalAmount);
				updateData.finalAmount = new Decimal(finalAmount);
				updateData.benefitType = benefitType;
				updateData.benefitReason = benefitReason;
				updateData.discountApplied = new Decimal(discountApplied);
				updateData.scholarshipApplied = new Decimal(scholarshipApplied);
				updateData.ruleSnapshot = {
					source: 'MANUAL_CHARGE_EDIT',
					chargeType,
					normalFeeAmount: configuredNormalAmount,
					finalAmount,
					updatedAt: new Date().toISOString(),
					updatedBy: locals.user.id
				};
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
