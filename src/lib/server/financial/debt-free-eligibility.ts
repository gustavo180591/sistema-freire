export interface DebtFreeEligibility {
	eligible: boolean;
	reason: string | null;
}

export function evaluateDebtFreeEligibility(input: {
	totalDebt: number;
	monthlyChargeCount: number;
}): DebtFreeEligibility {
	if (input.monthlyChargeCount === 0) {
		return {
			eligible: false,
			reason: 'El alumno todavía no posee cuotas mensuales registradas'
		};
	}

	if (input.totalDebt > 0) {
		return {
			eligible: false,
			reason: 'El alumno todavía registra deuda pendiente'
		};
	}

	return {
		eligible: true,
		reason: null
	};
}
