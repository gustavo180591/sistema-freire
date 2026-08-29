/**
 * Payment Agreement Service - Phase 5.4 (Integrated Reports)
 *
 * Current Status:
 * - Schema and migration are applied to real database
 * - Service implements actual business logic for agreement lifecycle
 * - Methods are enabled for production use
 * - Permissions and ownership validation implemented
 * - Audit logging implemented
 *
 * Phase 2 Features:
 * - Create draft agreements with validation
 * - Activate agreements with validation
 * - Query agreements by student
 * - Generate agreement summaries
 * - Record audit events
 * - Validate permissions and ownership
 *
 * Phase 3 Features:
 * - Register payments against agreement installments
 * - Integrate with Payment and PaymentAllocation
 * - Update installment status (PENDING -> PARTIAL -> PAID)
 * - Update agreement totals (paidAmount, pendingAmount)
 * - Validate payment amounts and installment state
 * - Record payment events and audit logs
 *
 * Phase 5.1 Features:
 * - Mark overdue installments (PENDING/PARTIAL -> OVERDUE)
 * - Evaluate agreement completion (all installments PAID -> COMPLETED)
 * - Evaluate agreement default (2+ consecutive overdue or >50% overdue -> DEFAULTED)
 * - Register events and audit logs for status changes
 * - Transactional consistency
 *
 * Phase 5.2 Features:
 * - Calculate effective debt considering payment agreements
 * - Distinguish between original debt and agreement-covered debt
 * - Calculate agreement installment debt (pending and overdue)
 * - Handle different agreement statuses (DRAFT, ACTIVE, COMPLETED, DEFAULTED, CANCELLED)
 * - Avoid debt duplication
 *
 * Phase 5.3 Features:
 * - Apply block exceptions for active and up-to-date agreements
 * - Revoke block exceptions for overdue or defaulted agreements
 * - Query active agreement block exceptions
 * - Evaluate agreement block status
 * - Link exceptions to agreements with exceptionSource and exceptionAgreementId
 * - Register BLOCK_EXCEPTION events
 * - Audit all exception creation/revocation
 *
 * Phase 5.4 Features:
 * - Generate integrated financial reports considering payment agreements
 * - Distinguish between original debt and effective debt
 * - Show debt covered by agreements vs uncovered debt
 * - Report agreement installment debt (pending and overdue)
 * - Report defaulted agreement debt separately
 * - Avoid debt duplication in reports
 * - Provide aggregated reports for multiple students
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Payment method enum from Prisma
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QR' | 'SCHOLARSHIP';

const prisma = new PrismaClient();

// Payment Agreement enum types - These match the exact values defined in prisma/schema.prisma
export type PaymentAgreementStatusType =
	| 'DRAFT'
	| 'ACTIVE'
	| 'COMPLETED'
	| 'OVERDUE'
	| 'DEFAULTED'
	| 'CANCELLED'
	| 'REFINANCED';
export type PaymentAgreementInstallmentStatusType =
	| 'PENDING'
	| 'PARTIAL'
	| 'PAID'
	| 'OVERDUE'
	| 'CANCELLED'
	| 'WAIVED';
export type PaymentAgreementChargeRelationTypeType = 'REFINANCED' | 'BLOCKED' | 'ASSOCIATED';
export type PaymentAgreementEventTypeType =
	| 'CREATED'
	| 'ACTIVATED'
	| 'MODIFIED'
	| 'CANCELLED'
	| 'REFINANCED'
	| 'INSTALLMENT_PAID'
	| 'INSTALLMENT_OVERDUE'
	| 'DEFAULTED'
	| 'STATUS_CHANGED'
	| 'BLOCK_EXCEPTION'
	| 'BLOCK_REACTIVATED';

// Permission types
export type UserRole =
	| 'SUPERADMIN'
	| 'DIRECTOR'
	| 'SECRETARIA'
	| 'FINANZAS'
	| 'DOCENTE'
	| 'PRECEPTOR'
	| 'ALUMNO'
	| 'APODERADO'
	| 'LIQUIDADOR'
	| 'SIN_TIPO';

// Types for effective debt calculation (Phase 5.2)
export type EffectiveDebtSummary = {
	// Original debt from StudentCharge (before considering agreements)
	originalTotalDebt: Decimal;
	originalOverdueDebt: Decimal;
	originalPendingDebt: Decimal;

	// Debt covered by active agreements
	agreementCoveredDebt: Decimal;
	agreementCoveredOverdueDebt: Decimal;

	// Debt NOT covered by agreements (still payable as original charges)
	uncoveredDebt: Decimal;
	uncoveredOverdueDebt: Decimal;

	// Agreement installment debt (what the student owes through agreements)
	agreementInstallmentPending: Decimal;
	agreementInstallmentOverdue: Decimal;
	agreementInstallmentTotal: Decimal;

	// Defaulted agreement debt (agreements that are DEFAULTED)
	defaultedAgreementDebt: Decimal;

	// Total effective debt (uncovered + agreement installments)
	effectiveTotalDebt: Decimal;
	effectiveOverdueDebt: Decimal;

	// Agreement counts
	activeAgreements: number;
	completedAgreements: number;
	defaultedAgreements: number;
	cancelledAgreements: number;
	draftAgreements: number;
};

export type AgreementDebtDetail = {
	agreementId: string;
	agreementNumber: number;
	agreementYear: number;
	status: PaymentAgreementStatusType;
	originalDebt: Decimal;
	agreedAmount: Decimal;
	paidAmount: Decimal;
	pendingAmount: Decimal;
	installmentPending: Decimal;
	installmentOverdue: Decimal;
	coveredCharges: Array<{
		chargeId: string;
		originalAmount: Decimal;
		includedAmount: Decimal;
	}>;
};

// Types for block exception operations (Phase 5.3)
export type AgreementBlockExceptionResult = {
	agreementId: string;
	agreementNumber: number;
	agreementYear: number;
	exceptionApplied: boolean;
	exceptionRevoked: boolean;
	blockId?: string;
	previousException?: {
		exceptionGranted: boolean;
		exceptionBy?: string | null;
		exceptionAt?: Date | null;
		exceptionReason?: string | null;
	};
	reason: string;
};

export type ActiveAgreementBlockException = {
	blockId: string;
	studentId: string;
	blockType: string;
	blockReason: string;
	exceptionGranted: boolean;
	exceptionBy?: string | null;
	exceptionAt?: Date | null;
	exceptionReason?: string | null;
	exceptionSource?: string | null;
	exceptionAgreementId?: string | null;
	agreementNumber?: number;
	agreementYear?: number;
};

// Types for integrated financial reports (Phase 5.4)
export type StudentIntegratedDebtReport = {
	studentId: string;
	studentName: string;
	studentDni?: string;
	careerName?: string;
	originalDebtTotal: Decimal;
	originalDebtCoveredByActiveAgreements: Decimal;
	originalDebtStillEnforceable: Decimal;
	agreementPendingDebt: Decimal;
	agreementOverdueDebt: Decimal;
	agreementDefaultedDebt: Decimal;
	effectiveTotalDebt: Decimal;
	activeAgreementsCount: number;
	defaultedAgreementsCount: number;
	completedAgreementsCount: number;
	agreementDetails: Array<{
		agreementId: string;
		agreementNumber: number;
		agreementYear: number;
		status: PaymentAgreementStatusType;
		originalDebt: Decimal;
		paidAmount: Decimal;
		pendingAmount: Decimal;
		installmentPending: Decimal;
		installmentOverdue: Decimal;
	}>;
};

export type AggregatedFinancialReport = {
	totalStudents: number;
	totalOriginalDebt: Decimal;
	totalOriginalDebtCoveredByAgreements: Decimal;
	totalOriginalDebtStillEnforceable: Decimal;
	totalAgreementPendingDebt: Decimal;
	totalAgreementOverdueDebt: Decimal;
	totalAgreementDefaultedDebt: Decimal;
	totalEffectiveDebt: Decimal;
	totalActiveAgreements: number;
	totalDefaultedAgreements: number;
	totalCompletedAgreements: number;
	studentReports: StudentIntegratedDebtReport[];
};

// Types for Payment Agreement models
export type PaymentAgreement = {
	id: string;
	agreementNumber: number;
	agreementYear: number;
	studentId: string;
	studentName: string;
	studentDni?: string;
	originalDebt: Decimal;
	agreedAmount: Decimal;
	paidAmount: Decimal;
	pendingAmount: Decimal;
	createdAt: Date;
	activatedAt?: Date;
	completedAt?: Date;
	cancelledAt?: Date;
	status: PaymentAgreementStatusType;
	reason: string;
	observations?: string;
	createdBy: string;
	createdByName: string;
	activatedBy?: string;
	activatedByName?: string;
	cancelledBy?: string;
	cancelledByName?: string;
	cancelledReason?: string;
	metadata?: Prisma.JsonValue;
	installments: PaymentAgreementInstallment[];
	relatedCharges: PaymentAgreementChargeRelation[];
	events?: PaymentAgreementEvent[];
};

export type PaymentAgreementInstallment = {
	id: string;
	agreementId: string;
	installmentNumber: number;
	dueDate: Date;
	amount: Decimal;
	paidAmount: Decimal;
	pendingAmount: Decimal;
	status: PaymentAgreementInstallmentStatusType;
	paidAt?: Date;
	overdueSince?: Date;
	notes?: string;
	metadata?: Prisma.JsonValue;
};

export type PaymentAgreementChargeRelation = {
	id: string;
	agreementId: string;
	chargeId: string;
	originalChargeAmount: Decimal;
	originalChargePaidAmount: Decimal;
	originalChargeStatus: string;
	amountIncluded: Decimal;
	newStatus?: string;
	relationType: PaymentAgreementChargeRelationTypeType;
};

export type PaymentAgreementEvent = {
	id: string;
	agreementId: string;
	eventType: PaymentAgreementEventTypeType;
	description: string;
	previousStatus?: PaymentAgreementStatusType;
	newStatus?: PaymentAgreementStatusType;
	oldValue?: Prisma.JsonValue;
	newValue?: Prisma.JsonValue;
	metadata?: Prisma.JsonValue;
	reason?: string;
	userId: string;
	userName: string;
	createdAt: Date;
};

// Input types for service methods
export type InstallmentInput = {
	installmentNumber: number;
	dueDate: Date;
	amount: Decimal;
};

export type CreateAgreementInput = {
	studentId: string;
	studentName: string;
	studentDni?: string;
	originalDebt: Decimal;
	agreedAmount: Decimal;
	reason: string;
	observations?: string;
	createdBy: string;
	createdByName: string;
	chargeIds: string[];
	installments: InstallmentInput[];
};

export type UpdateAgreementInput = {
	id: string;
	agreedAmount?: Decimal;
	observations?: string;
	updatedBy: string;
	updatedByName: string;
};

export type InstallmentPaymentInput = {
	installmentId: string;
	amount: Decimal;
	method: string;
	reference?: string;
	notes?: string;
	paidBy: string;
	paidByName: string;
};

// Payment Agreement Service - Phase 2 (Implementation)
class PaymentAgreementService {
	/**
	 * Get next agreement number for a given year (transactional)
	 */
	private async getNextAgreementNumber(year: number): Promise<number> {
		const numberRecord = await prisma.paymentAgreementNumber.upsert({
			where: { year },
			update: { lastNumber: { increment: 1 } },
			create: { year, lastNumber: 1 }
		});
		return numberRecord.lastNumber;
	}

	/**
	 * Check if user has permission to create/activate agreements
	 */
	private canCreateOrActivate(userRoles: UserRole[]): boolean {
		return userRoles.some(
			(role) =>
				role === 'SUPERADMIN' || role === 'DIRECTOR' || role === 'FINANZAS' || role === 'APODERADO'
		);
	}

	/**
	 * Check if user can view agreements
	 */
	private canViewAgreements(userRoles: UserRole[]): boolean {
		return userRoles.some(
			(role) =>
				role === 'SUPERADMIN' ||
				role === 'DIRECTOR' ||
				role === 'FINANZAS' ||
				role === 'SECRETARIA' ||
				role === 'APODERADO' ||
				role === 'ALUMNO'
		);
	}

	/**
	 * Valida scope de ALUMNO.
	 *
	 * Los roles institucionales poseen scope global.
	 * Un usuario que sea únicamente ALUMNO solo puede operar
	 * sobre su propio Student.
	 */
	private async assertStudentOwnership(
		userRoles: UserRole[],
		userId: string | undefined,
		studentId: string
	): Promise<void> {
		const hasGlobalAccess = userRoles.some((role) =>
			['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'].includes(role)
		);

		if (hasGlobalAccess || !userRoles.includes('ALUMNO')) {
			return;
		}

		if (!userId) {
			throw new Error('User ID is required to validate student ownership');
		}

		const student = await prisma.student.findUnique({
			where: { userId },
			select: { id: true }
		});

		if (!student || student.id !== studentId) {
			throw new Error('User can only access their own payment agreements');
		}
	}

	/**
	 * Record an audit event for an agreement
	 */
	private async recordAgreementEvent(
		agreementId: string,
		eventType: PaymentAgreementEventTypeType,
		description: string,
		userId: string,
		userName: string,
		previousStatus?: PaymentAgreementStatusType,
		newStatus?: PaymentAgreementStatusType,
		oldValue?: Prisma.JsonValue,
		newValue?: Prisma.JsonValue,
		reason?: string
	): Promise<void> {
		await prisma.paymentAgreementEvent.create({
			data: {
				agreementId,
				eventType,
				description,
				previousStatus,
				newStatus,
				oldValue: oldValue as Prisma.InputJsonValue,
				newValue: newValue as Prisma.InputJsonValue,
				reason,
				userId,
				userName
			}
		});
	}

	/**
	 * Create audit log entry
	 */
	private async createAuditLog(
		userId: string,
		action: 'CREATE' | 'UPDATE' | 'DELETE',
		entityType: string,
		entityId: string,
		description: string,
		metadata?: Prisma.JsonValue
	): Promise<void> {
		await prisma.auditLog.create({
			data: {
				userId,
				action,
				entityType,
				entityId,
				description,
				metadata: metadata as Prisma.InputJsonValue
			}
		});
	}

	/**
	 * Get agreement by ID with ownership validation
	 */
	async getAgreementById(
		id: string,
		userRoles: UserRole[],
		userId?: string
	): Promise<PaymentAgreement | null> {
		if (!this.canViewAgreements(userRoles)) {
			throw new Error('User does not have permission to view payment agreements');
		}

		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id },
			include: {
				installments: true,
				relatedCharges: {
					include: {
						charge: true
					}
				},
				events: {
					orderBy: { createdAt: 'desc' },
					take: 10
				}
			}
		});

		if (!agreement) {
			return null;
		}

		await this.assertStudentOwnership(userRoles, userId, agreement.studentId);

		return agreement as unknown as PaymentAgreement;
	}

	/**
	 * Get all agreements for a student
	 */
	async getStudentAgreements(
		studentId: string,
		userRoles: UserRole[],
		requestingUserId?: string
	): Promise<PaymentAgreement[]> {
		if (!this.canViewAgreements(userRoles)) {
			throw new Error('User does not have permission to view payment agreements');
		}

		await this.assertStudentOwnership(userRoles, requestingUserId, studentId);

		const agreements = await prisma.paymentAgreement.findMany({
			where: { studentId },
			include: {
				installments: true,
				relatedCharges: true
			},
			orderBy: { createdAt: 'desc' }
		});

		return agreements as unknown as PaymentAgreement[];
	}

	/**
	 * Get agreement summary
	 */
	async getAgreementSummary(
		agreementId: string,
		userRoles: UserRole[],
		userId?: string
	): Promise<{
		totalAgreed: Decimal;
		totalPaid: Decimal;
		pendingAmount: Decimal;
		totalInstallments: number;
		pendingInstallments: number;
		overdueInstallments: number;
		status: PaymentAgreementStatusType;
		originalDebtIncluded: Decimal;
	} | null> {
		const agreement = await this.getAgreementById(agreementId, userRoles, userId);
		if (!agreement) {
			return null;
		}

		const totalInstallments = agreement.installments.length;
		const pendingInstallments = agreement.installments.filter(
			(i: PaymentAgreementInstallment) => i.status === 'PENDING' || i.status === 'OVERDUE'
		).length;
		const overdueInstallments = agreement.installments.filter(
			(i: PaymentAgreementInstallment) => i.status === 'OVERDUE'
		).length;

		const originalDebtIncluded = agreement.relatedCharges.reduce(
			(sum: Decimal, rel: PaymentAgreementChargeRelation) => sum.plus(rel.amountIncluded),
			new Decimal(0)
		);

		return {
			totalAgreed: agreement.agreedAmount,
			totalPaid: agreement.paidAmount,
			pendingAmount: agreement.pendingAmount,
			totalInstallments,
			pendingInstallments,
			overdueInstallments,
			status: agreement.status,
			originalDebtIncluded
		};
	}

	/**
	 * Create a payment agreement in DRAFT status
	 */
	async createDraftAgreement(
		input: CreateAgreementInput,
		userRoles: UserRole[],
		userId: string,
		userName: string
	): Promise<PaymentAgreement> {
		if (!this.canCreateOrActivate(userRoles)) {
			throw new Error('User does not have permission to create payment agreements');
		}

		// Validate agreed amount
		if (input.agreedAmount.lte(0)) {
			throw new Error('Agreed amount must be greater than 0');
		}

		// Validate charge IDs
		if (!input.chargeIds || input.chargeIds.length === 0) {
			throw new Error('At least one charge must be associated with the agreement');
		}

		// Validate installments
		if (!input.installments || input.installments.length === 0) {
			throw new Error('At least one installment must be specified');
		}

		// Validate installment amounts sum
		const installmentsSum = input.installments.reduce(
			(sum: Decimal, installment: InstallmentInput) => sum.plus(installment.amount),
			new Decimal(0)
		);

		if (!installmentsSum.equals(input.agreedAmount)) {
			throw new Error(
				`Sum of installments (${installmentsSum.toString()}) must equal agreed amount (${input.agreedAmount.toString()})`
			);
		}

		// Validate no installment is <= 0
		const invalidInstallment = input.installments.find((i) => i.amount.lte(0));
		if (invalidInstallment) {
			throw new Error('All installments must be greater than 0');
		}

		// Validate student exists
		const student = await prisma.student.findUnique({
			where: { id: input.studentId }
		});

		if (!student) {
			throw new Error('Student not found');
		}

		// Validate charges exist and get their data
		const charges = await prisma.studentCharge.findMany({
			where: { id: { in: input.chargeIds } }
		});

		if (charges.length !== input.chargeIds.length) {
			throw new Error('One or more charges not found');
		}

		// Validate charges belong to the student
		const invalidCharge = charges.find((c) => c.studentId !== input.studentId);
		if (invalidCharge) {
			throw new Error('All charges must belong to the student');
		}

		// Calculate original debt from charges
		const originalDebt = charges.reduce(
			(sum: Decimal, charge: { amount: Decimal }) => sum.plus(charge.amount),
			new Decimal(0)
		);

		// Validate agreed amount does not exceed original debt without justification
		if (input.agreedAmount.gt(originalDebt)) {
			throw new Error(
				`Agreed amount (${input.agreedAmount.toString()}) cannot exceed original debt (${originalDebt.toString()})`
			);
		}

		// Check for duplicate charges in active or draft agreements
		const existingAgreements = await prisma.paymentAgreement.findMany({
			where: {
				studentId: input.studentId,
				status: { in: ['DRAFT', 'ACTIVE'] },
				relatedCharges: {
					some: {
						chargeId: { in: input.chargeIds }
					}
				}
			}
		});

		if (existingAgreements.length > 0) {
			throw new Error(
				'One or more charges are already associated with an active or draft agreement'
			);
		}

		const currentYear = new Date().getFullYear();

		// Create agreement in transaction
		const agreement = await prisma.$transaction(async (tx) => {
			// Get next agreement number
			const agreementNumber = await this.getNextAgreementNumber(currentYear);

			// Create agreement
			const newAgreement = await tx.paymentAgreement.create({
				data: {
					agreementNumber,
					agreementYear: currentYear,
					studentId: input.studentId,
					studentName: input.studentName,
					studentDni: input.studentDni,
					originalDebt,
					agreedAmount: input.agreedAmount,
					paidAmount: new Decimal(0),
					pendingAmount: input.agreedAmount,
					status: 'DRAFT',
					reason: input.reason,
					observations: input.observations,
					createdBy: input.createdBy,
					createdByName: input.createdByName
				}
			});

			// Create installments
			for (const installment of input.installments) {
				await tx.paymentAgreementInstallment.create({
					data: {
						agreementId: newAgreement.id,
						installmentNumber: installment.installmentNumber,
						dueDate: installment.dueDate,
						amount: installment.amount,
						paidAmount: new Decimal(0),
						pendingAmount: installment.amount,
						status: 'PENDING'
					}
				});
			}

			// Create charge relations with snapshot
			for (const charge of charges) {
				await tx.paymentAgreementChargeRelation.create({
					data: {
						agreementId: newAgreement.id,
						chargeId: charge.id,
						originalChargeAmount: charge.amount,
						originalChargePaidAmount: charge.paidAmount || new Decimal(0),
						originalChargeStatus: charge.status,
						amountIncluded: charge.amount,
						relationType: 'REFINANCED'
					}
				});
			}

			// Record CREATED event
			await tx.paymentAgreementEvent.create({
				data: {
					agreementId: newAgreement.id,
					eventType: 'CREATED',
					description: `Payment agreement created for ${input.studentName}`,
					previousStatus: null,
					newStatus: 'DRAFT',
					userId,
					userName
				}
			});

			// Create audit log
			await this.createAuditLog(
				userId,
				'CREATE',
				'PaymentAgreement',
				newAgreement.id,
				`Payment agreement created for ${input.studentName}`,
				{
					agreementNumber,
					agreementYear: currentYear,
					studentId: input.studentId,
					studentName: input.studentName,
					agreedAmount: input.agreedAmount.toString(),
					chargeIds: input.chargeIds,
					installmentsCount: input.installments.length
				}
			);

			return newAgreement;
		});

		return agreement as unknown as PaymentAgreement;
	}

	/**
	 * Activate a payment agreement (DRAFT -> ACTIVE)
	 */
	async activateAgreement(
		agreementId: string,
		userRoles: UserRole[],
		userId: string,
		userName: string
	): Promise<PaymentAgreement> {
		if (!this.canCreateOrActivate(userRoles)) {
			throw new Error('User does not have permission to activate payment agreements');
		}

		// Get agreement
		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: {
				installments: true,
				relatedCharges: true
			}
		});

		if (!agreement) {
			throw new Error('Agreement not found');
		}

		// Validate agreement is in DRAFT status
		if (agreement.status !== 'DRAFT') {
			throw new Error(`Agreement is in ${agreement.status} status, cannot activate`);
		}

		// Validate agreement has charge relations
		if (agreement.relatedCharges.length === 0) {
			throw new Error('Agreement must have at least one charge relation to be activated');
		}

		// Validate agreement has installments
		if (agreement.installments.length === 0) {
			throw new Error('Agreement must have at least one installment to be activated');
		}

		// Validate installment sum matches agreed amount
		const installmentsSum = agreement.installments.reduce(
			(sum: Decimal, installment: { amount: Decimal }) => sum.plus(installment.amount),
			new Decimal(0)
		);

		if (!installmentsSum.equals(agreement.agreedAmount as Decimal)) {
			throw new Error(
				`Sum of installments (${installmentsSum.toString()}) does not match agreed amount (${agreement.agreedAmount.toString()})`
			);
		}

		// Activate agreement in transaction
		const activatedAgreement = await prisma.$transaction(async (tx) => {
			// Update agreement status
			const updated = await tx.paymentAgreement.update({
				where: { id: agreementId },
				data: {
					status: 'ACTIVE',
					activatedAt: new Date(),
					activatedBy: userId,
					activatedByName: userName
				}
			});

			// Record ACTIVATED event
			await tx.paymentAgreementEvent.create({
				data: {
					agreementId,
					eventType: 'ACTIVATED',
					description: `Payment agreement activated by ${userName}`,
					previousStatus: 'DRAFT',
					newStatus: 'ACTIVE',
					userId,
					userName
				}
			});

			// Create audit log
			await this.createAuditLog(
				userId,
				'UPDATE',
				'PaymentAgreement',
				agreementId,
				`Payment agreement activated by ${userName}`,
				{
					agreementNumber: agreement.agreementNumber,
					agreementYear: agreement.agreementYear,
					studentId: agreement.studentId,
					studentName: agreement.studentName,
					agreedAmount: agreement.agreedAmount.toString()
				}
			);

			return updated;
		});

		return activatedAgreement as unknown as PaymentAgreement;
	}

	/**
	 * Register payment against an installment
	 */
	async registerInstallmentPayment(
		input: InstallmentPaymentInput,
		userRoles: UserRole[],
		userId: string
	): Promise<{
		payment: Prisma.PaymentGetPayload<{}>;
		installment: PaymentAgreementInstallment;
		agreement: PaymentAgreement;
	}> {
		// Registrar pagos es una operación de gestión, no de solo lectura.
		if (!this.canCreateOrActivate(userRoles)) {
			throw new Error('User does not have permission to register payments');
		}

		// Validate amount
		if (input.amount.lte(0)) {
			throw new Error('Payment amount must be greater than 0');
		}

		// Get installment with agreement
		const installment = await prisma.paymentAgreementInstallment.findUnique({
			where: { id: input.installmentId },
			include: {
				agreement: {
					include: {
						relatedCharges: true
					}
				}
			}
		});

		if (!installment) {
			throw new Error('Installment not found');
		}

		// Validate agreement is active
		if (installment.agreement.status !== 'ACTIVE') {
			throw new Error('Can only register payments for active agreements');
		}

		// Validate installment is not cancelled or waived
		if (installment.status === 'CANCELLED' || installment.status === 'WAIVED') {
			throw new Error('Cannot register payment for cancelled or waived installment');
		}

		// Validate payment amount does not exceed pending amount
		if (input.amount.gt(installment.pendingAmount)) {
			throw new Error(
				`Payment amount (${input.amount.toString()}) exceeds pending amount (${installment.pendingAmount.toString()})`
			);
		}

		// Process payment in transaction
		const result = await prisma.$transaction(async (tx) => {
			// Create payment
			const payment = await tx.payment.create({
				data: {
					studentId: installment.agreement.studentId,
					amount: input.amount,
					method: input.method as PaymentMethod,
					reference: input.reference,
					notes: input.notes,
					userId,
					paidAt: new Date()
				}
			});

			// Create allocation with installmentId
			// For agreement payments, chargeId is null and installmentId is set
			// This allows proper separation between original debt payments and agreement installment payments
			const allocationData: Prisma.PaymentAllocationUncheckedCreateInput = {
				paymentId: payment.id,
				chargeId: null,
				installmentId: input.installmentId,
				amount: input.amount
			};
			await tx.paymentAllocation.create({
				data: allocationData
			});

			// Update installment
			const newPaidAmount = installment.paidAmount.plus(input.amount);
			const newPendingAmount = installment.pendingAmount.minus(input.amount);
			let newStatus = installment.status;

			if (newPendingAmount.equals(new Decimal(0))) {
				newStatus = 'PAID';
			} else if (newPaidAmount.gt(new Decimal(0))) {
				newStatus = 'PARTIAL';
			}

			const updatedInstallment = await tx.paymentAgreementInstallment.update({
				where: { id: input.installmentId },
				data: {
					paidAmount: newPaidAmount,
					pendingAmount: newPendingAmount,
					status: newStatus,
					paidAt: newStatus === 'PAID' ? new Date() : installment.paidAt
				}
			});

			// Update agreement totals
			const agreement = await tx.paymentAgreement.findUnique({
				where: { id: installment.agreementId },
				include: {
					installments: true
				}
			});

			if (!agreement) {
				throw new Error('Agreement not found');
			}

			const totalPaid = agreement.installments.reduce(
				(sum: Decimal, inst: { paidAmount: Decimal }) => sum.plus(inst.paidAmount),
				new Decimal(0)
			);
			const totalPending = agreement.installments.reduce(
				(sum: Decimal, inst: { pendingAmount: Decimal }) => sum.plus(inst.pendingAmount),
				new Decimal(0)
			);

			let newAgreementStatus = agreement.status;
			if (totalPending.equals(new Decimal(0))) {
				newAgreementStatus = 'COMPLETED';
			}

			const updatedAgreement = await tx.paymentAgreement.update({
				where: { id: installment.agreementId },
				data: {
					paidAmount: totalPaid,
					pendingAmount: totalPending,
					status: newAgreementStatus,
					completedAt: newAgreementStatus === 'COMPLETED' ? new Date() : agreement.completedAt
				}
			});

			// Record payment event
			await tx.paymentAgreementEvent.create({
				data: {
					agreementId: installment.agreementId,
					eventType: 'INSTALLMENT_PAID',
					description: `Payment of ${input.amount.toString()} registered for installment ${installment.installmentNumber}`,
					previousStatus: null, // Installment status changes don't use agreement status
					newStatus: null, // Installment status changes don't use agreement status
					oldValue: {
						paidAmount: installment.paidAmount.toString(),
						pendingAmount: installment.pendingAmount.toString()
					},
					newValue: {
						paidAmount: newPaidAmount.toString(),
						pendingAmount: newPendingAmount.toString()
					},
					userId,
					userName: input.paidByName
				}
			});

			// Create audit log
			await this.createAuditLog(
				userId,
				'UPDATE',
				'PaymentAgreementInstallment',
				input.installmentId,
				`Payment of ${input.amount.toString()} registered for installment ${installment.installmentNumber} of agreement ${updatedAgreement.agreementNumber}/${updatedAgreement.agreementYear}`,
				{
					paymentId: payment.id,
					installmentId: input.installmentId,
					agreementId: installment.agreementId,
					agreementNumber: updatedAgreement.agreementNumber,
					agreementYear: updatedAgreement.agreementYear,
					amount: input.amount.toString(),
					method: input.method,
					installmentNumber: installment.installmentNumber,
					previousStatus: installment.status,
					newStatus
				}
			);

			return { payment, installment: updatedInstallment, agreement: updatedAgreement };
		});

		return {
			payment: result.payment,
			installment: result.installment as unknown as PaymentAgreementInstallment,
			agreement: result.agreement as unknown as PaymentAgreement
		};
	}

	/**
	 * Phase 5.1: Mark overdue installments
	 * Marks installments as OVERDUE if their dueDate is in the past and they are not fully paid
	 */
	private async markOverdueInstallments(
		agreementId: string,
		tx: Prisma.TransactionClient
	): Promise<{ markedCount: number; installmentIds: string[] }> {
		const now = new Date();
		const installments = await tx.paymentAgreementInstallment.findMany({
			where: {
				agreementId,
				status: { in: ['PENDING', 'PARTIAL'] },
				dueDate: { lt: now }
			}
		});

		const markedIds: string[] = [];
		for (const installment of installments) {
			await tx.paymentAgreementInstallment.update({
				where: { id: installment.id },
				data: {
					status: 'OVERDUE',
					overdueSince: now
				}
			});
			markedIds.push(installment.id);
		}

		return { markedCount: markedIds.length, installmentIds: markedIds };
	}

	/**
	 * Phase 5.1: Evaluate if agreement should be marked as COMPLETED
	 * Agreement is COMPLETED if all installments are PAID
	 */
	private async evaluateAgreementCompletion(
		agreementId: string,
		tx: Prisma.TransactionClient
	): Promise<{ shouldComplete: boolean }> {
		const installments = await tx.paymentAgreementInstallment.findMany({
			where: { agreementId }
		});

		const allPaid = installments.every((inst) => inst.status === 'PAID');
		return { shouldComplete: allPaid };
	}

	/**
	 * Phase 5.1: Evaluate if agreement should be marked as DEFAULTED
	 * Agreement is DEFAULTED if:
	 * - Has 2 or more consecutive overdue installments
	 * - OR has more than 50% of installments overdue
	 */
	private async evaluateAgreementDefault(
		agreementId: string,
		tx: Prisma.TransactionClient
	): Promise<{ shouldDefault: boolean; reason: string }> {
		const installments = await tx.paymentAgreementInstallment.findMany({
			where: { agreementId },
			orderBy: { installmentNumber: 'asc' }
		});

		const overdueInstallments = installments.filter((inst) => inst.status === 'OVERDUE');
		const overdueCount = overdueInstallments.length;
		const totalCount = installments.length;

		if (totalCount === 0) {
			return { shouldDefault: false, reason: 'No installments' };
		}

		// Check for 2 or more consecutive overdue installments
		let consecutiveOverdue = 0;
		let maxConsecutiveOverdue = 0;
		for (const inst of installments) {
			if (inst.status === 'OVERDUE') {
				consecutiveOverdue++;
				maxConsecutiveOverdue = Math.max(maxConsecutiveOverdue, consecutiveOverdue);
			} else {
				consecutiveOverdue = 0;
			}
		}

		if (maxConsecutiveOverdue >= 2) {
			return {
				shouldDefault: true,
				reason: `${maxConsecutiveOverdue} consecutive overdue installments`
			};
		}

		// Check for more than 50% overdue
		const overduePercentage = (overdueCount / totalCount) * 100;
		if (overduePercentage > 50) {
			return {
				shouldDefault: true,
				reason: `${overdueCount}/${totalCount} (${overduePercentage.toFixed(1)}%) installments overdue`
			};
		}

		return { shouldDefault: false, reason: 'Not enough overdue installments' };
	}

	/**
	 * Phase 5.1: Evaluate agreement financial status
	 * Main coordinator method that evaluates and updates agreement status
	 */
	async evaluateAgreementFinancialStatus(
		agreementId: string,
		userId: string,
		userName: string
	): Promise<{
		agreement: PaymentAgreement;
		overdueMarked: number;
		statusChanged: boolean;
		previousStatus: PaymentAgreementStatusType;
		newStatus: PaymentAgreementStatusType;
	}> {
		// Get agreement with installments
		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: {
				installments: true
			}
		});

		if (!agreement) {
			throw new Error('Agreement not found');
		}

		if (agreement.status !== 'ACTIVE') {
			throw new Error(`Agreement is in ${agreement.status} status, cannot evaluate`);
		}

		const previousStatus = agreement.status;

		// Execute evaluation in transaction
		const result = await prisma.$transaction(async (tx) => {
			// Mark overdue installments
			const { markedCount, installmentIds } = await this.markOverdueInstallments(agreementId, tx);

			// Evaluate completion
			const { shouldComplete } = await this.evaluateAgreementCompletion(agreementId, tx);

			// Evaluate default
			const { shouldDefault, reason } = await this.evaluateAgreementDefault(agreementId, tx);

			// Determine new status
			let newStatus: PaymentAgreementStatusType = previousStatus;
			if (shouldComplete) {
				newStatus = 'COMPLETED';
			} else if (shouldDefault) {
				newStatus = 'DEFAULTED';
			}

			// Update agreement if status changed
			let updatedAgreement = agreement;
			if (newStatus !== previousStatus) {
				updatedAgreement = await tx.paymentAgreement.update({
					where: { id: agreementId },
					data: {
						status: newStatus,
						completedAt: newStatus === 'COMPLETED' ? new Date() : null
					},
					include: {
						installments: true
					}
				});

				// Record status change event
				const eventType = newStatus === 'COMPLETED' ? 'STATUS_CHANGED' : 'DEFAULTED';
				await this.recordAgreementEvent(
					agreementId,
					eventType,
					`Agreement status changed from ${previousStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
					userId,
					userName,
					previousStatus,
					newStatus,
					{ status: previousStatus },
					{ status: newStatus, reason }
				);

				// Create audit log
				await this.createAuditLog(
					userId,
					'UPDATE',
					'PaymentAgreement',
					agreementId,
					`Agreement status changed from ${previousStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
					{
						agreementNumber: agreement.agreementNumber,
						agreementYear: agreement.agreementYear,
						studentId: agreement.studentId,
						studentName: agreement.studentName,
						previousStatus,
						newStatus,
						reason
					}
				);
			}

			// Record overdue installment events
			if (markedCount > 0) {
				for (const installmentId of installmentIds) {
					await this.recordAgreementEvent(
						agreementId,
						'INSTALLMENT_OVERDUE',
						`Installment marked as overdue`,
						userId,
						userName,
						undefined,
						undefined,
						{ installmentId },
						{ status: 'OVERDUE', overdueSince: new Date().toISOString() }
					);
				}

				// Create audit log for overdue marking
				await this.createAuditLog(
					userId,
					'UPDATE',
					'PaymentAgreementInstallment',
					agreementId,
					`${markedCount} installment(s) marked as overdue`,
					{
						agreementNumber: agreement.agreementNumber,
						agreementYear: agreement.agreementYear,
						studentId: agreement.studentId,
						studentName: agreement.studentName,
						markedCount,
						installmentIds
					}
				);
			}

			return {
				agreement: updatedAgreement,
				overdueMarked: markedCount,
				statusChanged: newStatus !== previousStatus,
				previousStatus,
				newStatus
			};
		});

		return {
			agreement: result.agreement as unknown as PaymentAgreement,
			overdueMarked: result.overdueMarked,
			statusChanged: result.statusChanged,
			previousStatus: result.previousStatus,
			newStatus: result.newStatus
		};
	}

	/**
	 * Phase 5.2: Calculate effective debt summary considering payment agreements
	 * This method calculates the student's debt while avoiding duplication with active agreements
	 */
	async getStudentEffectiveDebt(studentId: string): Promise<EffectiveDebtSummary> {
		// Get all student charges
		const charges = await prisma.studentCharge.findMany({
			where: { studentId },
			include: {
				agreementChargeRelations: {
					include: {
						agreement: true
					}
				}
			}
		});

		// Get all payment agreements for the student
		const agreements = await prisma.paymentAgreement.findMany({
			where: { studentId },
			include: {
				installments: true,
				relatedCharges: true
			}
		});

		const now = new Date();

		// Calculate original debt (before considering agreements)
		let originalTotalDebt = new Decimal(0);
		let originalOverdueDebt = new Decimal(0);
		let originalPendingDebt = new Decimal(0);

		for (const charge of charges) {
			if (charge.status === 'CANCELLED') continue;
			if (charge.status === 'PAID') continue;

			const remaining = charge.finalAmount.sub(charge.paidAmount);
			if (remaining.gt(0)) {
				originalTotalDebt = originalTotalDebt.add(remaining);
				originalPendingDebt = originalPendingDebt.add(remaining);

				if (charge.dueDate && new Date(charge.dueDate) < now) {
					originalOverdueDebt = originalOverdueDebt.add(remaining);
				}
			}
		}

		// Calculate agreement-covered debt
		let agreementCoveredDebt = new Decimal(0);
		let agreementCoveredOverdueDebt = new Decimal(0);
		const coveredChargeIds = new Set<string>();

		for (const agreement of agreements) {
			// Only ACTIVE agreements cover debt
			if (agreement.status !== 'ACTIVE') continue;

			for (const relation of agreement.relatedCharges) {
				coveredChargeIds.add(relation.chargeId);
				agreementCoveredDebt = agreementCoveredDebt.add(relation.amountIncluded);

				// Check if the original charge was overdue
				const charge = charges.find((c) => c.id === relation.chargeId);
				if (charge && charge.dueDate && new Date(charge.dueDate) < now) {
					agreementCoveredOverdueDebt = agreementCoveredOverdueDebt.add(relation.amountIncluded);
				}
			}
		}

		// Calculate uncovered debt (charges not covered by active agreements)
		let uncoveredDebt = new Decimal(0);
		let uncoveredOverdueDebt = new Decimal(0);

		for (const charge of charges) {
			if (charge.status === 'CANCELLED') continue;
			if (charge.status === 'PAID') continue;
			if (coveredChargeIds.has(charge.id)) continue;

			const remaining = charge.finalAmount.sub(charge.paidAmount);
			if (remaining.gt(0)) {
				uncoveredDebt = uncoveredDebt.add(remaining);

				if (charge.dueDate && new Date(charge.dueDate) < now) {
					uncoveredOverdueDebt = uncoveredOverdueDebt.add(remaining);
				}
			}
		}

		// Calculate agreement installment debt
		let agreementInstallmentPending = new Decimal(0);
		let agreementInstallmentOverdue = new Decimal(0);
		let agreementInstallmentTotal = new Decimal(0);
		let defaultedAgreementDebt = new Decimal(0);

		for (const agreement of agreements) {
			// Skip DRAFT and CANCELLED agreements
			if (agreement.status === 'DRAFT' || agreement.status === 'CANCELLED') continue;

			// COMPLETED agreements have 0 debt
			if (agreement.status === 'COMPLETED') continue;

			// DEFAULTED agreements count as defaulted debt
			if (agreement.status === 'DEFAULTED') {
				defaultedAgreementDebt = defaultedAgreementDebt.add(agreement.pendingAmount);
			}

			// Calculate installment debt for ACTIVE and DEFAULTED agreements
			if (agreement.status === 'ACTIVE' || agreement.status === 'DEFAULTED') {
				for (const installment of agreement.installments) {
					if (
						installment.status === 'PAID' ||
						installment.status === 'CANCELLED' ||
						installment.status === 'WAIVED'
					) {
						continue;
					}

					const pending = installment.pendingAmount;
					agreementInstallmentTotal = agreementInstallmentTotal.add(pending);

					if (
						installment.status === 'PENDING' ||
						installment.status === 'PARTIAL' ||
						installment.status === 'OVERDUE'
					) {
						agreementInstallmentPending = agreementInstallmentPending.add(pending);
					}

					if (installment.status === 'OVERDUE') {
						agreementInstallmentOverdue = agreementInstallmentOverdue.add(pending);
					}
				}
			}
		}

		// Calculate effective debt (uncovered + agreement installments)
		const effectiveTotalDebt = uncoveredDebt.add(agreementInstallmentTotal);
		const effectiveOverdueDebt = uncoveredOverdueDebt.add(agreementInstallmentOverdue);

		// Count agreements by status
		const activeAgreements = agreements.filter((a) => a.status === 'ACTIVE').length;
		const completedAgreements = agreements.filter((a) => a.status === 'COMPLETED').length;
		const defaultedAgreements = agreements.filter((a) => a.status === 'DEFAULTED').length;
		const cancelledAgreements = agreements.filter((a) => a.status === 'CANCELLED').length;
		const draftAgreements = agreements.filter((a) => a.status === 'DRAFT').length;

		return {
			originalTotalDebt,
			originalOverdueDebt,
			originalPendingDebt,
			agreementCoveredDebt,
			agreementCoveredOverdueDebt,
			uncoveredDebt,
			uncoveredOverdueDebt,
			agreementInstallmentPending,
			agreementInstallmentOverdue,
			agreementInstallmentTotal,
			defaultedAgreementDebt,
			effectiveTotalDebt,
			effectiveOverdueDebt,
			activeAgreements,
			completedAgreements,
			defaultedAgreements,
			cancelledAgreements,
			draftAgreements
		};
	}

	/**
	 * Phase 5.2: Get detailed debt summary for each agreement
	 */
	async getStudentAgreementDebtSummary(studentId: string): Promise<AgreementDebtDetail[]> {
		const agreements = await prisma.paymentAgreement.findMany({
			where: { studentId },
			include: {
				installments: true,
				relatedCharges: {
					include: {
						charge: true
					}
				}
			},
			orderBy: [{ agreementYear: 'desc' }, { agreementNumber: 'desc' }]
		});

		const now = new Date();

		return agreements.map((agreement) => {
			// Calculate installment debt
			let installmentPending = new Decimal(0);
			let installmentOverdue = new Decimal(0);

			for (const installment of agreement.installments) {
				if (
					installment.status === 'PAID' ||
					installment.status === 'CANCELLED' ||
					installment.status === 'WAIVED'
				) {
					continue;
				}

				const pending = installment.pendingAmount;

				if (
					installment.status === 'PENDING' ||
					installment.status === 'PARTIAL' ||
					installment.status === 'OVERDUE'
				) {
					installmentPending = installmentPending.add(pending);
				}

				if (installment.status === 'OVERDUE') {
					installmentOverdue = installmentOverdue.add(pending);
				}
			}

			// Build covered charges details
			const coveredCharges = agreement.relatedCharges.map((relation) => ({
				chargeId: relation.chargeId,
				originalAmount: relation.charge.finalAmount,
				includedAmount: relation.amountIncluded
			}));

			return {
				agreementId: agreement.id,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				status: agreement.status as PaymentAgreementStatusType,
				originalDebt: agreement.originalDebt,
				agreedAmount: agreement.agreedAmount,
				paidAmount: agreement.paidAmount,
				pendingAmount: agreement.pendingAmount,
				installmentPending,
				installmentOverdue,
				coveredCharges
			};
		});
	}

	/**
	 * Phase 5.2: Calculate debt summary with agreements (wrapper for compatibility)
	 * This method provides a unified interface that can be used alongside FinancialService.calculateDebtSummary
	 */
	async calculateDebtSummaryWithAgreements(studentId: string): Promise<{
		// Original debt summary (from FinancialService)
		originalDebt: {
			totalDebt: Decimal;
			overdueDebt: Decimal;
			pendingBalance: Decimal;
			pendingCharges: number;
			overdueCharges: number;
			partialCharges: number;
			paidCharges: number;
			cancelledCharges: number;
		};
		// Agreement-enhanced debt summary
		effectiveDebt: EffectiveDebtSummary;
		// Agreement details
		agreementDetails: AgreementDebtDetail[];
	}> {
		// Get original debt summary (mimicking FinancialService.calculateDebtSummary)
		const charges = await prisma.studentCharge.findMany({
			where: { studentId },
			include: {
				allocations: true
			}
		});

		let totalDebt = new Decimal(0);
		let overdueDebt = new Decimal(0);
		let pendingBalance = new Decimal(0);
		let pendingCharges = 0;
		let overdueCharges = 0;
		let partialCharges = 0;
		let paidCharges = 0;
		let cancelledCharges = 0;
		const now = new Date();

		for (const charge of charges) {
			const finalAmount = charge.finalAmount;
			const paidAmount = charge.paidAmount;
			const remaining = finalAmount.sub(paidAmount);

			if (charge.status === 'CANCELLED') {
				cancelledCharges++;
				continue;
			}

			if (charge.status === 'PAID') {
				paidCharges++;
				continue;
			}

			if (remaining.gt(0)) {
				pendingBalance = pendingBalance.add(remaining);
				totalDebt = totalDebt.add(remaining);

				if (charge.dueDate && new Date(charge.dueDate) < now) {
					overdueDebt = overdueDebt.add(remaining);
					overdueCharges++;
				} else {
					pendingCharges++;
				}

				if (charge.status === 'PARTIAL') {
					partialCharges++;
				}
			}
		}

		// Get effective debt summary
		const effectiveDebt = await this.getStudentEffectiveDebt(studentId);

		// Get agreement details
		const agreementDetails = await this.getStudentAgreementDebtSummary(studentId);

		return {
			originalDebt: {
				totalDebt,
				overdueDebt,
				pendingBalance,
				pendingCharges,
				overdueCharges,
				partialCharges,
				paidCharges,
				cancelledCharges
			},
			effectiveDebt,
			agreementDetails
		};
	}

	/**
	 * Phase 5.3: Apply block exception for an active and up-to-date agreement
	 */
	async applyAgreementBlockException(
		agreementId: string,
		userId: string,
		userName: string
	): Promise<AgreementBlockExceptionResult> {
		// Get agreement with installments
		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: {
				installments: true
			}
		});

		if (!agreement) {
			throw new Error('Convenio no encontrado');
		}

		// Validate agreement status
		if (agreement.status !== 'ACTIVE') {
			throw new Error(
				`Solo convenios ACTIVOS pueden generar excepción de bloqueo. Estado actual: ${agreement.status}`
			);
		}

		// Check if agreement has overdue installments
		const hasOverdueInstallments = agreement.installments.some(
			(installment) => installment.status === 'OVERDUE'
		);

		if (hasOverdueInstallments) {
			throw new Error('Convenio con cuotas vencidas no puede generar excepción de bloqueo');
		}

		// Check for existing active blocks for the student
		const activeBlocks = await prisma.financialBlock.findMany({
			where: {
				studentId: agreement.studentId,
				isActive: true
			}
		});

		if (activeBlocks.length === 0) {
			return {
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				exceptionApplied: false,
				exceptionRevoked: false,
				reason: 'No hay bloqueos activos para el alumno'
			};
		}

		// Check for existing exception for this agreement
		const existingException = activeBlocks.find(
			(block) =>
				block.exceptionAgreementId === agreementId && block.exceptionSource === 'PAYMENT_AGREEMENT'
		);

		if (existingException) {
			return {
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				exceptionApplied: false,
				exceptionRevoked: false,
				blockId: existingException.id,
				previousException: {
					exceptionGranted: existingException.exceptionGranted,
					exceptionBy: existingException.exceptionBy,
					exceptionAt: existingException.exceptionAt,
					exceptionReason: existingException.exceptionReason
				},
				reason: 'Ya existe una excepción de bloqueo para este convenio'
			};
		}

		// Apply exception to all active blocks
		let exceptionApplied = false;
		let firstBlockId: string | undefined;

		for (const block of activeBlocks) {
			await prisma.financialBlock.update({
				where: { id: block.id },
				data: {
					exceptionGranted: true,
					exceptionBy: userId,
					exceptionAt: new Date(),
					exceptionReason: `Convenio de pago activo y al día #${agreement.agreementNumber}/${agreement.agreementYear}`,
					exceptionSource: 'PAYMENT_AGREEMENT',
					exceptionAgreementId: agreementId
				}
			});

			if (!firstBlockId) {
				firstBlockId = block.id;
			}
			exceptionApplied = true;
		}

		// Register BLOCK_EXCEPTION event
		await this.recordAgreementEvent(
			agreementId,
			'BLOCK_EXCEPTION',
			`Excepción de bloqueo aplicada por convenio activo y al día`,
			userId,
			userName
		);

		// Audit log
		await this.createAuditLog(
			userId,
			'UPDATE',
			'FinancialBlock',
			firstBlockId || agreementId,
			`Aplicó excepción de bloqueo por convenio #${agreement.agreementNumber}/${agreement.agreementYear}`,
			{
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				studentId: agreement.studentId,
				blocksModified: activeBlocks.length
			}
		);

		return {
			agreementId,
			agreementNumber: agreement.agreementNumber,
			agreementYear: agreement.agreementYear,
			exceptionApplied,
			exceptionRevoked: false,
			blockId: firstBlockId,
			reason: exceptionApplied ? 'Excepción aplicada exitosamente' : 'No se aplicó excepción'
		};
	}

	/**
	 * Phase 5.3: Revoke block exception for an agreement
	 */
	async revokeAgreementBlockException(
		agreementId: string,
		userId: string,
		userName: string
	): Promise<AgreementBlockExceptionResult> {
		// Get agreement
		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId }
		});

		if (!agreement) {
			throw new Error('Convenio no encontrado');
		}

		// Find blocks with exception for this agreement
		const blocksWithException = await prisma.financialBlock.findMany({
			where: {
				studentId: agreement.studentId,
				isActive: true,
				exceptionGranted: true,
				exceptionSource: 'PAYMENT_AGREEMENT',
				exceptionAgreementId: agreementId
			}
		});

		if (blocksWithException.length === 0) {
			return {
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				exceptionApplied: false,
				exceptionRevoked: false,
				reason: 'No hay excepción activa para este convenio'
			};
		}

		// Revoke exception from all blocks
		let exceptionRevoked = false;
		let firstBlockId: string | undefined;

		for (const block of blocksWithException) {
			await prisma.financialBlock.update({
				where: { id: block.id },
				data: {
					exceptionGranted: false,
					exceptionBy: null,
					exceptionAt: null,
					exceptionReason: null,
					exceptionSource: null,
					exceptionAgreementId: null
				}
			});

			if (!firstBlockId) {
				firstBlockId = block.id;
			}
			exceptionRevoked = true;
		}

		// Register BLOCK_EXCEPTION event (revocation)
		await this.recordAgreementEvent(
			agreementId,
			'BLOCK_EXCEPTION',
			`Excepción de bloqueo revocada por convenio vencido o incumplido`,
			userId,
			userName
		);

		// Audit log
		await this.createAuditLog(
			userId,
			'UPDATE',
			'FinancialBlock',
			firstBlockId || agreementId,
			`Revocó excepción de bloqueo por convenio #${agreement.agreementNumber}/${agreement.agreementYear}`,
			{
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				studentId: agreement.studentId,
				blocksModified: blocksWithException.length
			}
		);

		return {
			agreementId,
			agreementNumber: agreement.agreementNumber,
			agreementYear: agreement.agreementYear,
			exceptionApplied: false,
			exceptionRevoked,
			blockId: firstBlockId,
			reason: exceptionRevoked ? 'Excepción revocada exitosamente' : 'No se revocó excepción'
		};
	}

	/**
	 * Phase 5.3: Get active block exception for a student's agreement
	 */
	async getActiveAgreementBlockException(
		studentId: string
	): Promise<ActiveAgreementBlockException | null> {
		const block = await prisma.financialBlock.findFirst({
			where: {
				studentId,
				isActive: true,
				exceptionGranted: true,
				exceptionSource: 'PAYMENT_AGREEMENT',
				exceptionAgreementId: { not: null }
			},
			include: {
				exceptionAgreement: true
			}
		});

		if (!block) {
			return null;
		}

		return {
			blockId: block.id,
			studentId: block.studentId,
			blockType: block.blockType,
			blockReason: block.blockReason,
			exceptionGranted: block.exceptionGranted,
			exceptionBy: block.exceptionBy,
			exceptionAt: block.exceptionAt,
			exceptionReason: block.exceptionReason,
			exceptionSource: block.exceptionSource,
			exceptionAgreementId: block.exceptionAgreementId,
			agreementNumber: block.exceptionAgreement?.agreementNumber,
			agreementYear: block.exceptionAgreement?.agreementYear
		};
	}

	/**
	 * Phase 5.3: Evaluate if an agreement should have a block exception
	 * Returns true if agreement is ACTIVE and has no overdue installments
	 */
	async evaluateAgreementBlockException(agreementId: string): Promise<{
		shouldHaveException: boolean;
		reason: string;
	}> {
		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: {
				installments: true
			}
		});

		if (!agreement) {
			throw new Error('Convenio no encontrado');
		}

		// COMPLETED agreements don't need exceptions
		if (agreement.status === 'COMPLETED') {
			return {
				shouldHaveException: false,
				reason: 'Convenio completado no necesita excepción activa'
			};
		}

		// DEFAULTED agreements should not have exceptions
		if (agreement.status === 'DEFAULTED') {
			return {
				shouldHaveException: false,
				reason: 'Convenio incumplido no debe tener excepción'
			};
		}

		// DRAFT and CANCELLED agreements cannot have exceptions
		if (agreement.status === 'DRAFT' || agreement.status === 'CANCELLED') {
			return {
				shouldHaveException: false,
				reason: `Convenio ${agreement.status} no puede tener excepción`
			};
		}

		// ACTIVE agreements: check for overdue installments
		if (agreement.status === 'ACTIVE') {
			const hasOverdueInstallments = agreement.installments.some(
				(installment) => installment.status === 'OVERDUE'
			);

			if (hasOverdueInstallments) {
				return {
					shouldHaveException: false,
					reason: 'Convenio con cuotas vencidas no debe tener excepción'
				};
			}

			return {
				shouldHaveException: true,
				reason: 'Convenio activo y al día puede tener excepción'
			};
		}

		return {
			shouldHaveException: false,
			reason: `Estado de convenio ${agreement.status} no evaluado para excepción`
		};
	}

	/**
	 * Phase 5.3: Evaluate and apply/revoke block exception for an agreement
	 * This is the main coordinator method
	 */
	async evaluateAgreementBlockStatus(
		agreementId: string,
		userId: string,
		userName: string
	): Promise<AgreementBlockExceptionResult> {
		// Get agreement
		const agreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId }
		});

		if (!agreement) {
			throw new Error('Convenio no encontrado');
		}

		// Evaluate if agreement should have exception
		const evaluation = await this.evaluateAgreementBlockException(agreementId);

		// Get current exception status
		const currentException = await this.getActiveAgreementBlockException(agreement.studentId);

		// If should have exception but doesn't, apply it
		if (evaluation.shouldHaveException && !currentException) {
			return await this.applyAgreementBlockException(agreementId, userId, userName);
		}

		// If should not have exception but has one, revoke it
		if (
			!evaluation.shouldHaveException &&
			currentException &&
			currentException.exceptionAgreementId === agreementId
		) {
			return await this.revokeAgreementBlockException(agreementId, userId, userName);
		}

		// If should have exception and already has one for this agreement, no action needed
		if (
			evaluation.shouldHaveException &&
			currentException &&
			currentException.exceptionAgreementId === agreementId
		) {
			return {
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				exceptionApplied: false,
				exceptionRevoked: false,
				blockId: currentException.blockId,
				previousException: {
					exceptionGranted: currentException.exceptionGranted,
					exceptionBy: currentException.exceptionBy,
					exceptionAt: currentException.exceptionAt,
					exceptionReason: currentException.exceptionReason
				},
				reason: 'Excepción ya existe y es correcta'
			};
		}

		// If should not have exception and doesn't have one, no action needed
		if (!evaluation.shouldHaveException && !currentException) {
			return {
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				exceptionApplied: false,
				exceptionRevoked: false,
				reason: evaluation.reason
			};
		}

		// If exception exists but is for a different agreement, no action (let the other agreement handle it)
		if (currentException && currentException.exceptionAgreementId !== agreementId) {
			return {
				agreementId,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				exceptionApplied: false,
				exceptionRevoked: false,
				blockId: currentException.blockId,
				reason: 'Excepción existe para otro convenio'
			};
		}

		return {
			agreementId,
			agreementNumber: agreement.agreementNumber,
			agreementYear: agreement.agreementYear,
			exceptionApplied: false,
			exceptionRevoked: false,
			reason: 'No se requirió acción'
		};
	}

	/**
	 * Phase 5.4: Generate integrated debt report for a single student
	 */
	async getStudentIntegratedDebtReport(studentId: string): Promise<StudentIntegratedDebtReport> {
		// Get student with career
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			include: {
				career: true
			}
		});

		if (!student) {
			throw new Error('Alumno no encontrado');
		}

		// Calculate debt summary with agreements (Phase 5.2)
		const debtSummary = await this.calculateDebtSummaryWithAgreements(studentId);

		// Get all agreements for the student
		const agreements = await prisma.paymentAgreement.findMany({
			where: { studentId },
			include: {
				installments: true
			},
			orderBy: [{ agreementYear: 'desc' }, { agreementNumber: 'desc' }]
		});

		// Count agreements by status
		const activeAgreementsCount = agreements.filter((a) => a.status === 'ACTIVE').length;
		const defaultedAgreementsCount = agreements.filter((a) => a.status === 'DEFAULTED').length;
		const completedAgreementsCount = agreements.filter((a) => a.status === 'COMPLETED').length;

		// Build agreement details
		const agreementDetails = agreements.map((agreement) => {
			const installmentPending = agreement.installments
				.filter((inst) => inst.status === 'PENDING' || inst.status === 'PARTIAL')
				.reduce((sum, inst) => sum.add(inst.pendingAmount), new Decimal(0));
			const installmentOverdue = agreement.installments
				.filter((inst) => inst.status === 'OVERDUE')
				.reduce((sum, inst) => sum.add(inst.pendingAmount), new Decimal(0));

			return {
				agreementId: agreement.id,
				agreementNumber: agreement.agreementNumber,
				agreementYear: agreement.agreementYear,
				status: agreement.status,
				originalDebt: agreement.originalDebt,
				paidAmount: agreement.paidAmount,
				pendingAmount: agreement.pendingAmount,
				installmentPending,
				installmentOverdue
			};
		});

		// Calculate agreement debt by status
		const agreementPendingDebt = agreements
			.filter((a) => a.status === 'ACTIVE')
			.reduce((sum, agreement) => {
				const pending = agreement.installments
					.filter((inst) => inst.status === 'PENDING' || inst.status === 'PARTIAL')
					.reduce((instSum, inst) => instSum.add(inst.pendingAmount), new Decimal(0));
				return sum.add(pending);
			}, new Decimal(0));

		const agreementOverdueDebt = agreements
			.filter((a) => a.status === 'ACTIVE')
			.reduce((sum, agreement) => {
				const overdue = agreement.installments
					.filter((inst) => inst.status === 'OVERDUE')
					.reduce((instSum, inst) => instSum.add(inst.pendingAmount), new Decimal(0));
				return sum.add(overdue);
			}, new Decimal(0));

		const agreementDefaultedDebt = agreements
			.filter((a) => a.status === 'DEFAULTED')
			.reduce((sum, agreement) => sum.add(agreement.pendingAmount), new Decimal(0));

		// Calculate effective total debt (uncovered debt + agreement installment debt)
		const effectiveTotalDebt = debtSummary.effectiveDebt.uncoveredDebt.add(
			debtSummary.effectiveDebt.agreementInstallmentPending
		);

		return {
			studentId: student.id,
			studentName: `${student.firstName} ${student.lastName}`.trim(),
			studentDni: student.dni,
			careerName: student.career?.name,
			originalDebtTotal: debtSummary.originalDebt.totalDebt,
			originalDebtCoveredByActiveAgreements: debtSummary.effectiveDebt.agreementCoveredDebt,
			originalDebtStillEnforceable: debtSummary.effectiveDebt.uncoveredDebt,
			agreementPendingDebt,
			agreementOverdueDebt,
			agreementDefaultedDebt,
			effectiveTotalDebt,
			activeAgreementsCount,
			defaultedAgreementsCount,
			completedAgreementsCount,
			agreementDetails
		};
	}

	/**
	 * Phase 5.4: Generate aggregated financial report for multiple students
	 */
	async getAggregatedFinancialReport(studentIds?: string[]): Promise<AggregatedFinancialReport> {
		// If no student IDs provided, get all students with debt or agreements
		let targetStudentIds = studentIds;
		if (!targetStudentIds || targetStudentIds.length === 0) {
			// Get students with pending charges or payment agreements
			const studentsWithDebt = await prisma.studentCharge.findMany({
				where: {
					status: { in: ['PENDING', 'PARTIAL'] }
				},
				select: { studentId: true },
				distinct: ['studentId']
			});

			const studentsWithAgreements = await prisma.paymentAgreement.findMany({
				where: {
					status: { in: ['ACTIVE', 'DEFAULTED'] }
				},
				select: { studentId: true },
				distinct: ['studentId']
			});

			const debtIds = studentsWithDebt.map((s) => s.studentId);
			const agreementIds = studentsWithAgreements.map((s) => s.studentId);
			targetStudentIds = Array.from(new Set([...debtIds, ...agreementIds]));
		}

		// Generate individual reports
		const studentReports: StudentIntegratedDebtReport[] = [];
		for (const studentId of targetStudentIds) {
			try {
				const report = await this.getStudentIntegratedDebtReport(studentId);
				studentReports.push(report);
			} catch (error) {
				// Skip students that cannot be found
				console.warn(`Skipping student ${studentId}: ${error}`);
			}
		}

		// Calculate aggregates
		const totalOriginalDebt = studentReports.reduce(
			(sum, r) => sum.add(r.originalDebtTotal),
			new Decimal(0)
		);
		const totalOriginalDebtCoveredByAgreements = studentReports.reduce(
			(sum, r) => sum.add(r.originalDebtCoveredByActiveAgreements),
			new Decimal(0)
		);
		const totalOriginalDebtStillEnforceable = studentReports.reduce(
			(sum, r) => sum.add(r.originalDebtStillEnforceable),
			new Decimal(0)
		);
		const totalAgreementPendingDebt = studentReports.reduce(
			(sum, r) => sum.add(r.agreementPendingDebt),
			new Decimal(0)
		);
		const totalAgreementOverdueDebt = studentReports.reduce(
			(sum, r) => sum.add(r.agreementOverdueDebt),
			new Decimal(0)
		);
		const totalAgreementDefaultedDebt = studentReports.reduce(
			(sum, r) => sum.add(r.agreementDefaultedDebt),
			new Decimal(0)
		);
		const totalEffectiveDebt = studentReports.reduce(
			(sum, r) => sum.add(r.effectiveTotalDebt),
			new Decimal(0)
		);
		const totalActiveAgreements = studentReports.reduce(
			(sum, r) => sum + r.activeAgreementsCount,
			0
		);
		const totalDefaultedAgreements = studentReports.reduce(
			(sum, r) => sum + r.defaultedAgreementsCount,
			0
		);
		const totalCompletedAgreements = studentReports.reduce(
			(sum, r) => sum + r.completedAgreementsCount,
			0
		);

		return {
			totalStudents: studentReports.length,
			totalOriginalDebt,
			totalOriginalDebtCoveredByAgreements,
			totalOriginalDebtStillEnforceable,
			totalAgreementPendingDebt,
			totalAgreementOverdueDebt,
			totalAgreementDefaultedDebt,
			totalEffectiveDebt,
			totalActiveAgreements,
			totalDefaultedAgreements,
			totalCompletedAgreements,
			studentReports
		};
	}

	/**
	 * Phase 5.4: Get debtor students with integrated debt information
	 */
	async getDebtorStudentsWithAgreements(): Promise<StudentIntegratedDebtReport[]> {
		// Get students with effective debt > 0
		const report = await this.getAggregatedFinancialReport();

		// Filter students with effective debt
		const debtors = report.studentReports.filter((r) => r.effectiveTotalDebt.gt(0));

		// Sort by effective debt descending
		debtors.sort((a, b) => {
			if (b.effectiveTotalDebt.gt(a.effectiveTotalDebt)) return 1;
			if (a.effectiveTotalDebt.gt(b.effectiveTotalDebt)) return -1;
			return 0;
		});

		return debtors;
	}

	/**
	 * Phase 6.1: Batch evaluation of all active payment agreements
	 * Evaluates status for all ACTIVE agreements in a safe, idempotent batch operation
	 *
	 * This method is designed for automated execution (e.g., cron jobs) and manual scripts.
	 * It processes each agreement independently, so errors in one agreement don't affect others.
	 *
	 * @param options - Optional configuration
	 * @param options.dryRun - If true, evaluates without making changes (default: false)
	 * @param options.systemUserId - User ID to use for audit logs (default: 'SYSTEM')
	 * @param options.systemUserName - User name to use for audit logs (default: 'System Batch')
	 *
	 * @returns Summary of batch evaluation results
	 */
	async evaluateAllActiveAgreementsStatus(
		options: {
			dryRun?: boolean;
			systemUserId?: string;
			systemUserName?: string;
		} = {}
	): Promise<{
		totalEvaluated: number;
		installmentsMarkedOverdue: number;
		agreementsCompleted: number;
		agreementsDefaulted: number;
		agreementsUnchanged: number;
		errors: Array<{
			agreementId: string;
			agreementNumber: number;
			agreementYear: number;
			error: string;
		}>;
	}> {
		const { dryRun = false, systemUserId = 'SYSTEM', systemUserName = 'System Batch' } = options;

		// Get all ACTIVE agreements
		const activeAgreements = await prisma.paymentAgreement.findMany({
			where: { status: 'ACTIVE' },
			include: {
				installments: true
			},
			orderBy: [{ agreementYear: 'asc' }, { agreementNumber: 'asc' }]
		});

		const results = {
			totalEvaluated: activeAgreements.length,
			installmentsMarkedOverdue: 0,
			agreementsCompleted: 0,
			agreementsDefaulted: 0,
			agreementsUnchanged: 0,
			errors: [] as Array<{
				agreementId: string;
				agreementNumber: number;
				agreementYear: number;
				error: string;
			}>
		};

		// Process each agreement independently
		for (const agreement of activeAgreements) {
			try {
				if (dryRun) {
					// In dry-run mode, just evaluate without making changes
					const now = new Date();
					const overdueInstallments = agreement.installments.filter(
						(inst) => inst.status === 'PENDING' && inst.dueDate < now
					);

					const totalPaid = agreement.installments.reduce(
						(sum, inst) => sum.add(inst.paidAmount),
						new Decimal(0)
					);
					const totalPending = agreement.installments.reduce(
						(sum, inst) => sum.add(inst.pendingAmount),
						new Decimal(0)
					);

					// Simulate evaluation logic
					if (totalPending.equals(new Decimal(0))) {
						results.agreementsCompleted++;
					} else if (overdueInstallments.length > 0) {
						// Check default rule (e.g., 2+ overdue installments)
						if (overdueInstallments.length >= 2) {
							results.agreementsDefaulted++;
						} else {
							results.installmentsMarkedOverdue += overdueInstallments.length;
						}
					} else {
						results.agreementsUnchanged++;
					}
				} else {
					// In normal mode, execute actual evaluation
					const evaluationResult = await this.evaluateAgreementFinancialStatus(
						agreement.id,
						systemUserId,
						systemUserName
					);

					results.installmentsMarkedOverdue += evaluationResult.overdueMarked;

					if (evaluationResult.statusChanged) {
						if (evaluationResult.newStatus === 'COMPLETED') {
							results.agreementsCompleted++;
						} else if (evaluationResult.newStatus === 'DEFAULTED') {
							results.agreementsDefaulted++;
						}
					} else {
						results.agreementsUnchanged++;
					}
				}
			} catch (error) {
				// Log error but continue processing other agreements
				results.errors.push({
					agreementId: agreement.id,
					agreementNumber: agreement.agreementNumber,
					agreementYear: agreement.agreementYear,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}

		return results;
	}

	/**
	 * Phase 6.2: Batch evaluation of agreement block exceptions
	 * Evaluates and manages block exceptions for all relevant agreements in a safe, idempotent batch operation
	 *
	 * This method is designed for automated execution (e.g., cron jobs) and manual scripts.
	 * It processes each agreement independently, so errors in one agreement don't affect others.
	 *
	 * @param options - Optional configuration
	 * @param options.dryRun - If true, evaluates without making changes (default: false)
	 * @param options.systemUserId - User ID to use for audit logs (default: 'SYSTEM')
	 * @param options.systemUserName - User name to use for audit logs (default: 'System Batch')
	 *
	 * @returns Summary of batch evaluation results
	 */
	async evaluateAllAgreementBlockExceptions(
		options: {
			dryRun?: boolean;
			systemUserId?: string;
			systemUserName?: string;
		} = {}
	): Promise<{
		totalEvaluated: number;
		exceptionsApplied: number;
		exceptionsRevoked: number;
		agreementsUnchanged: number;
		agreementsSkipped: number;
		errors: Array<{
			agreementId: string;
			agreementNumber: number;
			agreementYear: number;
			error: string;
		}>;
	}> {
		const { dryRun = false, systemUserId = 'SYSTEM', systemUserName = 'System Batch' } = options;

		// Get all agreements that need evaluation
		// Include: ACTIVE, DEFAULTED, COMPLETED
		// Exclude: DRAFT, CANCELLED (unless they have active exceptions to clean up)
		const agreementsToEvaluate = await prisma.paymentAgreement.findMany({
			where: {
				status: {
					in: ['ACTIVE', 'DEFAULTED', 'COMPLETED']
				}
			},
			include: {
				installments: true
			},
			orderBy: [{ agreementYear: 'asc' }, { agreementNumber: 'asc' }]
		});

		const results = {
			totalEvaluated: agreementsToEvaluate.length,
			exceptionsApplied: 0,
			exceptionsRevoked: 0,
			agreementsUnchanged: 0,
			agreementsSkipped: 0,
			errors: [] as Array<{
				agreementId: string;
				agreementNumber: number;
				agreementYear: number;
				error: string;
			}>
		};

		// Process each agreement independently
		for (const agreement of agreementsToEvaluate) {
			try {
				if (dryRun) {
					// In dry-run mode, just evaluate without making changes
					const evaluation = await this.evaluateAgreementBlockException(agreement.id);
					const currentException = await this.getActiveAgreementBlockException(agreement.studentId);

					// Simulate what would happen
					if (evaluation.shouldHaveException && !currentException) {
						results.exceptionsApplied++;
					} else if (
						!evaluation.shouldHaveException &&
						currentException &&
						currentException.exceptionAgreementId === agreement.id
					) {
						results.exceptionsRevoked++;
					} else {
						results.agreementsUnchanged++;
					}
				} else {
					// In normal mode, execute actual evaluation
					const blockResult = await this.evaluateAgreementBlockStatus(
						agreement.id,
						systemUserId,
						systemUserName
					);

					if (blockResult.exceptionApplied) {
						results.exceptionsApplied++;
					} else if (blockResult.exceptionRevoked) {
						results.exceptionsRevoked++;
					} else {
						results.agreementsUnchanged++;
					}
				}
			} catch (error) {
				// Log error but continue processing other agreements
				results.errors.push({
					agreementId: agreement.id,
					agreementNumber: agreement.agreementNumber,
					agreementYear: agreement.agreementYear,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}

		return results;
	}
}

// Export singleton instance
export const paymentAgreementService = new PaymentAgreementService();
