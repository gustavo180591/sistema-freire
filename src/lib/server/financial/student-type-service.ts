import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import { recalculatePendingStudentChargesWithClient } from '$lib/server/financial/pending-charge-recalculation-service';

export type StudentType = 'NORMAL' | 'BECADO' | 'RECURSANTE';

export interface StudentTypeChangeInput {
	studentId: string;
	newType: StudentType;
	reason: string;
	userId: string;
	userName: string;
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

			await recalculatePendingStudentChargesWithClient(tx, {
				studentId: input.studentId,
				userId: input.userId,
				userName: input.userName,
				source: 'STUDENT_TYPE_CHANGE',
				reason: input.reason
			});

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
