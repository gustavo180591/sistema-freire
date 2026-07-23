import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getReceiptById, INSTITUTIONAL_DATA } from '$lib/server/financial/receipt-service';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const receipt = await getReceiptById(params.id);

	if (!receipt) {
		throw error(404, 'Recibo no encontrado');
	}

	const locationId = receipt.student?.location?.id;
	const locationConfig = locationId
		? await prisma.receiptLocationConfig.findUnique({
				where: { locationId }
			})
		: null;

	const institutional = {
		...INSTITUTIONAL_DATA,
		name: locationConfig?.institutionName ?? INSTITUTIONAL_DATA.name,
		cuit: locationConfig?.institutionCuit ?? INSTITUTIONAL_DATA.cuit,
		address: locationConfig?.institutionAddress ?? INSTITUTIONAL_DATA.address,
		phone: locationConfig?.institutionPhone ?? INSTITUTIONAL_DATA.phone
	};

	return {
		receipt,
		institutional,
		receiptConfig: locationConfig
	};
};
