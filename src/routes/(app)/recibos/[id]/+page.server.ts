import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getReceiptById, INSTITUTIONAL_DATA } from '$lib/server/financial/receipt-service';

export const load: PageServerLoad = async ({ params }) => {
	const receipt = await getReceiptById(params.id);

	if (!receipt) {
		throw error(404, 'Recibo no encontrado');
	}

	return {
		receipt,
		institutional: INSTITUTIONAL_DATA
	};
};
