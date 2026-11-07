import { describe, expect, it } from 'vitest';

import {
	canGenerateStudentCertificate,
	canViewStudentFinancialSummary,
	isFinanceStudentContext
} from './student-history-access';

describe('student-history-access', () => {
	it('FINANZAS solo tiene capacidad financiera', () => {
		expect(canViewStudentFinancialSummary('FINANZAS')).toBe(true);
		expect(canGenerateStudentCertificate('FINANZAS')).toBe(false);
		expect(isFinanceStudentContext('FINANZAS')).toBe(true);
	});

	it('DOCENTE no recibe capacidades financieras ni certificados administrativos', () => {
		expect(canViewStudentFinancialSummary('DOCENTE')).toBe(false);
		expect(canGenerateStudentCertificate('DOCENTE')).toBe(false);
		expect(isFinanceStudentContext('DOCENTE')).toBe(false);
	});

	it('PRECEPTOR puede generar certificados pero no ver finanzas', () => {
		expect(canViewStudentFinancialSummary('PRECEPTOR')).toBe(false);
		expect(canGenerateStudentCertificate('PRECEPTOR')).toBe(true);
	});

	it('ALUMNO no recibe capacidades administrativas desde este módulo', () => {
		expect(canViewStudentFinancialSummary('ALUMNO')).toBe(false);
		expect(canGenerateStudentCertificate('ALUMNO')).toBe(false);
		expect(isFinanceStudentContext('ALUMNO')).toBe(false);
	});

	it('SECRETARIA conserva capacidades académicas y financieras', () => {
		expect(canViewStudentFinancialSummary('SECRETARIA')).toBe(true);
		expect(canGenerateStudentCertificate('SECRETARIA')).toBe(true);
	});
});
