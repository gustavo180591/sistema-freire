/**
 * Payment Agreement Service - Phase 2 (Creation and Activation)
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
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
}

// Export singleton instance
export const paymentAgreementService = new PaymentAgreementService();
