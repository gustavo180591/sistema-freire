import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const config = await prisma.financialConfig.findUnique({
		where: { key: 'payslip_portal_url' }
	});

	return {
		currentUrl: config?.value as string | null
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const url = formData.get('url') as string;

		if (!url) {
			return fail(400, { error: 'La URL es requerida' });
		}

		try {
			// Validate URL format
			new URL(url);

			await prisma.financialConfig.upsert({
				where: { key: 'payslip_portal_url' },
				update: { value: url },
				create: {
					key: 'payslip_portal_url',
					value: url,
					category: 'payslip',
					description: 'URL del portal externo de recibos de sueldo'
				}
			});

			return { success: 'Configuración guardada exitosamente' };
		} catch (e) {
			if (e instanceof TypeError) {
				return fail(400, {
					error: 'URL inválida. Ingrese una URL válida (ej: https://ejemplo.com)'
				});
			}
			return fail(500, { error: 'Error al guardar la configuración' });
		}
	}
};
