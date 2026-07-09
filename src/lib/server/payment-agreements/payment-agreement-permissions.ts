/**
 * Payment Agreement Permissions Helper
 *
 * Provides centralized permission checks for payment agreement operations.
 * These functions are used by both server actions and tests.
 */

interface UserWithRoles {
	roles?: string[] | null;
}

/**
 * Check if user can manage payment agreements (create, activate, register payments)
 */
export function canManagePaymentAgreements(user: UserWithRoles | null): boolean {
	if (!user) return false;

	const roles = (user.roles || []) as string[];

	return roles.some(
		(role) =>
			role === 'SUPERADMIN' || role === 'DIRECTOR' || role === 'FINANZAS' || role === 'SECRETARIA'
	);
}

/**
 * Check if user can evaluate agreement status manually
 */
export function canEvaluateAgreementStatus(user: UserWithRoles | null): boolean {
	if (!user) return false;

	const roles = (user.roles || []) as string[];

	return roles.some(
		(role) =>
			role === 'SUPERADMIN' || role === 'DIRECTOR' || role === 'FINANZAS' || role === 'SECRETARIA'
	);
}

/**
 * Check if user can evaluate agreement block exceptions manually
 */
export function canEvaluateAgreementBlockException(user: UserWithRoles | null): boolean {
	if (!user) return false;

	const roles = (user.roles || []) as string[];

	return roles.some(
		(role) =>
			role === 'SUPERADMIN' || role === 'DIRECTOR' || role === 'FINANZAS' || role === 'SECRETARIA'
	);
}

/**
 * Check if user can view payment agreements
 */
export function canViewPaymentAgreements(user: UserWithRoles | null): boolean {
	if (!user) return false;

	const roles = (user.roles || []) as string[];

	return roles.some(
		(role) =>
			role === 'SUPERADMIN' ||
			role === 'DIRECTOR' ||
			role === 'FINANZAS' ||
			role === 'SECRETARIA' ||
			role === 'PRECEPTOR' ||
			role === 'DOCENTE'
	);
}
