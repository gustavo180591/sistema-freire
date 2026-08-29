import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';
import type { UserRole } from '$lib/server/payment-agreements/payment-agreement-service';
import { error, redirect } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const prisma = new PrismaClient();

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userRoles = (locals.user.roles || []) as UserRole[];

	await requirePermission(locals.user, 'PAYMENT_AGREEMENT', 'read');

	// If user is ALUMNO, show only their agreements
	if (userRoles.includes('ALUMNO')) {
		const student = await prisma.student.findUnique({
			where: { userId: locals.user.id }
		});

		if (!student) {
			return {
				agreements: [],
				isStudent: true
			};
		}

		const agreements = await paymentAgreementService.getStudentAgreements(
			student.id,
			userRoles,
			locals.user.id
		);

		return {
			agreements,
			isStudent: true
		};
	}

	// For admin users, show all agreements (or implement pagination/filtering later)
	return {
		agreements: [],
		isStudent: false
	};
}
