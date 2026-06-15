import { error, redirect } from '@sveltejs/kit';
import { financialService } from '$lib/server/financial/financial-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw redirect(302, '/login');
	}

	const receipt = await financialService.getReceipt(params.id, userId);
	if (!receipt) {
		throw error(404, 'Recibo no encontrado');
	}

	return { receipt: receipt as any };
};
