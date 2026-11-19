import type { RoleCode } from '@prisma/client';

const STUDENT_FINANCIAL_ROLES = new Set<RoleCode>([
	'SUPERADMIN',
	'DIRECTOR',
	'FINANZAS',
	'APODERADO'
]);

const STUDENT_CERTIFICATE_ROLES = new Set<RoleCode>(['SUPERADMIN', 'DIRECTOR', 'SECRETARIA']);

const STUDENT_ACADEMIC_DETAIL_ROLES = new Set<RoleCode>(['SUPERADMIN', 'DIRECTOR', 'PRECEPTOR']);

export function canViewStudentFinancialSummary(activeRole: RoleCode | null | undefined): boolean {
	return activeRole !== null && activeRole !== undefined && STUDENT_FINANCIAL_ROLES.has(activeRole);
}

export function canGenerateStudentCertificate(activeRole: RoleCode | null | undefined): boolean {
	return (
		activeRole !== null && activeRole !== undefined && STUDENT_CERTIFICATE_ROLES.has(activeRole)
	);
}

export function canViewStudentAcademicDetails(activeRole: RoleCode | null | undefined): boolean {
	return (
		activeRole !== null && activeRole !== undefined && STUDENT_ACADEMIC_DETAIL_ROLES.has(activeRole)
	);
}

export function isFinanceStudentContext(activeRole: RoleCode | null | undefined): boolean {
	return activeRole === 'FINANZAS';
}
