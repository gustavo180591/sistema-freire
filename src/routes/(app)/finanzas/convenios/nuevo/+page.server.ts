import { paymentAgreementService } from '$lib/server/payment-agreements/payment-agreement-service';
import { error, redirect } from '@sveltejs/kit';
import { Decimal } from '@prisma/client/runtime/library';
import type { UserRole } from '$lib/server/payment-agreements/payment-agreement-service';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const prisma = new PrismaClient();

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userRoles = (locals.user.roles || []) as UserRole[];

	await requirePermission(locals.user, 'PAYMENT_AGREEMENT', 'create');

	// Get students with unpaid charges
	const students = await prisma.student.findMany({
		include: {
			studentCharges: {
				where: {
					status: { in: ['PENDING', 'PARTIAL'] }
				}
			}
		}
	});

	return {
		students: students.filter((s: { studentCharges: unknown[] }) => s.studentCharges.length > 0)
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'No autenticado');
		}

		await requirePermission(locals.user, 'PAYMENT_AGREEMENT', 'create');

		const userRoles = (locals.user.roles || []) as UserRole[];

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const agreedAmount = new Decimal(formData.get('agreedAmount') as string);
		const reason = formData.get('reason') as string;
		const observations = formData.get('observations') as string | null;
		const chargeIds = formData.getAll('chargeIds') as string[];
		const installmentsData = formData.get('installments') as string;

		try {
			const student = await prisma.student.findUnique({
				where: { id: studentId }
			});

			if (!student) {
				return { success: false, error: 'Alumno no encontrado' };
			}

			const installments = JSON.parse(installmentsData);

			const agreement = await paymentAgreementService.createDraftAgreement(
				{
					studentId,
					studentName: `${student.firstName} ${student.lastName}`,
					studentDni: student.dni,
					originalDebt: agreedAmount, // Will be recalculated in service
					agreedAmount,
					reason,
					observations: observations || undefined,
					createdBy: locals.user.id,
					createdByName: `${locals.user.firstName} ${locals.user.lastName}`,
					chargeIds,
					installments
				},
				userRoles,
				locals.user.id,
				`${locals.user.firstName} ${locals.user.lastName}`
			);

			return { success: true, agreementId: agreement.id };
		} catch (err) {
			console.error('Error creating payment agreement:', err);
			return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
		}
	}
};
