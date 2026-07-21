import { prisma } from '$lib/server/db/prisma';
import { error, redirect } from '@sveltejs/kit';

const MONTHS = [
	{ value: 1, name: 'Enero' },
	{ value: 2, name: 'Febrero' },
	{ value: 3, name: 'Marzo' },
	{ value: 4, name: 'Abril' },
	{ value: 5, name: 'Mayo' },
	{ value: 6, name: 'Junio' },
	{ value: 7, name: 'Julio' },
	{ value: 8, name: 'Agosto' },
	{ value: 9, name: 'Septiembre' },
	{ value: 10, name: 'Octubre' },
	{ value: 11, name: 'Noviembre' },
	{ value: 12, name: 'Diciembre' }
];

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Obtener configuración actual
	const config = await prisma.financialConfig.findUnique({
		where: { key: 'financial.benefits' }
	});

	let benefitsConfig = {
		normalFeeAmount: 50000,
		becadoFeeAmount: 25000,
		recursantFeeAmount: 30000,
		enrollmentAmount: 50000,
		benefitsStartMonth: 3,
		benefitsEndMonth: 12,
		benefitsMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		recursantBenefitType: 'FIXED_FINAL_AMOUNT',
		recursantBenefitValue: 30000,
		benefitCombinationStrategy: 'BEST_AMOUNT',
		paymentDueGraceDays: 0
	};

	if (config && config.value) {
		const value = config.value;
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			benefitsConfig = {
				normalFeeAmount: typeof value.normalFeeAmount === 'number' ? value.normalFeeAmount : 50000,
				becadoFeeAmount: typeof value.becadoFeeAmount === 'number' ? value.becadoFeeAmount : 25000,
				recursantFeeAmount:
					typeof value.recursantFeeAmount === 'number' ? value.recursantFeeAmount : 30000,
				enrollmentAmount:
					typeof value.enrollmentAmount === 'number' ? value.enrollmentAmount : 50000,
				benefitsStartMonth:
					typeof value.benefitsStartMonth === 'number' ? value.benefitsStartMonth : 3,
				benefitsEndMonth: typeof value.benefitsEndMonth === 'number' ? value.benefitsEndMonth : 12,
				benefitsMonths: Array.isArray(value.benefitsMonths)
					? (value.benefitsMonths as unknown as number[])
					: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
				recursantBenefitType:
					typeof value.recursantBenefitType === 'string'
						? value.recursantBenefitType
						: 'FIXED_FINAL_AMOUNT',
				recursantBenefitValue:
					typeof value.recursantBenefitValue === 'number' ? value.recursantBenefitValue : 30000,
				benefitCombinationStrategy:
					typeof value.benefitCombinationStrategy === 'string'
						? value.benefitCombinationStrategy
						: 'BEST_AMOUNT',
				paymentDueGraceDays:
					typeof value.paymentDueGraceDays === 'number' ? value.paymentDueGraceDays : 0
			};
		}
	}

	return {
		config: benefitsConfig,
		months: MONTHS
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		const formData = await request.formData();
		const normalFeeAmount = parseInt(formData.get('normalFeeAmount') as string);
		const becadoFeeAmount = parseInt(formData.get('becadoFeeAmount') as string);
		const recursantFeeAmount = parseInt(formData.get('recursantFeeAmount') as string);
		const enrollmentAmount = parseInt(formData.get('enrollmentAmount') as string);
		const paymentDueGraceDays = parseInt(formData.get('paymentDueGraceDays') as string);

		// Obtener meses seleccionados
		const benefitsMonths: number[] = [];
		for (let i = 1; i <= 12; i++) {
			const monthValue = formData.get(`month_${i}`);
			if (monthValue === 'on') {
				benefitsMonths.push(i);
			}
		}

		// Validaciones
		if (isNaN(normalFeeAmount) || normalFeeAmount < 0) {
			return { error: 'El monto de cuota normal debe ser positivo' };
		}

		if (isNaN(becadoFeeAmount) || becadoFeeAmount < 0) {
			return { error: 'El monto de cuota para becados debe ser positivo' };
		}

		if (isNaN(recursantFeeAmount) || recursantFeeAmount < 0) {
			return { error: 'El monto de cuota para recursantes debe ser positivo' };
		}

		if (isNaN(enrollmentAmount) || enrollmentAmount < 0) {
			return { error: 'El monto de inscripción debe ser positivo' };
		}

		if (isNaN(paymentDueGraceDays) || paymentDueGraceDays < 0) {
			return { error: 'Los días de tolerancia deben ser un número positivo' };
		}

		if (benefitsMonths.length === 0) {
			return { error: 'Debe seleccionar al menos un mes para aplicar beneficios' };
		}

		const newConfig = {
			normalFeeAmount,
			becadoFeeAmount,
			recursantFeeAmount,
			enrollmentAmount,
			benefitsStartMonth: Math.min(...benefitsMonths),
			benefitsEndMonth: Math.max(...benefitsMonths),
			benefitsMonths,
			recursantBenefitType: 'FIXED_FINAL_AMOUNT',
			recursantBenefitValue: recursantFeeAmount,
			benefitCombinationStrategy: 'BEST_AMOUNT',
			paymentDueGraceDays
		};

		// Guardar o actualizar configuración
		const existingConfig = await prisma.financialConfig.findUnique({
			where: { key: 'financial.benefits' }
		});

		if (existingConfig) {
			await prisma.financialConfig.update({
				where: { key: 'financial.benefits' },
				data: {
					value: newConfig,
					updatedAt: new Date(),
					updatedBy: locals.user.id
				}
			});
		} else {
			await prisma.financialConfig.create({
				data: {
					key: 'financial.benefits',
					value: newConfig,
					category: 'benefits',
					description: 'Configuración de beneficios para becados y recursantes',
					updatedBy: locals.user.id
				}
			});
		}

		return { success: true };
	}
};
