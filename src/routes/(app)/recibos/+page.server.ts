import type { PageServerLoad } from './$types';
import { getPayslipsForUser } from '$lib/server/services/payroll/payslip.service';

export const load: PageServerLoad = async ({ locals }) => {
	return getPayslipsForUser(locals.user);
};
