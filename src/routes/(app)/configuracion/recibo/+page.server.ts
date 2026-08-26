import { prisma } from '$lib/server/db/prisma';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const ALLOWED_ROLES = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'FINANZAS', 'APODERADO'];

const defaultConfig = {
	institutionName: 'Instituto Superior de Formación Docente',
	institutionCode: 'PAULO FREIRE',
	institutionCodeNumber: '1117',
	institutionOwner: 'SIDEPP',
	institutionAddress: '',
	institutionCuit: '',
	institutionPhone: '',
	institutionEmail: '',
	institutionWebsite: '',
	taxStatus: 'IVA EXENTO',
	grossIncome: '',
	activityStartDate: '',
	receiptHeader: '',
	receiptFooter: '',
	receiptLetter: 'C',
	pointOfSale: '0001',
	lastReceiptNumber: 0,
	nextReceiptNumber: 1,
	signatureLeftLabel: 'Firma Secretaría',
	signatureRightLabel: 'Firma Responsable'
};

function hasAccess(user: App.Locals['user']) {
	return Boolean(user && user.roles.some((role) => ALLOWED_ROLES.includes(role)));
}

function optionalText(value: FormDataEntryValue | null): string | null {
	const text = value?.toString().trim() ?? '';
	return text.length > 0 ? text : null;
}

function dateForInput(value: Date | null | undefined): string {
	if (!value) return '';

	const year = value.getUTCFullYear();
	const month = String(value.getUTCMonth() + 1).padStart(2, '0');
	const day = String(value.getUTCDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Usuario no autenticado');
	}

	if (!hasAccess(locals.user)) {
		throw error(403, 'No tenés permisos para configurar recibos');
	}

	const locations = await prisma.location.findMany({
		where: {
			active: true
		},
		include: {
			receiptConfig: true
		},
		orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
	});

	const configs: Record<string, typeof defaultConfig> = {};

	for (const location of locations) {
		const config = location.receiptConfig;

		configs[location.id] = {
			institutionName: config?.institutionName ?? defaultConfig.institutionName,
			institutionCode: config?.institutionCode ?? defaultConfig.institutionCode,
			institutionCodeNumber: config?.institutionCodeNumber ?? defaultConfig.institutionCodeNumber,
			institutionOwner: config?.institutionOwner ?? defaultConfig.institutionOwner,
			institutionAddress:
				config?.institutionAddress ?? location.address ?? defaultConfig.institutionAddress,
			institutionCuit: config?.institutionCuit ?? defaultConfig.institutionCuit,
			institutionPhone:
				config?.institutionPhone ?? location.phone ?? defaultConfig.institutionPhone,
			institutionEmail:
				config?.institutionEmail ?? location.email ?? defaultConfig.institutionEmail,
			institutionWebsite: config?.institutionWebsite ?? defaultConfig.institutionWebsite,
			taxStatus: config?.taxStatus ?? defaultConfig.taxStatus,
			grossIncome: config?.grossIncome ?? defaultConfig.grossIncome,
			activityStartDate: dateForInput(config?.activityStartDate),
			receiptHeader: config?.receiptHeader ?? defaultConfig.receiptHeader,
			receiptFooter: config?.receiptFooter ?? defaultConfig.receiptFooter,
			receiptLetter: config?.receiptLetter ?? defaultConfig.receiptLetter,
			pointOfSale: config?.pointOfSale ?? defaultConfig.pointOfSale,
			lastReceiptNumber: config?.lastReceiptNumber ?? defaultConfig.lastReceiptNumber,
			nextReceiptNumber: (config?.lastReceiptNumber ?? 0) + 1,
			signatureLeftLabel: config?.signatureLeftLabel ?? defaultConfig.signatureLeftLabel,
			signatureRightLabel: config?.signatureRightLabel ?? defaultConfig.signatureRightLabel
		};
	}

	return {
		locations: locations.map(({ id, name, code }) => ({
			id,
			name,
			code
		})),
		configs
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		if (!hasAccess(locals.user)) {
			return fail(403, { error: 'No tenés permisos para configurar recibos' });
		}

		const form = await request.formData();

		const locationId = form.get('locationId')?.toString().trim();
		const institutionName = form.get('institutionName')?.toString().trim() ?? '';
		const receiptLetter = form.get('receiptLetter')?.toString().trim().toUpperCase() ?? 'C';
		const pointOfSale = form.get('pointOfSale')?.toString().trim() ?? '';
		const nextReceiptNumberRaw = form.get('nextReceiptNumber')?.toString().trim() ?? '';

		if (!locationId) {
			return fail(400, { error: 'Falta la localidad' });
		}

		if (!institutionName) {
			return fail(400, { error: 'El nombre de la institución es obligatorio' });
		}

		if (!['A', 'B', 'C', 'X'].includes(receiptLetter)) {
			return fail(400, { error: 'La letra del recibo no es válida' });
		}

		if (!/^\d{4}$/.test(pointOfSale)) {
			return fail(400, {
				error: 'El punto de venta debe contener exactamente 4 dígitos, por ejemplo 0002'
			});
		}

		const nextReceiptNumber = Number(nextReceiptNumberRaw);

		if (
			!Number.isInteger(nextReceiptNumber) ||
			nextReceiptNumber <= 0 ||
			nextReceiptNumber > 99_999_999
		) {
			return fail(400, {
				error: 'El próximo número de recibo debe ser un entero entre 1 y 99999999'
			});
		}

		const location = await prisma.location.findFirst({
			where: {
				id: locationId,
				active: true
			},
			select: {
				id: true,
				name: true
			}
		});

		if (!location) {
			return fail(404, { error: 'La localidad seleccionada no existe o está inactiva' });
		}

		const currentConfig = await prisma.receiptLocationConfig.findUnique({
			where: {
				locationId
			},
			select: {
				pointOfSale: true,
				lastReceiptNumber: true
			}
		});

		const issued = await prisma.receipt.aggregate({
			where: {
				locationId,
				pointOfSale
			},
			_max: {
				receiptNumber: true
			}
		});

		const highestIssuedNumber = issued._max.receiptNumber ?? 0;

		const currentNextNumber =
			currentConfig?.pointOfSale === pointOfSale ? currentConfig.lastReceiptNumber + 1 : 1;

		const minimumAllowedNextNumber = Math.max(highestIssuedNumber + 1, currentNextNumber);

		if (nextReceiptNumber < minimumAllowedNextNumber) {
			return fail(400, {
				error: `El próximo número no puede ser menor a ${minimumAllowedNextNumber
					.toString()
					.padStart(8, '0')}`
			});
		}

		const activityStartDateRaw = form.get('activityStartDate')?.toString().trim() ?? '';

		let activityStartDate: Date | null = null;

		if (activityStartDateRaw) {
			activityStartDate = new Date(`${activityStartDateRaw}T00:00:00.000Z`);

			if (Number.isNaN(activityStartDate.getTime())) {
				return fail(400, { error: 'La fecha de inicio de actividades no es válida' });
			}
		}

		const data = {
			institutionName,
			institutionCode: optionalText(form.get('institutionCode')),
			institutionCodeNumber: optionalText(form.get('institutionCodeNumber')),
			institutionOwner: optionalText(form.get('institutionOwner')),
			institutionAddress: optionalText(form.get('institutionAddress')),
			institutionCuit: optionalText(form.get('institutionCuit')),
			institutionPhone: optionalText(form.get('institutionPhone')),
			institutionEmail: optionalText(form.get('institutionEmail')),
			institutionWebsite: optionalText(form.get('institutionWebsite')),
			taxStatus: optionalText(form.get('taxStatus')),
			grossIncome: optionalText(form.get('grossIncome')),
			activityStartDate,
			receiptHeader: optionalText(form.get('receiptHeader')),
			receiptFooter: optionalText(form.get('receiptFooter')),
			receiptLetter,
			pointOfSale,
			lastReceiptNumber: nextReceiptNumber - 1,
			signatureLeftLabel:
				optionalText(form.get('signatureLeftLabel')) ?? defaultConfig.signatureLeftLabel,
			signatureRightLabel:
				optionalText(form.get('signatureRightLabel')) ?? defaultConfig.signatureRightLabel
		};

		await prisma.receiptLocationConfig.upsert({
			where: {
				locationId
			},
			update: data,
			create: {
				locationId,
				...data
			}
		});

		return {
			success: true,
			message: `Configuración del recibo de ${location.name} guardada correctamente`
		};
	}
};
