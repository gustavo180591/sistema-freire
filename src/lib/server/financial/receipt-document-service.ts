import { prisma } from '$lib/server/db/prisma';
import { getReceiptById, INSTITUTIONAL_DATA } from '$lib/server/financial/receipt-service';

export async function getReceiptDocumentContext(receiptId: string) {
	const receipt = await getReceiptById(receiptId);

	if (!receipt) {
		return null;
	}

	const locationId = receipt.locationId ?? receipt.student?.location?.id ?? null;

	const locationConfig = locationId
		? await prisma.receiptLocationConfig.findUnique({
				where: {
					locationId
				}
			})
		: null;

	const institutional = {
		name: receipt.institutionName ?? locationConfig?.institutionName ?? INSTITUTIONAL_DATA.name,

		code: receipt.institutionCode ?? locationConfig?.institutionCode ?? INSTITUTIONAL_DATA.code,

		codeNumber:
			receipt.institutionCodeNumber ??
			locationConfig?.institutionCodeNumber ??
			INSTITUTIONAL_DATA.codeNumber,

		owner: receipt.institutionOwner ?? locationConfig?.institutionOwner ?? INSTITUTIONAL_DATA.owner,

		email: receipt.institutionEmail ?? locationConfig?.institutionEmail ?? INSTITUTIONAL_DATA.email,

		address:
			receipt.institutionAddress ??
			locationConfig?.institutionAddress ??
			INSTITUTIONAL_DATA.address,

		phone: receipt.institutionPhone ?? locationConfig?.institutionPhone ?? INSTITUTIONAL_DATA.phone,

		website:
			receipt.institutionWebsite ??
			locationConfig?.institutionWebsite ??
			INSTITUTIONAL_DATA.website,

		taxStatus:
			receipt.institutionTaxStatus ?? locationConfig?.taxStatus ?? INSTITUTIONAL_DATA.taxStatus,

		cuit: receipt.institutionCuit ?? locationConfig?.institutionCuit ?? INSTITUTIONAL_DATA.cuit,

		grossIncome:
			receipt.institutionGrossIncome ??
			locationConfig?.grossIncome ??
			INSTITUTIONAL_DATA.grossIncome,

		activityStart: receipt.institutionActivityStart ?? locationConfig?.activityStartDate ?? null,

		receiptLetter: receipt.receiptLetter ?? locationConfig?.receiptLetter ?? 'C',

		pointOfSale: receipt.pointOfSale ?? locationConfig?.pointOfSale ?? '0001',

		signatureLeftLabel:
			receipt.signatureLeftLabel ?? locationConfig?.signatureLeftLabel ?? 'Firma Secretaría',

		signatureRightLabel:
			receipt.signatureRightLabel ?? locationConfig?.signatureRightLabel ?? 'Firma Responsable',

		receiptHeader: locationConfig?.receiptHeader ?? null,

		receiptFooter: locationConfig?.receiptFooter ?? null
	};

	const recipientEmail = receipt.student?.user?.email?.trim() || null;

	return {
		receipt,
		institutional,
		recipientEmail
	};
}

export type ReceiptDocumentContext = NonNullable<
	Awaited<ReturnType<typeof getReceiptDocumentContext>>
>;
