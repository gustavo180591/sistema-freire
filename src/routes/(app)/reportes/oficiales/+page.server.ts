import type { PageServerLoad } from './$types';
import { getOfficialReport } from '$lib/server/services/reports/official-report.service';

export const load: PageServerLoad = async () => {
	return getOfficialReport();
};
