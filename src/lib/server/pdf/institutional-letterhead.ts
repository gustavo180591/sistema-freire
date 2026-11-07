import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import PDFDocument from 'pdfkit';

const LETTERHEAD_FILE = 'membrete-freire.jpeg';
const LETTERHEAD_ASPECT_RATIO = 4;

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

interface InstitutionalLetterheadOptions {
	top?: number;
	horizontalMargin?: number;
	gapAfter?: number;
}

export function addInstitutionalLetterhead(
	doc: PDFDocumentInstance,
	options: InstitutionalLetterheadOptions = {}
): void {
	const top = options.top ?? 22;
	const horizontalMargin = options.horizontalMargin ?? 25;
	const gapAfter = options.gapAfter ?? 28;

	const letterheadPath = resolve(process.cwd(), 'static', LETTERHEAD_FILE);

	if (!existsSync(letterheadPath)) {
		throw new Error('No se encontró el membrete institucional');
	}

	const width = doc.page.width - horizontalMargin * 2;
	const height = width / LETTERHEAD_ASPECT_RATIO;

	doc.image(letterheadPath, horizontalMargin, top, {
		fit: [width, height],
		align: 'center',
		valign: 'center'
	});

	doc.y = top + height + gapAfter;
}
