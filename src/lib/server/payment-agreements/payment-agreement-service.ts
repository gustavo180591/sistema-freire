/**
 * Payment Agreement Service - Phase 1 (Base Structure)
 * 
 * IMPORTANT: This is a base structural service for Phase 1 of Payment Agreements.
 * 
 * Current Status:
 * - Schema and migration are ready and validated in temporary database
 * - Service exists as typed base structure with proper types and interfaces
 * - Production methods are intentionally DISABLED until migration is applied to real database
 * - Active business logic will be implemented in Phase 2
 * - DO NOT connect this service from routes/UI yet
 * 
 * Why this approach:
 * - Migration cannot be applied to real database due to academic drift (separate task)
 * - TypeScript compilation must pass without ts-ignore pragmas or type assertions
 * - Service provides type safety and structure for future implementation
 * - Test script validates schema in temporary database with real data
 * 
 * Next Steps (Phase 2):
 * - Apply migration to real database after resolving academic drift
 * - Replace stub methods with actual Prisma operations
 * - Implement business logic for agreement lifecycle
 * - Connect to routes/UI
 */

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Payment Agreement enum types - These match the exact values defined in prisma/schema.prisma
export type PaymentAgreementStatusType = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'DEFAULTED' | 'CANCELLED' | 'REFINANCED';
export type PaymentAgreementInstallmentStatusType = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'WAIVED';
export type PaymentAgreementChargeRelationTypeType = 'REFINANCED' | 'BLOCKED' | 'ASSOCIATED';
export type PaymentAgreementEventTypeType = 'CREATED' | 'ACTIVATED' | 'MODIFIED' | 'CANCELLED' | 'REFINANCED' | 'INSTALLMENT_PAID' | 'INSTALLMENT_OVERDUE' | 'DEFAULTED' | 'STATUS_CHANGED' | 'BLOCK_EXCEPTION' | 'BLOCK_REACTIVATED';

// Error to throw when migration is not applied
const MIGRATION_NOT_APPLIED_ERROR = new Error(
  'Payment Agreement migration (20260620164627_add_payment_agreements_phase1) has not been applied to the database. ' +
  'Please apply the migration before using Payment Agreement features.'
);

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
  installments: {
    installmentNumber: number;
    dueDate: Date;
    amount: Decimal;
  }[];
};

export type UpdateAgreementInput = {
  id: string;
  agreedAmount?: Decimal;
  observations?: string;
  updatedBy: string;
  updatedByName: string;
};

// Payment Agreement Service - Phase 1 (Base Types and Stubs)
// Actual database operations will be implemented after migration is applied
class PaymentAgreementService {
  /**
   * Get next agreement number for a given year (transactional)
   * TODO: Implement after migration is applied
   */
  async getNextAgreementNumber(year: number): Promise<number> {
    throw MIGRATION_NOT_APPLIED_ERROR;
  }

  /**
   * Get agreement by ID
   * TODO: Implement after migration is applied
   */
  async getAgreementById(id: string): Promise<PaymentAgreement | null> {
    throw MIGRATION_NOT_APPLIED_ERROR;
  }

  /**
   * Get all agreements for a student
   * TODO: Implement after migration is applied
   */
  async getStudentAgreements(studentId: string): Promise<PaymentAgreement[]> {
    throw MIGRATION_NOT_APPLIED_ERROR;
  }

  /**
   * Create a payment agreement (DRAFT status)
   * TODO: Implement after migration is applied
   */
  async createAgreement(input: CreateAgreementInput): Promise<PaymentAgreement> {
    throw MIGRATION_NOT_APPLIED_ERROR;
  }
}

// Export singleton instance
export const paymentAgreementService = new PaymentAgreementService();
