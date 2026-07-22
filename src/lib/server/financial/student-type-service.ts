import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';

export type StudentType = 'NORMAL' | 'BECADO' | 'RECURSANTE';

export interface StudentTypeChangeInput {
	studentId: string;
	newType: StudentType;
	reason: string;
	userId: string;
	userName: string;
	recalculateCharges?: boolean;
}

/**
 * Servicio para gestionar cambios de tipo de alumno con auditoría
 */
export class StudentTypeService {
	/**
	 * Cambia el tipo de alumno con auditoría completa
	 */
	async changeStudentType(input: StudentTypeChangeInput): Promise<void> {
		return prisma.$transaction(async (tx) => {
			// Obtener estado actual del alumno
			const student = await tx.student.findUnique({
				where: { id: input.studentId },
				select: {
					isBecado: true,
					isRecursante: true,
					firstName: true,
					lastName: true
				}
			});

			if (!student) {
				throw new Error('Alumno no encontrado');
			}

			// Determinar tipo actual
			const currentType: StudentType = student.isBecado
				? 'BECADO'
				: student.isRecursante
					? 'RECURSANTE'
					: 'NORMAL';

			// Si no hay cambio, no hacer nada
			if (currentType === input.newType) {
				return;
			}

			// Actualizar flags del alumno
			const updateData: Prisma.StudentUpdateInput = {
				isBecado: input.newType === 'BECADO',
				isRecursante: input.newType === 'RECURSANTE'
			};

			await tx.student.update({
				where: { id: input.studentId },
				data: updateData
			});

			// Si se solicitó recalcular cuotas y el cambio afecta beneficios
			if (input.recalculateCharges) {
				await this.recalculateChargesForTypeChange(
					tx,
					input.studentId,
					currentType,
					input.newType,
					input.userId,
					input.userName
				);
			}

			// Registrar seguimiento de auditoría
			await tx.studentFollowUp.create({
				data: {
					studentId: input.studentId,
					type: 'WARNING',
					title: 'Cambio de tipo de alumno',
					description: `Cambio manual de tipo de alumno. Tipo anterior: ${currentType}, Tipo nuevo: ${input.newType}. Motivo: ${input.reason}. Responsable: ${input.userName}`,
					date: new Date(),
					createdBy: input.userId,
					isAlert: true,
					isResolved: true,
					resolvedAt: new Date(),
					resolvedBy: input.userId
				}
			});

			// Registrar movimiento financiero si afecta cuotas
			if (input.recalculateCharges) {
				await tx.financialMovement.create({
					data: {
						studentId: input.studentId,
						movementType: 'ADJUSTMENT',
						entityType: 'Student',
						entityId: input.studentId,
						description: `Cambio de tipo de alumno: ${currentType} -> ${input.newType}`,
						amount: 0,
						balanceBefore: 0,
						balanceAfter: 0,
						metadata: {
							previousType: currentType,
							newType: input.newType,
							reason: input.reason,
							recalculateCharges: input.recalculateCharges,
							userName: input.userName
						},
						userId: input.userId
					}
				});
			}
		});
	}

	/**
	 * Recalcula cuotas cuando cambia el tipo de alumno
	 */
	private async recalculateChargesForTypeChange(
		tx: Prisma.TransactionClient,
		studentId: string,
		previousType: StudentType,
		newType: StudentType,
		userId: string,
		userName: string
	): Promise<void> {
		// Solo recalcular si el cambio afecta beneficios
		const affectsBenefits =
			(previousType === 'BECADO' && newType !== 'BECADO') ||
			(previousType !== 'BECADO' && newType === 'BECADO') ||
			(previousType === 'RECURSANTE' && newType !== 'RECURSANTE') ||
			(previousType !== 'RECURSANTE' && newType === 'RECURSANTE');

		if (!affectsBenefits) {
			return;
		}

		// Obtener cuotas pendientes de mensualidades
		const pendingCharges = await tx.studentCharge.findMany({
			where: {
				studentId,
				status: { in: ['PENDING', 'PARTIAL'] },
				concept: { code: 'CUOTA_MENSUAL' }
			},
			include: { concept: true }
		});

		if (pendingCharges.length === 0) {
			return;
		}

		// Importar dependencias
		const { getBenefitsConfig, calculateChargeBenefit } = await import('./benefit-calculator');
		const { Decimal } = await import('@prisma/client/runtime/library');

		const benefitsConfig = await getBenefitsConfig(tx);
		let recalculatedCount = 0;

		for (const charge of pendingCharges) {
			const periodParts = charge.periodLabel.split('-');
			if (periodParts.length !== 2) continue;

			const month = parseInt(periodParts[1], 10);
			if (isNaN(month)) continue;

			// Determinar nuevo tipo para cálculo
			const isBecado = newType === 'BECADO';
			const isRecursante = newType === 'RECURSANTE';

			// Calcular nuevo beneficio
			const benefitCalculation = calculateChargeBenefit(
				new Decimal(Number(charge.amount)),
				{ isBecado, isRecursante },
				charge.installmentNumber || 1,
				month,
				benefitsConfig
			);

			// Actualizar cuota
			await tx.studentCharge.update({
				where: { id: charge.id },
				data: {
					scholarshipApplied: benefitCalculation.scholarshipApplied,
					discountApplied: benefitCalculation.discountApplied,
					finalAmount: benefitCalculation.finalAmount,
					benefitType: benefitCalculation.benefitType,
					benefitReason: benefitCalculation.benefitReason,
					ruleSnapshot: benefitCalculation.ruleSnapshot as Prisma.InputJsonValue
				}
			});

			recalculatedCount++;
		}

		// Registrar movimiento de ajuste
		await tx.financialMovement.create({
			data: {
				studentId,
				movementType: 'ADJUSTMENT',
				entityType: 'StudentCharge',
				entityId: studentId,
				description: `Recálculo de cuotas por cambio de tipo: ${previousType} -> ${newType}`,
				amount: 0,
				balanceBefore: 0,
				balanceAfter: 0,
				metadata: {
					previousType,
					newType,
					recalculatedCharges: recalculatedCount,
					userName
				},
				userId
			}
		});
	}

	/**
	 * Obtiene el historial de cambios de tipo de alumno
	 */
	async getStudentTypeHistory(studentId: string) {
		const followUps = await prisma.studentFollowUp.findMany({
			where: {
				studentId,
				title: 'Cambio de tipo de alumno'
			},
			orderBy: { date: 'desc' }
		});

		return followUps.map((followUp) => ({
			id: followUp.id,
			date: followUp.date.toISOString(),
			description: followUp.description,
			createdBy: followUp.createdBy,
			isAlert: followUp.isAlert
		}));
	}
}

export const studentTypeService = new StudentTypeService();
