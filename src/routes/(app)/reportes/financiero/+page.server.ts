import type { PageServerLoad } from './$types';
import { getFinancialReport } from '$lib/server/services/reports/financial-report.service';

export const load: PageServerLoad = async () => {
    return getFinancialReport();
};