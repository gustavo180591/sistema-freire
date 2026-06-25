/**
 * Payment Agreement Service - Phase 3 (Installment Payments)
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
	| 'ALUMNO'
	| 'APODERADO';

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
			(role) => role === 'SUPERADMIN' || role === 'DIRECTOR' || role === 'FINANZAS'
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
				role === 'ALUMNO'
		);
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

		// If user is ALUMNO, only allow viewing their own agreements
		if (userRoles.includes('ALUMNO') && userId && agreement.studentId !== userId) {
			throw new Error('User can only view their own payment agreements');
		}

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

		// If user is ALUMNO, only allow viewing their own agreements
		if (userRoles.includes('ALUMNO') && requestingUserId && studentId !== requestingUserId) {
			throw new Error('User can only view their own payment agreements');
		}

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
		// Check permissions
		if (!this.canViewAgreements(userRoles)) {
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
			const { markedCount, installmentIds } = await this.markOverdueInstallments(
				agreementId,
				tx
			);

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
}

// Export singleton instance
export const paymentAgreementService = new PaymentAgreementService();
