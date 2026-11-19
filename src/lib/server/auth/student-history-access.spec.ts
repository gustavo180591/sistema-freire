import { describe, expect, it } from 'vitest';

import {
	canGenerateStudentCertificate,
	canViewStudentFinancialSummary,
	canViewStudentAcademicDetails,
	isFinanceStudentContext
} from './student-history-access';

describe('student-history-access', () => {
	it('restringe el detalle académico a PRECEPTOR, DIRECTOR y SUPERADMIN', () => {
		expect(canViewStudentAcademicDetails('PRECEPTOR')).toBe(true);
		expect(canViewStudentAcademicDetails('DIRECTOR')).toBe(true);
		expect(canViewStudentAcademicDetails('SUPERADMIN')).toBe(true);

		expect(canViewStudentAcademicDetails('SECRETARIA')).toBe(false);
		expect(canViewStudentAcademicDetails('FINANZAS')).toBe(false);
		expect(canViewStudentAcademicDetails('APODERADO')).toBe(false);
		expect(canViewStudentAcademicDetails('DOCENTE')).toBe(false);
		expect(canViewStudentAcademicDetails('ALUMNO')).toBe(false);
	});

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

	it('PRECEPTOR no puede ver finanzas ni generar certificados administrativos', () => {
		expect(canViewStudentFinancialSummary('PRECEPTOR')).toBe(false);
		expect(canGenerateStudentCertificate('PRECEPTOR')).toBe(false);
	});

	it('DIRECTOR y SUPERADMIN conservan acceso financiero y académico', () => {
		expect(canViewStudentFinancialSummary('DIRECTOR')).toBe(true);
		expect(canGenerateStudentCertificate('DIRECTOR')).toBe(true);

		expect(canViewStudentFinancialSummary('SUPERADMIN')).toBe(true);
		expect(canGenerateStudentCertificate('SUPERADMIN')).toBe(true);
	});

	it('APODERADO conserva finanzas pero no certificados administrativos', () => {
		expect(canViewStudentFinancialSummary('APODERADO')).toBe(true);
		expect(canGenerateStudentCertificate('APODERADO')).toBe(false);
	});

	it('ALUMNO no recibe capacidades administrativas desde este módulo', () => {
		expect(canViewStudentFinancialSummary('ALUMNO')).toBe(false);
		expect(canGenerateStudentCertificate('ALUMNO')).toBe(false);
		expect(isFinanceStudentContext('ALUMNO')).toBe(false);
	});

	it('SECRETARIA puede generar certificados pero no consultar finanzas', () => {
		expect(canViewStudentFinancialSummary('SECRETARIA')).toBe(false);
		expect(canGenerateStudentCertificate('SECRETARIA')).toBe(true);
	});
});
