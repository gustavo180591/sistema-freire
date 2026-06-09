// src/lib/server/validators/payslip.validator.ts
import { PayslipStatus } from '@prisma/client';

export interface CreatePayslipInput {
	teacherId: string;
	periodMonth: number;
	periodYear: number;
	amount: number;
	status: PayslipStatus;
	notes?: string;
}

export interface UpdatePayslipInput {
	amount?: number;
	status?: PayslipStatus;
	notes?: string;
}

export class PayslipValidator {
	/**
	 * Valida el período (mes y año)
	 */
	static validatePeriod(month: number, year: number): void {
		if (month < 1 || month > 12) {
			throw new Error('El mes debe estar entre 1 y 12');
		}

		if (year < 2000 || year > 2100) {
			throw new Error('El año debe estar entre 2000 y 2100');
		}
	}

	/**
	 * Valida el importe
	 */
	static validateAmount(amount: number): void {
		if (amount < 0) {
			throw new Error('El importe no puede ser negativo');
		}

		if (amount > 999999999.99) {
			throw new Error('El importe excede el máximo permitido');
		}
	}

	/**
	 * Valida el estado
	 */
	static validateStatus(status: string): PayslipStatus {
		const validStatuses = Object.values(PayslipStatus);

		if (!validStatuses.includes(status as PayslipStatus)) {
			throw new Error(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
		}

		return status as PayslipStatus;
	}

	/**
	 * Valida los datos de creación de recibo
	 */
	static validateCreateInput(data: any): CreatePayslipInput {
		if (!data.teacherId || typeof data.teacherId !== 'string') {
			throw new Error('El ID del docente es obligatorio');
		}

		if (data.periodMonth === undefined || data.periodYear === undefined) {
			throw new Error('El período (mes y año) es obligatorio');
		}

		this.validatePeriod(data.periodMonth, data.periodYear);

		if (data.amount === undefined || data.amount === null) {
			throw new Error('El importe es obligatorio');
		}

		this.validateAmount(Number(data.amount));

		if (!data.status) {
			throw new Error('El estado es obligatorio');
		}

		const status = this.validateStatus(data.status);

		return {
			teacherId: data.teacherId,
			periodMonth: Number(data.periodMonth),
			periodYear: Number(data.periodYear),
			amount: Number(data.amount),
			status,
			notes: data.notes || null
		};
	}

	/**
	 * Valida los datos de actualización de recibo
	 */
	static validateUpdateInput(data: any): UpdatePayslipInput {
		const updateData: UpdatePayslipInput = {};

		if (data.amount !== undefined && data.amount !== null) {
			this.validateAmount(Number(data.amount));
			updateData.amount = Number(data.amount);
		}

		if (data.status !== undefined && data.status !== null) {
			updateData.status = this.validateStatus(data.status);
		}

		if (data.notes !== undefined) {
			updateData.notes = data.notes || null;
		}

		if (Object.keys(updateData).length === 0) {
			throw new Error('Debe proporcionar al menos un campo para actualizar');
		}

		return updateData;
	}
}
