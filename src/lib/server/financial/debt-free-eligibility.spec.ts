import { describe, expect, it } from 'vitest';
import { evaluateDebtFreeEligibility } from './debt-free-eligibility';

describe('evaluateDebtFreeEligibility', () => {
	it('no habilita certificado si no existen cuotas mensuales', () => {
		expect(
			evaluateDebtFreeEligibility({
				totalDebt: 0,
				monthlyChargeCount: 0
			})
		).toEqual({
			eligible: false,
			reason: 'El alumno todavía no posee cuotas mensuales registradas'
		});
	});

	it('no habilita certificado si existe deuda pendiente', () => {
		expect(
			evaluateDebtFreeEligibility({
				totalDebt: 30000,
				monthlyChargeCount: 8
			})
		).toEqual({
			eligible: false,
			reason: 'El alumno todavía registra deuda pendiente'
		});
	});

	it('habilita certificado cuando existen cuotas y no hay deuda', () => {
		expect(
			evaluateDebtFreeEligibility({
				totalDebt: 0,
				monthlyChargeCount: 8
			})
		).toEqual({
			eligible: true,
			reason: null
		});
	});
});
