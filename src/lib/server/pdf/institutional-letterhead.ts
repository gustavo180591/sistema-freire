import PDFDocument from 'pdfkit';

import { getInstitutionalLetterheadAsset } from '$lib/server/institution/institutional-letterhead-service';

const LETTERHEAD_ASPECT_RATIO = 4;

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

interface InstitutionalLetterheadOptions {
	top?: number;
	horizontalMargin?: number;
	gapAfter?: number;
}

export async function addInstitutionalLetterhead(
	doc: PDFDocumentInstance,
	options: InstitutionalLetterheadOptions = {}
): Promise<void> {
	const top = options.top ?? 22;
	const horizontalMargin = options.horizontalMargin ?? 25;
	const gapAfter = options.gapAfter ?? 28;

	const asset = await getInstitutionalLetterheadAsset();

	const width = doc.page.width - horizontalMargin * 2;
	const height = width / LETTERHEAD_ASPECT_RATIO;

	doc.image(asset.buffer, horizontalMargin, top, {
		fit: [width, height],
		align: 'center',
		valign: 'center'
	});

	doc.y = top + height + gapAfter;
}
