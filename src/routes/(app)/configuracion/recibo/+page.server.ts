import { prisma } from '$lib/server/db/prisma';
import { fail } from '@sveltejs/kit';

const defaultConfig = {
	institutionName: 'Instituto Freire',
	institutionAddress: '',
	institutionCuit: '',
	institutionPhone: '',
	receiptHeader: '',
	receiptFooter: 'Comprobante de pago emitido por el sistema.',
	receiptLetter: 'C'
};

export async function load() {
	const locations = await prisma.location.findMany({
		include: { receiptConfig: true },
		orderBy: { name: 'asc' }
	});

	const configs: Record<string, typeof defaultConfig> = {};
	for (const location of locations) {
		configs[location.id] = {
			institutionName: location.receiptConfig?.institutionName ?? defaultConfig.institutionName,
			institutionAddress:
				location.receiptConfig?.institutionAddress ?? defaultConfig.institutionAddress,
			institutionCuit: location.receiptConfig?.institutionCuit ?? defaultConfig.institutionCuit,
			institutionPhone: location.receiptConfig?.institutionPhone ?? defaultConfig.institutionPhone,
			receiptHeader: location.receiptConfig?.receiptHeader ?? defaultConfig.receiptHeader,
			receiptFooter: location.receiptConfig?.receiptFooter ?? defaultConfig.receiptFooter,
			receiptLetter: location.receiptConfig?.receiptLetter ?? defaultConfig.receiptLetter
		};
	}

	return {
		locations: locations.map(({ id, name, code }) => ({ id, name, code })),
		configs
	};
}

export const actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const locationId = form.get('locationId')?.toString();
		if (!locationId) {
			return fail(400, { error: 'Falta la localidad' });
		}

		const data = {
			institutionName: form.get('institutionName')?.toString() || defaultConfig.institutionName,
			institutionAddress:
				form.get('institutionAddress')?.toString() || defaultConfig.institutionAddress,
			institutionCuit: form.get('institutionCuit')?.toString() || defaultConfig.institutionCuit,
			institutionPhone: form.get('institutionPhone')?.toString() || defaultConfig.institutionPhone,
			receiptHeader: form.get('receiptHeader')?.toString() || defaultConfig.receiptHeader,
			receiptFooter: form.get('receiptFooter')?.toString() || defaultConfig.receiptFooter,
			receiptLetter: form.get('receiptLetter')?.toString() || defaultConfig.receiptLetter
		};

		await prisma.receiptLocationConfig.upsert({
			where: { locationId },
			update: data,
			create: { ...data, locationId }
		});

		return { success: true };
	}
};
