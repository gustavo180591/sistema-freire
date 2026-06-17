import { Prisma, PaymentMethod, ChargeStatus, AuditAction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../db/prisma';
import { auditLog } from '../audit';
import { hasPermission } from '../auth/permissions-granular';
import * as DecimalHelpers from './decimal-helpers';

// Financial enum types - These match the exact values defined in prisma/schema.prisma
// Prisma exports these enums at runtime (.prisma/client) but TypeScript types don't include them
// These string literal types ensure type safety while matching Prisma enum values exactly
export type ReceiptStatus = 'ISSUED' | 'CANCELLED';
export type FinancialMovementType = 'CHARGE' | 'PAYMENT' | 'ALLOCATION' | 'RECEIPT' | 'CANCELLATION' | 'ADJUSTMENT' | 'LATE_FEE' | 'DISCOUNT' | 'SCHOLARSHIP' | 'PAYMENT_CANCELLATION';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type LateFeeType = 'PERCENTAGE' | 'FIXED';
export type FinancialBlockType = 'ENROLLMENT' | 'EXAM' | 'COURSE' | 'CERTIFICATE' | 'REPORT' | 'ALL';

// Types for new financial models
export type FinancialMovement = {
  id: string;
  studentId: string;
  movementType: FinancialMovementType;
  entityType: string;
  entityId?: string;
  description: string;
  amount: Decimal;
  balanceBefore: Decimal;
  balanceAfter: Decimal;
  metadata?: Prisma.JsonValue;
  userId: string | null;
  createdAt: Date;
};

export type Receipt = {
  id: string;
  receiptNumber: number;
  receiptYear: number;
  studentId: string;
  studentName: string;
  studentDni?: string;
  studentAddress?: string;
  totalAmount: Decimal;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  issuedAt: Date;
  issuedBy: string;
  issuedByName: string;
  observations?: string;
  status: ReceiptStatus;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelledReason?: string;
  printCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReceiptItem = {
  id: string;
  receiptId: string;
  chargeId?: string;
  concept: string;
  periodLabel?: string;
  baseAmount: Decimal;
  lateFeeAmount: Decimal;
  discountAmount: Decimal;
  finalAmount: Decimal;
  createdAt: Date;
  updatedAt: Date;
};

export type FinancialBlock = {
  id: string;
  studentId: string;
  blockType: FinancialBlockType;
  blockReason: string;
  blockedAt: Date;
  blockedBy: string;
  blockedByName: string;
  debtAmount: Decimal;
  overdueDays?: number;
  exceptionGranted: boolean;
  exceptionBy?: string;
  exceptionAt?: Date;
  exceptionReason?: string;
  unblockedAt?: Date;
  unblockedBy?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Discount = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  value: Decimal;
  applicableTo: string[];
  minAmount: Decimal | null;
  maxAmount: Decimal | null;
  validFrom: Date;
  validUntil: Date | null;
  active: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};

// Types
export type ChargeInput = {
  studentId: string;
  conceptId: string;
  periodLabel: string;
  amount: Decimal;
  dueDate?: Date;
  academicTermId: string;
  notes?: string;
  userId: string;
};

export type PaymentInput = {
  studentId: string;
  amount: Decimal;
  method: PaymentMethod;
  reference?: string;
  paidAt?: Date;
  notes?: string;
  userId: string;
  chargeIds?: string[];
};

export type ReceiptInput = {
  studentId: string;
  studentName: string;
  studentDni?: string;
  studentAddress?: string;
  totalAmount: Decimal;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  issuedBy: string;
  issuedByName: string;
  observations?: string;
  items: ReceiptItemInput[];
};

export type ReceiptItemInput = {
  chargeId?: string;
  concept: string;
  periodLabel?: string;
  baseAmount: Decimal;
  lateFeeAmount: Decimal;
  discountAmount: Decimal;
  finalAmount: Decimal;
};

export type FinancialBlockInput = {
  studentId: string;
  blockType: FinancialBlockType;
  blockReason: string;
  blockedBy: string;
  blockedByName: string;
  debtAmount: Decimal;
  overdueDays?: number;
};

export type FinancialConfigValue = {
  value: Prisma.JsonValue;
  category: string;
  description?: string;
};

// Result types with proper types
export type ChargeResult = {
  charge: Prisma.StudentChargeGetPayload<{}>;
  movements: FinancialMovement[];
};

export type PaymentResult = {
  payment: Prisma.PaymentGetPayload<{}>;
  allocations: PaymentAllocation[];
  movement: Prisma.FinancialMovementGetPayload<{}>;
};

export type PaymentAllocation = {
  paymentId: string;
  chargeId: string;
  amount: Decimal;
  charge?: Prisma.StudentChargeGetPayload<{}>;
};

export type Payment = {
  id: string;
  studentId: string;
  amount: Decimal;
  method: PaymentMethod;
  reference?: string;
  paidAt: Date;
  notes?: string;
  createdAt: Date;
  userId?: string;
  academicTermId?: string;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelledReason?: string;
  allocations: PaymentAllocation[];
};

export type ReceiptResult = {
  receipt: Receipt;
  items: ReceiptItem[];
  movements: FinancialMovement[];
};

export type DebtSummary = {
  totalDebt: Decimal;
  totalPaid: Decimal;
  pendingAmount: Decimal;
  overdueAmount: Decimal;
  pendingCharges: number;
  overdueCharges: number;
};

export type BlockStatus = {
  isBlocked: boolean;
  blocks: FinancialBlock[];
  blockReasons: string[];
};

/**
 * FinancialService - Servicio de dominio centralizado para operaciones financieras
 * 
 * Responsabilidades:
 * - Gestión de cuotas (StudentCharge)
 * - Gestión de pagos (Payment) y asignaciones (PaymentAllocation)
 * - Gestión de recibos (Receipt)
 * - Control de deuda y movimientos financieros (FinancialMovement)
 * - Gestión de bloqueos financieros (FinancialBlock)
 * - Aplicación de becas (Scholarship)
 * - Aplicación de descuentos (Discount)
 * - Cálculo de recargos por mora (LateFee)
 * - Configuración financiera (FinancialConfig)
 * 
 * Todos los métodos deben:
 * - Usar transacciones cuando sea necesario
 * - Validar datos de entrada
 * - Registrar movimientos financieros
 * - Registrar auditoría
 * - Manejar errores apropiadamente
 */
export class FinancialService {
  /**
   * Helper interno para crear cuota (usado por createCharge y createBulkCharges)
   * No valida permisos ni hace auditoría - eso lo hacen los métodos públicos
   */
  private async createChargeInternal(
    input: ChargeInput,
    student: Prisma.StudentGetPayload<{ include: { user: true } }>,
    concept: Prisma.ChargeConceptGetPayload<{}>,
    academicTerm: Prisma.AcademicTermGetPayload<{}>,
    tx: Prisma.TransactionClient
  ): Promise<{ charge: Prisma.StudentChargeGetPayload<{}>; movement: Prisma.FinancialMovementGetPayload<{}>; scholarshipAmount: Decimal; discountAmount: Decimal; finalAmount: Decimal }> {
    // Calcular beca si corresponde
    let scholarshipAmount = DecimalHelpers.zero();
    const scholarships = await tx.scholarship.findMany({
      where: {
        studentId: input.studentId,
        active: true,
        autoApply: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      }
    });

    for (const scholarship of scholarships) {
      if (scholarship.applicableTo.includes(concept.code) || scholarship.applicableTo.includes('*')) {
        const scholarshipValue = DecimalHelpers.percentage(input.amount, scholarship.percentage);
        
        // Validar que la beca no supere el monto base
        if (DecimalHelpers.isGreaterThan(scholarshipValue, input.amount)) {
          throw new Error('La beca no puede superar el monto base de la cuota');
        }

        if (scholarship.maxMonthlyAmount) {
          // Calcular cuánto se aplicó en el mes actual
          const currentMonthStart = new Date();
          currentMonthStart.setDate(1);
          currentMonthStart.setHours(0, 0, 0, 0);
          
          const monthlyCharges = await tx.studentCharge.findMany({
            where: {
              studentId: input.studentId,
              createdAt: { gte: currentMonthStart }
            }
          });
          
          const monthlyApplied = monthlyCharges.reduce(
            (acc: Decimal, c: Prisma.StudentChargeGetPayload<{}>) => 
              DecimalHelpers.add(acc, c.scholarshipApplied),
            DecimalHelpers.zero()
          );

          const totalApplied = DecimalHelpers.add(monthlyApplied, scholarship.appliedAmount);
          const remaining = DecimalHelpers.subtract(scholarship.maxMonthlyAmount, totalApplied);
          
          if (DecimalHelpers.isLessThan(remaining, DecimalHelpers.zero()) || remaining.equals(DecimalHelpers.zero())) {
            throw new Error('La beca ha alcanzado su límite mensual');
          }
          
          const applicable = DecimalHelpers.isLessThan(scholarshipValue, remaining) ? scholarshipValue : remaining;
          scholarshipAmount = DecimalHelpers.add(scholarshipAmount, applicable);
        } else {
          scholarshipAmount = DecimalHelpers.add(scholarshipAmount, scholarshipValue);
        }
      }
    }

    // Validar que la beca no supere el monto base
    if (DecimalHelpers.isGreaterThan(scholarshipAmount, input.amount)) {
      throw new Error('El total de becas no puede superar el monto base de la cuota');
    }

    // Calcular descuento si corresponde
    // REGLA: Los descuentos se aplican sobre el monto base, se acumulan, pero no pueden superar el saldo restante después de beca
    let discountAmount = DecimalHelpers.zero();
    const discounts = await tx.discount.findMany({
      where: {
        active: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ],
        applicableTo: {
          has: concept.code
        }
      },
      orderBy: { priority: 'desc' }
    });

    const baseAfterScholarship = DecimalHelpers.subtract(input.amount, scholarshipAmount);

    for (const discount of discounts) {
      if (discount.minAmount && DecimalHelpers.isLessThan(input.amount, discount.minAmount)) {
        continue;
      }
      if (discount.maxAmount && DecimalHelpers.isGreaterThan(input.amount, discount.maxAmount)) {
        continue;
      }

      let discountValue: Decimal;
      if (discount.discountType === 'PERCENTAGE') {
        discountValue = DecimalHelpers.percentage(input.amount, discount.value);
      } else {
        discountValue = discount.value;
      }

      // Validar que el descuento no supere el saldo restante
      const currentTotalDiscount = DecimalHelpers.add(discountAmount, discountValue);
      if (DecimalHelpers.isGreaterThan(currentTotalDiscount, baseAfterScholarship)) {
        // Limitar el descuento al saldo restante
        discountValue = DecimalHelpers.subtract(baseAfterScholarship, discountAmount);
      }

      discountAmount = DecimalHelpers.add(discountAmount, discountValue);
    }

    // Calcular monto final
    const finalAmount = DecimalHelpers.subtract(baseAfterScholarship, discountAmount);

    // Validar que el monto final no sea negativo
    if (DecimalHelpers.isLessThan(finalAmount, DecimalHelpers.zero())) {
      throw new Error('El monto final no puede ser negativo. Verifique las becas y descuentos aplicados.');
    }

    // Obtener balance actual del alumno
    const currentCharges = await tx.studentCharge.findMany({
      where: { studentId: input.studentId }
    });
    const currentBalance = currentCharges.reduce(
      (acc: Decimal, charge: Prisma.StudentChargeGetPayload<{}>) => 
        DecimalHelpers.add(acc, DecimalHelpers.subtract(charge.finalAmount, charge.paidAmount)),
      DecimalHelpers.zero()
    );

    // Crear cuota
    const charge = await tx.studentCharge.create({
      data: {
        studentId: input.studentId,
        conceptId: input.conceptId,
        periodLabel: input.periodLabel,
        amount: input.amount,
        dueDate: input.dueDate,
        academicTermId: input.academicTermId,
        notes: input.notes,
        userId: input.userId,
        lateFeeApplied: DecimalHelpers.zero(),
        discountApplied: discountAmount,
        scholarshipApplied: scholarshipAmount,
        finalAmount: finalAmount,
        status: ChargeStatus.PENDING
      }
    });

    // Crear movimiento financiero
    const movement = await tx.financialMovement.create({
      data: {
        studentId: input.studentId,
        movementType: 'CHARGE',
        entityType: 'StudentCharge',
        entityId: charge.id,
        description: `Cuota: ${concept.name} - ${input.periodLabel}`,
        amount: finalAmount,
        balanceBefore: currentBalance,
        balanceAfter: DecimalHelpers.add(currentBalance, finalAmount),
        userId: input.userId
      }
    });

    // Actualizar becas aplicadas
    for (const scholarship of scholarships) {
      if (scholarship.applicableTo.includes(concept.code) || scholarship.applicableTo.includes('*')) {
        await tx.scholarship.update({
          where: { id: scholarship.id },
          data: {
            appliedAmount: DecimalHelpers.add(scholarship.appliedAmount, scholarshipAmount),
            lastAppliedAt: new Date()
          }
        });
      }
    }

    return { charge, movement, scholarshipAmount, discountAmount, finalAmount };
  }

  /**
   * Crear una cuota individual
   */
  async createCharge(input: ChargeInput, tx?: Prisma.TransactionClient): Promise<ChargeResult> {
    const client = tx || prisma;

    // Validar permisos
    const userRoles = await prisma.userRole.findMany({
      where: { userId: input.userId },
      include: { role: true }
    });
    const roleCodes = userRoles.map(ur => ur.role.code);
    const hasPermissionResult = await hasPermission(
      roleCodes[0] || '',
      'STUDENT_CHARGE',
      'create'
    );
    if (!hasPermissionResult) {
      throw new Error('No tiene permisos para crear cuotas');
    }

    // Validar alumno existente
    const student = await client.student.findUnique({
      where: { id: input.studentId },
      include: { user: true }
    });
    if (!student) {
      throw new Error('Alumno no encontrado');
    }
    if (student.status !== 'ACTIVE') {
      throw new Error('El alumno no está activo');
    }

    // Validar concepto existente y activo
    const concept = await client.chargeConcept.findUnique({
      where: { id: input.conceptId }
    });
    if (!concept) {
      throw new Error('Concepto no encontrado');
    }
    if (!concept.active) {
      throw new Error('El concepto no está activo');
    }

    // Validar ciclo lectivo
    const academicTerm = await client.academicTerm.findUnique({
      where: { id: input.academicTermId }
    });
    if (!academicTerm) {
      throw new Error('Ciclo lectivo no encontrado');
    }
    if (!academicTerm.active) {
      throw new Error('El ciclo lectivo no está activo');
    }

    // Validar monto positivo
    if (DecimalHelpers.isLessThan(input.amount, DecimalHelpers.zero())) {
      throw new Error('El monto no puede ser negativo');
    }

    // Validar período no vacío
    if (!input.periodLabel || input.periodLabel.trim() === '') {
      throw new Error('El período no puede estar vacío');
    }

    // Verificar duplicado (validación previa)
    const existingCharge = await client.studentCharge.findUnique({
      where: {
        studentId_conceptId_periodLabel_academicTermId: {
          studentId: input.studentId,
          conceptId: input.conceptId,
          periodLabel: input.periodLabel,
          academicTermId: input.academicTermId
        }
      }
    });
    if (existingCharge) {
      throw new Error('Ya existe una cuota para este alumno, concepto, período y ciclo lectivo');
    }

    let result: { charge: Prisma.StudentChargeGetPayload<{}>; movement: Prisma.FinancialMovementGetPayload<{}>; scholarshipAmount: Decimal; discountAmount: Decimal; finalAmount: Decimal };

    try {
      // Crear cuota y movimiento financiero en transacción
      result = await prisma.$transaction(async (tx) => {
        return await this.createChargeInternal(input, student, concept, academicTerm, tx);
      });
    } catch (error) {
      // Capturar errores de constraint de duplicado (P2002)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error('Ya existe una cuota para este alumno, concepto, período y ciclo lectivo');
      }
      throw error;
    }

    // Registrar auditoría (solo si la transacción fue exitosa)
    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'StudentCharge',
      entityId: result.charge.id,
      description: `Creó cuota para alumno ${student.firstName} ${student.lastName}: ${concept.name} - ${input.periodLabel}`,
      userId: input.userId,
      metadata: {
        studentId: input.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        conceptId: input.conceptId,
        conceptName: concept.name,
        periodLabel: input.periodLabel,
        academicTermId: input.academicTermId,
        baseAmount: input.amount.toString(),
        scholarshipApplied: result.scholarshipAmount.toString(),
        discountApplied: result.discountAmount.toString(),
        finalAmount: result.finalAmount.toString()
      }
    });

    return {
      charge: result.charge,
      movements: [result.movement]
    };
  }

  /**
   * Crear cuotas en masa para múltiples alumnos
   */
  async createBulkCharges(inputs: ChargeInput[], tx?: Prisma.TransactionClient): Promise<ChargeResult[]> {
    const client = tx || prisma;

    // Validar permisos
    if (inputs.length === 0) {
      throw new Error('No se proporcionaron cuotas para generar');
    }

    const userId = inputs[0].userId;
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    const roleCodes = userRoles.map(ur => ur.role.code);
    const hasPermissionResult = await hasPermission(
      roleCodes[0] || '',
      'STUDENT_CHARGE',
      'create'
    );
    if (!hasPermissionResult) {
      throw new Error('No tiene permisos para crear cuotas masivas');
    }

    // Validar que todos los inputs tengan el mismo userId
    for (const input of inputs) {
      if (input.userId !== userId) {
        throw new Error('Todos los inputs deben tener el mismo userId');
      }
    }

    // Validación previa completa antes de escribir
    const errors: { input: ChargeInput; error: string }[] = [];
    const validInputs: { input: ChargeInput; student: Prisma.StudentGetPayload<{ include: { user: true } }>; concept: Prisma.ChargeConceptGetPayload<{}>; academicTerm: Prisma.AcademicTermGetPayload<{}> }[] = [];

    for (const input of inputs) {
      try {
        // Validar alumno
        const student = await client.student.findUnique({
          where: { id: input.studentId },
          include: { user: true }
        });
        if (!student) {
          errors.push({ input, error: 'Alumno no encontrado' });
          continue;
        }
        if (student.status !== 'ACTIVE') {
          errors.push({ input, error: 'El alumno no está activo' });
          continue;
        }

        // Validar concepto
        const concept = await client.chargeConcept.findUnique({
          where: { id: input.conceptId }
        });
        if (!concept) {
          errors.push({ input, error: 'Concepto no encontrado' });
          continue;
        }
        if (!concept.active) {
          errors.push({ input, error: 'El concepto no está activo' });
          continue;
        }

        // Validar ciclo lectivo
        const academicTerm = await client.academicTerm.findUnique({
          where: { id: input.academicTermId }
        });
        if (!academicTerm) {
          errors.push({ input, error: 'Ciclo lectivo no encontrado' });
          continue;
        }
        if (!academicTerm.active) {
          errors.push({ input, error: 'El ciclo lectivo no está activo' });
          continue;
        }

        // Validar monto positivo
        if (DecimalHelpers.isLessThan(input.amount, DecimalHelpers.zero())) {
          errors.push({ input, error: 'El monto no puede ser negativo' });
          continue;
        }

        // Validar período no vacío
        if (!input.periodLabel || input.periodLabel.trim() === '') {
          errors.push({ input, error: 'El período no puede estar vacío' });
          continue;
        }

        // Verificar duplicado
        const existingCharge = await client.studentCharge.findUnique({
          where: {
            studentId_conceptId_periodLabel_academicTermId: {
              studentId: input.studentId,
              conceptId: input.conceptId,
              periodLabel: input.periodLabel,
              academicTermId: input.academicTermId
            }
          }
        });
        if (existingCharge) {
          errors.push({ input, error: 'Ya existe una cuota para este alumno, concepto, período y ciclo lectivo' });
          continue;
        }

        validInputs.push({ input, student, concept, academicTerm });
      } catch (error) {
        errors.push({ input, error: error instanceof Error ? error.message : 'Error desconocido' });
      }
    }

    // Si hay errores, lanzar excepción con detalles
    if (errors.length > 0) {
      throw new Error(
        `Validación falló para ${errors.length} cuotas:\n${errors.map(e => `- ${e.error}`).join('\n')}`
      );
    }

    let results: { charge: Prisma.StudentChargeGetPayload<{}>; movement: Prisma.FinancialMovementGetPayload<{}>; scholarshipAmount: Decimal; discountAmount: Decimal; finalAmount: Decimal }[];

    try {
      // Generar cuotas en una sola transacción atómica usando el helper interno
      results = await prisma.$transaction(async (tx) => {
        const chargeResults: { charge: Prisma.StudentChargeGetPayload<{}>; movement: Prisma.FinancialMovementGetPayload<{}>; scholarshipAmount: Decimal; discountAmount: Decimal; finalAmount: Decimal }[] = [];

        for (const { input, student, concept, academicTerm } of validInputs) {
          const result = await this.createChargeInternal(input, student, concept, academicTerm, tx);
          chargeResults.push(result);
        }

        return chargeResults;
      });
    } catch (error) {
      // Capturar errores de constraint de duplicado (P2002)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error('Ya existe una cuota para este alumno, concepto, período y ciclo lectivo');
      }
      throw error;
    }

    // Registrar auditoría de generación masiva (solo si la transacción fue exitosa)
    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'StudentCharge',
      description: `Generó ${results.length} cuotas en masa`,
      userId: userId,
      metadata: {
        totalCharges: results.length,
        chargeIds: results.map(r => r.charge.id)
      }
    });

    return results.map(r => ({
      charge: r.charge,
      movements: [r.movement]
    }));
  }

  /**
   * Aplicar beca a una cuota
   */
  async applyScholarshipToCharge(chargeId: string, scholarshipId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || prisma;

    // Validar cuota existente
    const charge = await client.studentCharge.findUnique({
      where: { id: chargeId },
      include: { concept: true, student: true }
    });
    if (!charge) {
      throw new Error('Cuota no encontrada');
    }

    // Validar beca existente y activa
    const scholarship = await client.scholarship.findUnique({
      where: { id: scholarshipId }
    });
    if (!scholarship) {
      throw new Error('Beca no encontrada');
    }
    if (!scholarship.active) {
      throw new Error('La beca no está activa');
    }
    if (scholarship.studentId !== charge.studentId) {
      throw new Error('La beca no pertenece al alumno de la cuota');
    }

    // Validar permisos
    const userRoles = await prisma.userRole.findMany({
      where: { userId: charge.userId || '' },
      include: { role: true }
    });
    const roleCodes = userRoles.map(ur => ur.role.code);
    const hasPermissionResult = await hasPermission(
      roleCodes[0] || '',
      'STUDENT_CHARGE',
      'update'
    );
    if (!hasPermissionResult) {
      throw new Error('No tiene permisos para aplicar becas');
    }

    // Calcular beca
    const scholarshipValue = DecimalHelpers.percentage(charge.amount, scholarship.percentage);
    if (scholarship.maxMonthlyAmount) {
      const remaining = DecimalHelpers.subtract(scholarship.maxMonthlyAmount, scholarship.appliedAmount);
      if (DecimalHelpers.isLessThan(remaining, scholarshipValue)) {
        throw new Error('La beca no tiene saldo suficiente');
      }
    }

    // Calcular descuentos para el monto final
    const discounts = await client.discount.findMany({
      where: {
        active: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ],
        applicableTo: {
          has: charge.concept.code
        }
      },
      orderBy: { priority: 'desc' }
    });

    let discountAmount = DecimalHelpers.zero();
    for (const discount of discounts) {
      if (discount.minAmount && DecimalHelpers.isLessThan(charge.amount, discount.minAmount)) {
        continue;
      }
      if (discount.maxAmount && DecimalHelpers.isGreaterThan(charge.amount, discount.maxAmount)) {
        continue;
      }

      if (discount.discountType === 'PERCENTAGE') {
        const discountValue = DecimalHelpers.percentage(charge.amount, discount.value);
        discountAmount = DecimalHelpers.add(discountAmount, discountValue);
      } else {
        discountAmount = DecimalHelpers.add(discountAmount, discount.value);
      }
    }

    // Calcular nuevo monto final
    const baseAfterScholarship = DecimalHelpers.subtract(charge.amount, scholarshipValue);
    const finalAmount = DecimalHelpers.subtract(baseAfterScholarship, discountAmount);

    // Aplicar beca en transacción
    await prisma.$transaction(async (tx) => {

      // Actualizar cuota
      await tx.studentCharge.update({
        where: { id: chargeId },
        data: {
          scholarshipApplied: scholarshipValue,
          finalAmount: finalAmount
        }
      });

      // Actualizar beca aplicada
      await tx.scholarship.update({
        where: { id: scholarshipId },
        data: {
          appliedAmount: DecimalHelpers.add(scholarship.appliedAmount, scholarshipValue),
          lastAppliedAt: new Date()
        }
      });

      // Crear movimiento financiero
      const currentCharges = await tx.studentCharge.findMany({
        where: { studentId: charge.studentId }
      });
      const currentBalance = currentCharges.reduce(
        (acc: Decimal, c: Prisma.StudentChargeGetPayload<{}>) => 
          DecimalHelpers.add(acc, DecimalHelpers.subtract(c.finalAmount, c.paidAmount)),
        DecimalHelpers.zero()
      );

      await tx.financialMovement.create({
        data: {
          studentId: charge.studentId,
          movementType: 'SCHOLARSHIP',
          entityType: 'StudentCharge',
          entityId: chargeId,
          description: `Beca aplicada: ${scholarship.name} - ${charge.concept.name}`,
          amount: scholarshipValue,
          balanceBefore: DecimalHelpers.subtract(currentBalance, scholarshipValue),
          balanceAfter: currentBalance,
          userId: charge.userId
        }
      });
    });

    // Registrar auditoría
    await auditLog({
      action: AuditAction.UPDATE,
      entityType: 'StudentCharge',
      entityId: chargeId,
      description: `Aplicó beca ${scholarship.name} a cuota de alumno ${charge.student.firstName} ${charge.student.lastName}`,
      userId: charge.userId || '',
      metadata: {
        chargeId,
        scholarshipId,
        scholarshipName: scholarship.name,
        scholarshipPercentage: scholarship.percentage.toString(),
        scholarshipApplied: scholarshipValue.toString(),
        finalAmount: finalAmount.toString()
      }
    });
  }

  /**
   * Aplicar descuento a una cuota
   */
  async applyDiscountToCharge(chargeId: string, discountId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || prisma;

    // Validar cuota existente
    const charge = await client.studentCharge.findUnique({
      where: { id: chargeId },
      include: { concept: true, student: true }
    });
    if (!charge) {
      throw new Error('Cuota no encontrada');
    }

    // Validar descuento existente y activo
    const discount = await client.discount.findUnique({
      where: { id: discountId }
    });
    if (!discount) {
      throw new Error('Descuento no encontrado');
    }
    if (!discount.active) {
      throw new Error('El descuento no está activo');
    }
    if (discount.validFrom > new Date()) {
      throw new Error('El descuento aún no es válido');
    }
    if (discount.validUntil && discount.validUntil < new Date()) {
      throw new Error('El descuento ha expirado');
    }
    if (!discount.applicableTo.includes(charge.concept.code) && !discount.applicableTo.includes('*')) {
      throw new Error('El descuento no es aplicable a este concepto');
    }

    // Validar permisos
    const userRoles = await prisma.userRole.findMany({
      where: { userId: charge.userId || '' },
      include: { role: true }
    });
    const roleCodes = userRoles.map(ur => ur.role.code);
    const hasPermissionResult = await hasPermission(
      roleCodes[0] || '',
      'STUDENT_CHARGE',
      'update'
    );
    if (!hasPermissionResult) {
      throw new Error('No tiene permisos para aplicar descuentos');
    }

    // Calcular descuento
    let discountValue = DecimalHelpers.zero();
    if (discount.discountType === 'PERCENTAGE') {
      discountValue = DecimalHelpers.percentage(charge.amount, discount.value);
    } else {
      discountValue = discount.value;
    }

    // Calcular nuevo monto final
    const baseAfterScholarship = DecimalHelpers.subtract(charge.amount, charge.scholarshipApplied);
    const finalAmount = DecimalHelpers.subtract(baseAfterScholarship, discountValue);

    // Aplicar descuento en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar cuota
      await tx.studentCharge.update({
        where: { id: chargeId },
        data: {
          discountApplied: discountValue,
          finalAmount: finalAmount
        }
      });

      // Crear movimiento financiero
      const currentCharges = await tx.studentCharge.findMany({
        where: { studentId: charge.studentId }
      });
      const currentBalance = currentCharges.reduce(
        (acc: Decimal, c: Prisma.StudentChargeGetPayload<{}>) => 
          DecimalHelpers.add(acc, DecimalHelpers.subtract(c.finalAmount, c.paidAmount)),
        DecimalHelpers.zero()
      );

      await tx.financialMovement.create({
        data: {
          studentId: charge.studentId,
          movementType: 'DISCOUNT',
          entityType: 'StudentCharge',
          entityId: chargeId,
          description: `Descuento aplicado: ${discount.name} - ${charge.concept.name}`,
          amount: discountValue,
          balanceBefore: DecimalHelpers.subtract(currentBalance, discountValue),
          balanceAfter: currentBalance,
          userId: charge.userId
        }
      });
    });

    // Registrar auditoría
    await auditLog({
      action: AuditAction.UPDATE,
      entityType: 'StudentCharge',
      entityId: chargeId,
      description: `Aplicó descuento ${discount.name} a cuota de alumno ${charge.student.firstName} ${charge.student.lastName}`,
      userId: charge.userId || '',
      metadata: {
        chargeId,
        discountId,
        discountName: discount.name,
        discountType: discount.discountType,
        discountValue: discount.value.toString(),
        discountApplied: discountValue.toString(),
        finalAmount: finalAmount.toString()
      }
    });
  }

  /**
   * Calcular recargo por mora
   */
  async calculateLateFee(chargeId: string, tx?: Prisma.TransactionClient): Promise<void> {
    throw new Error('Not implemented yet - Phase 5');
  }


  /**
   * Generar recibo institucional
   */
  async generateReceipt(input: ReceiptInput, tx?: Prisma.TransactionClient): Promise<ReceiptResult> {
    throw new Error('Not implemented yet - Phase 4');
  }

  /**
   * Obtener siguiente número de recibo (transaccional y seguro contra concurrencia)
   */
  async getNextReceiptNumber(year: number, tx?: Prisma.TransactionClient): Promise<number> {
    throw new Error('Not implemented yet - Phase 4');
  }

  /**
   * Calcular resumen de deuda de un alumno
   */
  async calculateDebtSummary(studentId: string): Promise<{
		totalDebt: Decimal;
		overdueDebt: Decimal;
		pendingBalance: Decimal;
		pendingCharges: number;
		overdueCharges: number;
		partialCharges: number;
		paidCharges: number;
		cancelledCharges: number;
	}> {
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

			// Count by status
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

				// Check if overdue
				if (charge.dueDate && new Date(charge.dueDate) < now) {
					overdueDebt = overdueDebt.add(remaining);
					overdueCharges++;
				} else {
					pendingCharges++;
				}

				// Check if partial payment
				if (paidAmount.gt(0)) {
					partialCharges++;
				}
			}
		}

		return {
			totalDebt,
			overdueDebt,
			pendingBalance,
			pendingCharges,
			overdueCharges,
			partialCharges,
			paidCharges,
			cancelledCharges
		};
	}

	async getStudentFinancialStatus(studentId: string): Promise<{
		student: any;
		pendingCharges: any[];
		overdueCharges: any[];
		payments: any[];
		receipts: any[];
		totalDebt: Decimal;
		overdueDebt: Decimal;
		hasActiveBlock: boolean;
		blockRules: string[];
	}> {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			include: {
				user: true
			}
		});

		if (!student) {
			throw new Error('Alumno no encontrado');
		}

		const debtSummary = await this.calculateDebtSummary(studentId);

		const pendingCharges = await prisma.studentCharge.findMany({
			where: {
				studentId,
				status: { in: ['PENDING', 'PARTIAL'] }
			},
			include: {
				concept: true,
				academicTerm: true
			},
			orderBy: {
				dueDate: 'asc'
			}
		});

		const overdueCharges = await prisma.studentCharge.findMany({
			where: {
				studentId,
				dueDate: { lt: new Date() },
				status: { in: ['PENDING', 'PARTIAL'] }
			},
			include: {
				concept: true,
				academicTerm: true
			}
		});

		const payments = await prisma.payment.findMany({
			where: {
				studentId,
				isCancelled: false
			},
			include: {
				allocations: true
			},
			orderBy: {
				paidAt: 'desc'
			}
		});

		// Use raw query to avoid Prisma enum type issues
		const receipts = await prisma.$queryRaw<Array<any>>`
			SELECT * FROM receipts
			WHERE "studentId" = ${studentId}
			AND status = 'ISSUED'
			ORDER BY "issuedAt" DESC
		`;

		const activeBlocks = await prisma.financialBlock.findMany({
			where: {
				studentId,
				isActive: true
			}
		});

		const blockRules: string[] = [];
		if (activeBlocks.length > 0) {
			blockRules.push('Deuda vencida');
			if (debtSummary.overdueCharges > 0) {
				blockRules.push(`${debtSummary.overdueCharges} cuotas vencidas`);
			}
		}

		return {
			student,
			pendingCharges,
			overdueCharges,
			payments,
			receipts,
			totalDebt: debtSummary.totalDebt,
			overdueDebt: debtSummary.overdueDebt,
			hasActiveBlock: activeBlocks.length > 0,
			blockRules
		};
	}

	async evaluateFinancialBlocks(
		studentId: string,
		userId: string,
		tx?: Prisma.TransactionClient
	): Promise<void> {
		const client = tx || prisma;
		const debtSummary = await this.calculateDebtSummary(studentId);

		// Get configuration rules
		const config = await client.financialConfig.findMany({
			where: { category: 'BLOCK_RULES' }
		});

		const rules = config.reduce((acc, cfg) => {
			acc[cfg.key] = cfg.value;
			return acc;
		}, {} as Record<string, any>);

		// Default rules if not configured
		const blockOnOverdue = rules.blockOnOverdue !== false;
		const blockOverdueAmount = rules.blockOverdueAmount ? new Decimal(rules.blockOverdueAmount) : new Decimal(0);
		const blockOverdueCharges = rules.blockOverdueCharges || 1;
		const graceDays = rules.graceDays || 0;

		// Check if student should be blocked
		let shouldBlock = false;
		let blockReason = '';
		let blockType: FinancialBlockType = 'ALL';
		let overdueDays = 0;

		if (blockOnOverdue && debtSummary.overdueDebt.gt(0)) {
			// Check grace period
			const overdueCharges = await client.studentCharge.findMany({
				where: {
					studentId,
					dueDate: { lt: new Date() },
					status: { in: ['PENDING', 'PARTIAL'] }
				}
			});

			if (overdueCharges.length > 0) {
				const mostOverdue = overdueCharges.reduce((max, charge) => {
					const days = Math.floor((new Date().getTime() - new Date(charge.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
					return days > max ? days : max;
				}, 0);

				overdueDays = mostOverdue;

				if (overdueDays > graceDays) {
					shouldBlock = true;
					blockReason = `Deuda vencida de ${debtSummary.overdueDebt.toString()} ARS (${debtSummary.overdueCharges} cuotas, ${overdueDays} días)`;

					// Determine block type based on amount/charges
					if (debtSummary.overdueDebt.gte(blockOverdueAmount) || debtSummary.overdueCharges >= blockOverdueCharges) {
						blockType = 'ALL';
					} else {
						blockType = 'ENROLLMENT';
					}
				}
			}
		}

		// Get existing active blocks
		const existingBlocks = await client.financialBlock.findMany({
			where: {
				studentId,
				isActive: true
			}
		});

		if (shouldBlock) {
			// Check if block already exists
			const existingBlock = existingBlocks.find((b) => b.blockType === blockType);

			if (!existingBlock) {
				// Create new block
				await client.financialBlock.create({
					data: {
						studentId,
						blockType,
						blockReason,
						blockedBy: userId,
						blockedByName: await this.getUserName(userId),
						debtAmount: debtSummary.overdueDebt,
						overdueDays,
						isActive: true
					}
				});

				// Audit
				await auditLog({
					userId,
					action: 'CREATE',
					entityType: 'FinancialBlock',
					entityId: studentId,
					description: `Bloqueó a alumno por deuda: ${blockReason}`,
					metadata: {
						studentId,
						blockType,
						blockReason,
						debtAmount: debtSummary.overdueDebt.toString(),
						overdueCharges: debtSummary.overdueCharges,
						overdueDays
					}
				});
			} else {
				// Update existing block
				await client.financialBlock.update({
					where: { id: existingBlock.id },
					data: {
						debtAmount: debtSummary.overdueDebt,
						overdueDays,
						blockReason
					}
				});
			}
		} else {
			// Deactivate blocks if debt is resolved
			for (const block of existingBlocks) {
				await client.financialBlock.update({
					where: { id: block.id },
					data: {
						isActive: false,
						unblockedAt: new Date(),
						unblockedBy: userId
					}
				});

				// Audit
				await auditLog({
					userId,
					action: 'UPDATE',
					entityType: 'FinancialBlock',
					entityId: block.id,
					description: `Desbloqueó a alumno (deuda resuelta)`,
					metadata: {
						studentId,
						blockType: block.blockType,
						previousReason: block.blockReason
					}
				});
			}
		}
	}

  /**
   * Verificar si un alumno tiene bloqueos activos
   */
  async checkBlockStatus(studentId: string, blockType?: FinancialBlockType): Promise<BlockStatus> {
    throw new Error('Not implemented yet - Phase 5');
  }

	async checkFinancialBlock(studentId: string, blockType?: FinancialBlockType): Promise<{
		blocked: boolean;
		reason: string | null;
		debtAmount: Decimal | null;
		blockedAt: Date | null;
		blockType: FinancialBlockType | null;
		hasException: boolean;
		exceptionBy: string | null;
		exceptionReason: string | null;
	}> {
		const where: any = {
			studentId,
			isActive: true
		};

		if (blockType) {
			where.blockType = blockType;
		}

		const block = await prisma.financialBlock.findFirst({
			where,
			orderBy: {
				blockedAt: 'desc'
			}
		});

		if (!block) {
			return {
				blocked: false,
				reason: null,
				debtAmount: null,
				blockedAt: null,
				blockType: null,
				hasException: false,
				exceptionBy: null,
				exceptionReason: null
			};
		}

		return {
			blocked: !block.exceptionGranted,
			reason: block.blockReason,
			debtAmount: block.debtAmount,
			blockedAt: block.blockedAt,
			blockType: block.blockType,
			hasException: block.exceptionGranted,
			exceptionBy: block.exceptionBy,
			exceptionReason: block.exceptionReason
		};
	}

	async createFinancialBlockException(params: {
		studentId: string;
		blockType: FinancialBlockType;
		reason: string;
		userId: string;
		expiresAt?: Date;
	}): Promise<void> {
		const { studentId, blockType, reason, userId, expiresAt } = params;

		// Validate permissions
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canManage = await hasPermission(roleCodes[0] || '', 'FINANCIAL_BLOCK', 'update');
		if (!canManage) {
			throw new Error('No tiene permisos para crear excepciones de bloqueo');
		}

		// Get active block
		// Use raw query to avoid Prisma enum type issues
		const blocks = await prisma.$queryRaw<Array<any>>`
			SELECT * FROM financial_blocks
			WHERE "studentId" = ${studentId}
			AND "blockType" = ${blockType}
			AND "isActive" = true
			LIMIT 1
		`;

		if (!blocks || blocks.length === 0) {
			throw new Error('No hay bloqueo activo de este tipo para el alumno');
		}

		const block = blocks[0];

		// Update block with exception
		await prisma.financialBlock.update({
			where: { id: block.id },
			data: {
				exceptionGranted: true,
				exceptionBy: userId,
				exceptionAt: new Date(),
				exceptionReason: reason
			}
		});

		// Audit
		await auditLog({
			userId,
			action: 'UPDATE',
			entityType: 'FinancialBlock',
			entityId: block.id,
			description: `Otorgó excepción de bloqueo ${blockType} para alumno`,
			metadata: {
				studentId,
				blockType,
				reason,
				expiresAt: expiresAt?.toISOString()
			}
		});
	}

	async revokeFinancialBlockException(params: {
		studentId: string;
		blockType: FinancialBlockType;
		userId: string;
	}): Promise<void> {
		const { studentId, blockType, userId } = params;

		// Validate permissions
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canManage = await hasPermission(roleCodes[0] || '', 'FINANCIAL_BLOCK', 'update');
		if (!canManage) {
			throw new Error('No tiene permisos para revocar excepciones de bloqueo');
		}

		// Get active block with exception
		// Use raw query to avoid Prisma enum type issues
		const blocks = await prisma.$queryRaw<Array<any>>`
			SELECT * FROM financial_blocks
			WHERE "studentId" = ${studentId}
			AND "blockType" = ${blockType}
			AND "isActive" = true
			AND "exceptionGranted" = true
			LIMIT 1
		`;

		if (!blocks || blocks.length === 0) {
			throw new Error('No hay excepción activa para revocar');
		}

		const block = blocks[0];

		// Revoke exception
		await prisma.financialBlock.update({
			where: { id: block.id },
			data: {
				exceptionGranted: false,
				exceptionBy: null,
				exceptionAt: null,
				exceptionReason: null
			}
		});

		// Audit
		await auditLog({
			userId,
			action: 'UPDATE',
			entityType: 'FinancialBlock',
			entityId: block.id,
			description: `Revocó excepción de bloqueo ${blockType} para alumno`,
			metadata: {
				studentId,
				blockType
			}
		});
	}

  /**
   * Crear bloqueo financiero
   */
  async createBlock(input: FinancialBlockInput, tx?: Prisma.TransactionClient): Promise<void> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Quitar bloqueo financiero
   */
  async removeBlock(blockId: string, userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Otorgar excepción de bloqueo
   */
  async grantBlockException(blockId: string, userId: string, reason: string, tx?: Prisma.TransactionClient): Promise<void> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Obtener configuración financiera
   */
  async getConfig(key: string): Promise<Prisma.JsonValue> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Establecer configuración financiera
   */
  async setConfig(key: string, value: FinancialConfigValue, userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Obtener historial financiero de un alumno
   */
  async getFinancialHistory(studentId: string, options?: {
    limit?: number;
    offset?: number;
    movementType?: FinancialMovementType;
    entityType?: string;
  }): Promise<FinancialMovement[]> {
    throw new Error('Not implemented yet - Phase 6');
  }

  /**
   * Validar si una acción está permitida según bloqueos financieros
   */
  async validateActionAllowed(studentId: string, action: FinancialBlockType): Promise<boolean> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Actualizar estado de vencimiento de cuotas
   */
  async updateOverdueStatus(tx?: Prisma.TransactionClient): Promise<void> {
    throw new Error('Not implemented yet - Phase 5');
  }

  /**
   * Obtener cuotas pendientes de un alumno
   */
  async getPendingCharges(studentId: string): Promise<Prisma.StudentChargeGetPayload<{}>[]> {
    return prisma.studentCharge.findMany({
      where: {
        studentId,
        status: ChargeStatus.PENDING
      },
      include: {
        concept: true,
        academicTerm: true
      },
      orderBy: {
        dueDate: 'asc'
      }
    });
  }

  /**
   * Obtener pagos de un alumno
   */
  async getPayments(studentId: string): Promise<Prisma.PaymentGetPayload<{}>[]> {
    throw new Error('Not implemented yet - Phase 3');
  }

  /**
   * Obtener recibos de un alumno
   */
  async getReceipts(studentId: string): Promise<Receipt[]> {
    throw new Error('Not implemented yet - Phase 4');
  }

  /**
   * Obtener becas activas de un alumno
   */
  async getActiveScholarships(studentId: string): Promise<Prisma.ScholarshipGetPayload<{}>[]> {
    return prisma.scholarship.findMany({
      where: {
        studentId,
        active: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Obtener descuentos activos
   */
  async getActiveDiscounts(): Promise<Discount[]> {
    const discounts = await prisma.discount.findMany({
      where: {
        active: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      orderBy: {
        priority: 'desc'
      }
    });

    return discounts.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      discountType: d.discountType as DiscountType,
      value: d.value,
      applicableTo: d.applicableTo,
      minAmount: d.minAmount,
      maxAmount: d.maxAmount,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      active: d.active,
      priority: d.priority,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
  }

  /**
   * Registrar un pago
   */
  async registerPayment(input: PaymentInput): Promise<PaymentResult> {
    const { studentId, amount, method, reference, paidAt, notes, userId, chargeIds } = input;

    // Validar alumno existente
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    });
    if (!student) {
      throw new Error('Alumno no encontrado');
    }
    if (student.status !== 'ACTIVE') {
      throw new Error('El alumno no está activo');
    }

    // Validar permisos
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    const roleCodes = userRoles.map(ur => ur.role.code);
    const hasPermissionResult = await hasPermission(
      roleCodes[0] || '',
      'PAYMENT',
      'create'
    );
    if (!hasPermissionResult) {
      throw new Error('No tiene permisos para registrar pagos');
    }

    // Validar monto positivo
    if (DecimalHelpers.isLessThan(amount, DecimalHelpers.zero())) {
      throw new Error('El monto no puede ser negativo');
    }
    if (amount.equals(DecimalHelpers.zero())) {
      throw new Error('El monto no puede ser cero');
    }

    // Validar cuotas pendientes si se especifican
    let pendingCharges: Prisma.StudentChargeGetPayload<{}>[] = [];
    let totalDebt = DecimalHelpers.zero();

    if (chargeIds && chargeIds.length > 0) {
      pendingCharges = await prisma.studentCharge.findMany({
        where: {
          id: { in: chargeIds },
          studentId,
          status: { in: ['PENDING', 'PARTIAL'] }
        }
      });

      if (pendingCharges.length !== chargeIds.length) {
        throw new Error('Algunas cuotas no existen o no están pendientes');
      }

      totalDebt = pendingCharges.reduce(
        (acc: Decimal, charge) => DecimalHelpers.add(acc, DecimalHelpers.subtract(charge.finalAmount, charge.paidAmount)),
        DecimalHelpers.zero()
      );

      // Validar que el monto no supere la deuda seleccionada
      if (DecimalHelpers.isGreaterThan(amount, totalDebt)) {
        throw new Error('El monto del pago no puede superar la deuda seleccionada');
      }
    } else {
      // Si no se especifican cuotas, obtener todas las pendientes
      pendingCharges = await prisma.studentCharge.findMany({
        where: {
          studentId,
          status: { in: ['PENDING', 'PARTIAL'] }
        },
        orderBy: { dueDate: 'asc' }
      });

      totalDebt = pendingCharges.reduce(
        (acc: Decimal, charge) => DecimalHelpers.add(acc, DecimalHelpers.subtract(charge.finalAmount, charge.paidAmount)),
        DecimalHelpers.zero()
      );

      if (DecimalHelpers.isGreaterThan(amount, totalDebt)) {
        throw new Error('El monto del pago no puede superar la deuda total del alumno');
      }
    }

    // Validar referencia duplicada si se proporciona
    if (reference) {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          method,
          reference,
          isCancelled: false
        }
      });
      if (existingPayment) {
        throw new Error('Ya existe un pago con esta referencia');
      }
    }

    // Ejecutar registro de pago, allocations y recálculo de bloqueos en transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      // Crear pago
      const payment = await tx.payment.create({
        data: {
          studentId,
          amount,
          method: method,
          reference,
          paidAt: paidAt || new Date(),
          notes,
          userId,
          academicTermId: pendingCharges[0]?.academicTermId || null
        }
      });

      // Asignar pago a cuotas (FIFO automático si no se especifican cuotas)
      const allocations = await this.allocatePaymentInternal(
        payment.id,
        amount,
        pendingCharges,
        tx
      );

      // Crear movimiento financiero
      const movement = await tx.financialMovement.create({
        data: {
          studentId,
          movementType: 'PAYMENT',
          amount,
          entityType: 'Payment',
          entityId: payment.id,
          description: `Pago de ${student.user.firstName} ${student.user.lastName} - ${method}`,
          balanceBefore: DecimalHelpers.zero(),
          balanceAfter: DecimalHelpers.zero(),
          userId
        }
      });

      // Recalculate debt and blocks within the same transaction
      await this.evaluateFinancialBlocks(studentId, userId, tx);

      return { payment, allocations, movement };
    });

    // Registrar auditoría
    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'Payment',
      description: `Registró pago de ${student.user.firstName} ${student.user.lastName} - $${amount.toString()}`,
      userId,
      metadata: {
        paymentId: result.payment.id,
        studentId,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        amount: amount.toString(),
        method,
        reference,
        chargeIds: result.allocations.map(a => a.chargeId),
        allocations: result.allocations.map(a => ({ chargeId: a.chargeId, amount: a.amount.toString() }))
      }
    });

    return {
      payment: result.payment,
      allocations: result.allocations,
      movement: result.movement
    };
  }

  /**
   * Asignar pago a cuotas (helper interno)
   */
  private async allocatePaymentInternal(
    paymentId: string,
    paymentAmount: Decimal,
    charges: Prisma.StudentChargeGetPayload<{}>[],
    tx: Prisma.TransactionClient
  ): Promise<PaymentAllocation[]> {
    const allocations: PaymentAllocation[] = [];
    let remainingAmount = paymentAmount;

    // Ordenar cuotas por fecha de vencimiento (FIFO)
    const sortedCharges = [...charges].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    for (const charge of sortedCharges) {
      if (DecimalHelpers.isLessThan(remainingAmount, DecimalHelpers.zero()) || remainingAmount.equals(DecimalHelpers.zero())) {
        break;
      }

      const chargeBalance = DecimalHelpers.subtract(charge.finalAmount, charge.paidAmount);
      if (DecimalHelpers.isLessThan(chargeBalance, DecimalHelpers.zero()) || chargeBalance.equals(DecimalHelpers.zero())) {
        continue;
      }

      const allocationAmount = DecimalHelpers.isLessThan(remainingAmount, chargeBalance)
        ? remainingAmount
        : chargeBalance;

      // Crear allocation
      await tx.paymentAllocation.create({
        data: {
          paymentId,
          chargeId: charge.id,
          amount: allocationAmount
        }
      });

      // Actualizar cuota
      const newPaidAmount = DecimalHelpers.add(charge.paidAmount, allocationAmount);
      let newStatus: ChargeStatus = charge.status;

      if (newPaidAmount.equals(charge.finalAmount)) {
        newStatus = ChargeStatus.PAID;
      } else if (DecimalHelpers.isGreaterThan(newPaidAmount, DecimalHelpers.zero())) {
        newStatus = ChargeStatus.PARTIAL;
      }

      await tx.studentCharge.update({
        where: { id: charge.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      allocations.push({
        paymentId,
        chargeId: charge.id,
        amount: allocationAmount
      });

      remainingAmount = DecimalHelpers.subtract(remainingAmount, allocationAmount);
    }

    return allocations;
  }

  /**
   * Anular un pago
   */
  async cancelPayment(paymentId: string, reason: string, userId: string): Promise<void> {
    // Validar pago existente
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        allocations: {
          include: { charge: true }
        },
        student: { include: { user: true } }
      }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    if (payment.isCancelled) {
      throw new Error('El pago ya está anulado');
    }

    // Validar permisos
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    const roleCodes = userRoles.map(ur => ur.role.code);
    const hasPermissionResult = await hasPermission(
      roleCodes[0] || '',
      'PAYMENT',
      'delete'
    );
    if (!hasPermissionResult) {
      throw new Error('No tiene permisos para anular pagos');
    }

    // Guardar valores anteriores para auditoría
    const previousValues = {
      amount: payment.amount.toString(),
      method: payment.method,
      reference: payment.reference,
      allocations: payment.allocations.map(a => ({
        chargeId: a.chargeId,
        amount: a.amount.toString()
      }))
    };

    // Ejecutar anulación en transacción atómica
    await prisma.$transaction(async (tx) => {
      // Revertir allocations
      for (const allocation of payment.allocations) {
        const charge = allocation.charge;
        const newPaidAmount = DecimalHelpers.subtract(charge.paidAmount, allocation.amount);
        let newStatus: ChargeStatus = charge.status;

        if (newPaidAmount.equals(DecimalHelpers.zero())) {
          newStatus = ChargeStatus.PENDING;
        } else if (DecimalHelpers.isGreaterThan(newPaidAmount, DecimalHelpers.zero())) {
          newStatus = ChargeStatus.PARTIAL;
        }

        await tx.studentCharge.update({
          where: { id: charge.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        });

        // Eliminar allocation
        await tx.paymentAllocation.delete({
          where: {
            paymentId_chargeId: {
              paymentId,
              chargeId: allocation.chargeId
            }
          }
        });
      }

      // Marcar pago como anulado
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancelledReason: reason
        }
      });

      // Crear movimiento financiero de cancelación
      await tx.financialMovement.create({
        data: {
          studentId: payment.studentId,
          movementType: 'CANCELLATION',
          amount: payment.amount,
          entityType: 'Payment',
          entityId: paymentId,
          description: `Anulación de pago de ${payment.student.user.firstName} ${payment.student.user.lastName} - $${payment.amount.toString()}`,
          balanceBefore: DecimalHelpers.zero(),
          balanceAfter: DecimalHelpers.zero(),
          userId
        }
      });

      // Recalculate debt and blocks within the same transaction
      await this.evaluateFinancialBlocks(payment.studentId, userId, tx);
    });

    // Registrar auditoría
    await auditLog({
      action: AuditAction.DELETE,
      entityType: 'Payment',
      description: `Anuló pago de ${payment.student.user.firstName} ${payment.student.user.lastName} - $${payment.amount.toString()}`,
      userId,
      metadata: {
        paymentId,
        studentId: payment.studentId,
        studentName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
        reason,
        previousValues,
        newValues: {
          isCancelled: true,
          cancelledAt: new Date().toISOString(),
          cancelledBy: userId
        }
      }
    });
  }

  /**
   * Obtener pagos de un alumno
   */
  async getStudentPayments(studentId: string): Promise<Payment[]> {
    const payments = await prisma.payment.findMany({
      where: {
        studentId,
        isCancelled: false
      },
      include: {
        allocations: {
          include: { charge: true }
        },
        user: true
      },
      orderBy: { paidAt: 'desc' }
    });

    return payments.map(p => ({
      id: p.id,
      studentId: p.studentId,
      amount: p.amount,
      method: p.method,
      reference: p.reference || undefined,
      paidAt: p.paidAt,
      notes: p.notes || undefined,
      createdAt: p.createdAt,
      userId: p.userId || undefined,
      academicTermId: p.academicTermId || undefined,
      isCancelled: p.isCancelled,
      cancelledAt: p.cancelledAt || undefined,
      cancelledBy: p.cancelledBy || undefined,
      cancelledReason: p.cancelledReason || undefined,
      allocations: p.allocations.map(a => ({
        paymentId: a.paymentId,
        chargeId: a.chargeId,
        amount: a.amount,
        charge: a.charge
      }))
    }));
  }

	// Receipt methods

	async issueReceipt(params: {
		paymentIds: string[];
		userId: string;
		observations?: string;
	}): Promise<{ receipt: Receipt; items: ReceiptItem[] }> {
		const { paymentIds, userId, observations } = params;

		// Validate permissions
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canIssue = await hasPermission(roleCodes[0] || '', 'RECEIPT', 'create');
		if (!canIssue) {
			throw new Error('No tiene permisos para emitir recibos');
		}

		// Validate payments exist and are not cancelled
		const payments = await prisma.payment.findMany({
			where: {
				id: { in: paymentIds },
				isCancelled: false
			},
			include: {
				student: {
					include: { user: true }
				},
				allocations: {
					include: {
						charge: {
							include: { concept: true }
						}
					}
				}
			}
		});

		if (payments.length === 0) {
			throw new Error('No se encontraron pagos válidos para emitir recibo');
		}

		if (payments.length !== paymentIds.length) {
			throw new Error('Algunos pagos no existen o están anulados');
		}

		// Validate all payments belong to same student
		const studentIds = new Set(payments.map((p) => p.studentId));
		if (studentIds.size > 1) {
			throw new Error('Todos los pagos deben pertenecer al mismo alumno');
		}

		const student = payments[0].student;
		const studentId = student.id;

		// Check if payments already have active receipts
		const paymentsWithReceipts = await prisma.payment.findMany({
			where: {
				id: { in: paymentIds },
				receiptId: { not: null }
			},
			select: { id: true, receiptId: true }
		});

		// Check if any of these receipts are still ISSUED
		if (paymentsWithReceipts.length > 0) {
			const receiptIds = paymentsWithReceipts.map((p) => p.receiptId).filter(Boolean) as string[];
			if (receiptIds.length > 0) {
				// Use raw query to avoid Prisma enum type issues
				// Prisma generates incorrect SQL when filtering by enum status
				// This is a safe parameterized query
				const activeReceipts = await prisma.$queryRaw<Array<{ id: string }>>`
					SELECT id FROM receipts
					WHERE id = ANY(${receiptIds})
					AND status = 'ISSUED'
				`;

				if (activeReceipts.length > 0) {
					throw new Error('Algunos pagos ya tienen recibos activos emitidos');
				}
			}
		}

		// Get current year
		const currentYear = new Date().getFullYear();

		// Calculate total and generate receipt items
		const items: Array<{
			chargeId: string | null;
			concept: string;
			periodLabel: string | null;
			baseAmount: Decimal;
			lateFeeAmount: Decimal;
			discountAmount: Decimal;
			finalAmount: Decimal;
		}> = [];
		let totalAmount = new Decimal(0);
		let paymentMethod: PaymentMethod | null = null;
		let paymentReference: string | null = null;

		for (const payment of payments) {
			if (!paymentMethod) {
				paymentMethod = payment.method;
				paymentReference = payment.reference;
			}

			for (const allocation of payment.allocations) {
				const charge = allocation.charge;
				const item = {
					chargeId: charge.id,
					concept: charge.concept.name,
					periodLabel: charge.periodLabel,
					baseAmount: charge.amount,
					lateFeeAmount: charge.lateFeeApplied,
					discountAmount: charge.discountApplied.add(charge.scholarshipApplied),
					finalAmount: allocation.amount
				};
				items.push(item);
				totalAmount = totalAmount.add(allocation.amount);
			}
		}

		// Issue receipt in transaction
		const result = await prisma.$transaction(async (tx) => {
			// Get or create receipt number for current year
			let receiptNumberRecord = await tx.receiptNumber.findUnique({
				where: { year: currentYear }
			});

			if (!receiptNumberRecord) {
				receiptNumberRecord = await tx.receiptNumber.create({
					data: {
						year: currentYear,
						lastNumber: 0
					}
				});
			}

			// Increment receipt number
			const newReceiptNumber = receiptNumberRecord.lastNumber + 1;
			await tx.receiptNumber.update({
				where: { year: currentYear },
				data: { lastNumber: newReceiptNumber }
			});

			// Create receipt
			const receipt = await tx.receipt.create({
				data: {
					receiptNumber: newReceiptNumber,
					receiptYear: currentYear,
					studentId,
					studentName: `${student.user.firstName} ${student.user.lastName}`,
					studentDni: student.dni || undefined,
					studentAddress: student.address || undefined,
					totalAmount,
					paymentMethod: paymentMethod!,
					paymentReference,
					issuedBy: userId,
					issuedByName: await this.getUserName(userId),
					observations,
					status: 'ISSUED',
					printCount: 0,
					originalCopy: true
				}
			});

			// Create receipt items
			const receiptItems = await tx.receiptItem.createMany({
				data: items.map((item) => ({
					...item,
					receiptId: receipt.id
				}))
			});

			// Link payments to receipt
			await tx.payment.updateMany({
				where: {
					id: { in: paymentIds }
				},
				data: {
					receiptId: receipt.id
				}
			});

			// Create financial movement
			await tx.financialMovement.create({
				data: {
					studentId,
					movementType: 'RECEIPT',
					entityType: 'Receipt',
					entityId: receipt.id,
					amount: totalAmount,
					description: `Recibo #${newReceiptNumber}/${currentYear}`,
					userId,
					balanceBefore: new Decimal(0),
					balanceAfter: new Decimal(0)
				}
			});

			// Audit
			await auditLog({
				userId,
				action: 'CREATE',
				entityType: 'Receipt',
				entityId: receipt.id,
				description: `Emitió recibo #${newReceiptNumber}/${currentYear} para ${student.user.firstName} ${student.user.lastName}`,
				metadata: {
					receiptNumber: newReceiptNumber,
					receiptYear: currentYear,
					studentId,
					studentName: `${student.user.firstName} ${student.user.lastName}`,
					totalAmount: totalAmount.toString(),
					paymentIds,
					paymentMethod,
					observations
				}
			});

			return { receipt, itemsCreated: receiptItems.count };
		});

		// Fetch created items
		const createdItems = await prisma.receiptItem.findMany({
			where: { receiptId: result.receipt.id }
		});

		return { receipt: result.receipt as any, items: createdItems as any };
	}

	async cancelReceipt(params: {
		receiptId: string;
		reason: string;
		userId: string;
	}): Promise<void> {
		const { receiptId, reason, userId } = params;

		// Validate permissions
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canCancel = await hasPermission(roleCodes[0] || '', 'RECEIPT', 'delete');
		if (!canCancel) {
			throw new Error('No tiene permisos para anular recibos');
		}

		// Get receipt
		const receipt = await prisma.receipt.findUnique({
			where: { id: receiptId }
		});

		if (!receipt) {
			throw new Error('Recibo no encontrado');
		}

		if (receipt.status === 'CANCELLED') {
			throw new Error('El recibo ya está anulado');
		}

		// Cancel receipt in transaction
		await prisma.$transaction(async (tx) => {
			// Update receipt status
			await tx.receipt.update({
				where: { id: receiptId },
				data: {
					status: 'CANCELLED',
					cancelledAt: new Date(),
					cancelledBy: userId,
					cancelledReason: reason
				}
			});

			// Create financial movement for cancellation
			await tx.financialMovement.create({
				data: {
					studentId: receipt.studentId,
					movementType: 'CANCELLATION',
					entityType: 'Receipt',
					entityId: receiptId,
					amount: receipt.totalAmount.neg(),
					description: `Anulación de recibo #${receipt.receiptNumber}/${receipt.receiptYear}`,
					userId,
					balanceBefore: new Decimal(0),
					balanceAfter: new Decimal(0)
				}
			});

			// Audit
			await auditLog({
				userId,
				action: 'DELETE',
				entityType: 'Receipt',
				entityId: receiptId,
				description: `Anuló recibo #${receipt.receiptNumber}/${receipt.receiptYear} para ${receipt.studentName}`,
				metadata: {
					receiptNumber: receipt.receiptNumber,
					receiptYear: receipt.receiptYear,
					studentId: receipt.studentId,
					studentName: receipt.studentName,
					totalAmount: receipt.totalAmount.toString(),
					reason,
					oldStatus: receipt.status,
					newStatus: 'CANCELLED'
				}
			});
		});
	}

	async reprintReceipt(params: {
		receiptId: string;
		userId: string;
	}): Promise<Receipt> {
		const { receiptId, userId } = params;

		// Validate permissions
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canView = await hasPermission(roleCodes[0] || '', 'RECEIPT', 'read');
		if (!canView) {
			throw new Error('No tiene permisos para ver recibos');
		}

		// Get receipt
		const receipt = await prisma.receipt.findUnique({
			where: { id: receiptId }
		});

		if (!receipt) {
			throw new Error('Recibo no encontrado');
		}

		// Increment print count
		const updatedReceipt = await prisma.receipt.update({
			where: { id: receiptId },
			data: {
				printCount: receipt.printCount + 1
			}
		});

		// Audit
		await auditLog({
			userId,
			action: 'UPDATE',
			entityType: 'Receipt',
			entityId: receiptId,
			description: `Reimprimió recibo #${receipt.receiptNumber}/${receipt.receiptYear}`,
			metadata: {
				receiptNumber: receipt.receiptNumber,
				receiptYear: receipt.receiptYear,
				studentId: receipt.studentId,
				studentName: receipt.studentName,
				printCount: updatedReceipt.printCount
			}
		});

		return updatedReceipt as any;
	}

	async getReceipt(receiptId: string, userId: string): Promise<Receipt | null> {
		// Validate permissions
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canView = await hasPermission(roleCodes[0] || '', 'RECEIPT', 'read');
		if (!canView) {
			throw new Error('No tiene permisos para ver recibos');
		}

		return prisma.receipt.findUnique({
			where: { id: receiptId },
			include: {
				items: true
			}
		}) as any;
	}

	async getStudentReceipts(studentId: string, userId: string): Promise<Receipt[]> {
		// Check if user is the student or has permission
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { student: true }
		});

		if (!user) {
			throw new Error('Usuario no encontrado');
		}

		const isStudent = user.student?.id === studentId;
		const userRoles = await prisma.userRole.findMany({
			where: { userId },
			include: { role: true }
		});
		const roleCodes = userRoles.map((ur) => ur.role.code);
		const canView = await hasPermission(roleCodes[0] || '', 'RECEIPT', 'read');

		if (!isStudent && !canView) {
			throw new Error('No tiene permisos para ver recibos de este alumno');
		}

		return prisma.receipt.findMany({
			where: { studentId },
			include: {
				items: true
			},
			orderBy: {
				issuedAt: 'desc'
			}
		}) as any;
	}

	private async getUserName(userId: string): Promise<string> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				firstName: true,
				lastName: true
			}
		});

		if (!user) {
			return 'Usuario desconocido';
		}

		return `${user.firstName} ${user.lastName}`;
	}
}

// Singleton instance
export const financialService = new FinancialService();
