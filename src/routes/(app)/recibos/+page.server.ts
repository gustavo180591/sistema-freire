import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requirePermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePermission(locals.user, 'PAYSLIP', 'read');

	const payslipConfig = await prisma.financialConfig.findUnique({
		where: { key: 'payslip_portal_url' }
	});

	return {
		payslipPortalUrl: payslipConfig?.value as string | null
	};
};
