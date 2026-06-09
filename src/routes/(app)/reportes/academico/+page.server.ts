import type { PageServerLoad } from './$types';
import { getAcademicReport } from '$lib/server/services/reports/academic-report.service';

const RISK_THRESHOLD = 75;
export const load: PageServerLoad = async () => {
	return getAcademicReport();
};
