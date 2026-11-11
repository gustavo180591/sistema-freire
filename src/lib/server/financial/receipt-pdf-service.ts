import PDFDocument from 'pdfkit';

import { addInstitutionalLetterhead } from '$lib/server/pdf/institutional-letterhead';
import type { ReceiptDocumentContext } from '$lib/server/financial/receipt-document-service';
import { formatDni } from '$lib/utils/dni';

const currency = new Intl.NumberFormat('es-AR', {
	style: 'currency',
	currency: 'ARS',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2
});

const dateFormat = new Intl.DateTimeFormat('es-AR', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	timeZone: 'America/Argentina/Cordoba'
});

const paymentMethodNames: Record<string, string> = {
	CASH: 'EFECTIVO',
	BANK_TRANSFER: 'TRANSFERENCIA',
	DEBIT_CARD: 'TARJETA DÉBITO',
	CREDIT_CARD: 'TARJETA CRÉDITO',
	QR: 'QR',
	SCHOLARSHIP: 'BECA'
};

function padReceiptNumber(value: number): string {
	return value.toString().padStart(8, '0');
}

function formatDate(value: Date | string | null | undefined): string {
	if (!value) return '-';

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return '-';
	}

	return dateFormat.format(date);
}

function drawCell(
	doc: PDFKit.PDFDocument,
	text: string,
	x: number,
	y: number,
	width: number,
	height: number,
	options: {
		align?: 'left' | 'center' | 'right';
		bold?: boolean;
		fontSize?: number;
	} = {}
) {
	doc.rect(x, y, width, height).lineWidth(0.5).strokeColor('#111827').stroke();

	doc
		.font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
		.fontSize(options.fontSize ?? 8)
		.fillColor('#111827')
		.text(text, x + 4, y + 5, {
			width: width - 8,
			height: height - 8,
			align: options.align ?? 'left',
			ellipsis: true
		});
}

export async function generateFinancialReceiptPdf(context: ReceiptDocumentContext) {
	const { receipt, institutional } = context;

	const doc = new PDFDocument({
		size: 'A4',
		margin: 40,
		info: {
			Title: `Recibo ${institutional.pointOfSale}-${padReceiptNumber(receipt.receiptNumber)}`,
			Author: institutional.name || 'Instituto Paulo Freire',
			Subject: `Recibo de pago de ${receipt.studentName}`
		}
	});

	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolve) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
	});

	addInstitutionalLetterhead(doc, {
		horizontalMargin: 30,
		gapAfter: 14
	});

	const left = 40;
	const contentWidth = doc.page.width - 80;

	doc
		.font('Helvetica-Bold')
		.fontSize(18)
		.fillColor('#111827')
		.text('RECIBO', left, doc.y, {
			width: contentWidth / 2,
			align: 'left'
		});

	const headingY = doc.y - 18;

	doc
		.font('Helvetica-Bold')
		.fontSize(11)
		.text(
			`Nº ${institutional.pointOfSale || '0001'} - ${padReceiptNumber(receipt.receiptNumber)}`,
			left + contentWidth / 2,
			headingY,
			{
				width: contentWidth / 2,
				align: 'right'
			}
		);

	doc.moveDown(0.7);

	doc
		.font('Helvetica')
		.fontSize(9)
		.text(
			[
				`Fecha: ${formatDate(receipt.issuedAt)}`,
				receipt.locationName ? `Sede: ${receipt.locationName}` : null,
				institutional.cuit ? `CUIT: ${institutional.cuit}` : null,
				institutional.taxStatus || null
			]
				.filter(Boolean)
				.join(' · '),
			{
				align: 'left'
			}
		);

	doc.moveDown(1);

	const studentTop = doc.y;

	doc
		.font('Helvetica-Bold')
		.fontSize(9)
		.text('Recibí de:', left, studentTop, {
			continued: true
		})
		.font('Helvetica')
		.text(` ${receipt.studentName}`);

	doc
		.font('Helvetica-Bold')
		.text('DNI:', {
			continued: true
		})
		.font('Helvetica')
		.text(` ${formatDni(receipt.studentDni) || '-'}`);

	doc
		.font('Helvetica-Bold')
		.text('Domicilio:', {
			continued: true
		})
		.font('Helvetica')
		.text(` ${receipt.studentAddress || '-'}`);

	if (receipt.student?.locality) {
		doc
			.font('Helvetica-Bold')
			.text('Localidad:', {
				continued: true
			})
			.font('Helvetica')
			.text(` ${receipt.student.locality}`);
	}

	doc.moveDown(1);

	const tableX = left;
	let tableY = doc.y;

	const columns = [230, 70, 65, 65, 85];

	const headers = ['Concepto', 'Valor', 'Rec.', 'Desc.', 'A pagar'];

	for (let index = 0; index < headers.length; index += 1) {
		const x = tableX + columns.slice(0, index).reduce((sum, value) => sum + value, 0);

		drawCell(doc, headers[index], x, tableY, columns[index], 24, {
			align: index === 0 ? 'left' : 'right',
			bold: true
		});
	}

	tableY += 24;

	const itemCount = Math.max(receipt.items.length, 1);
	const rowHeight = Math.max(22, Math.min(38, 190 / itemCount));

	for (const item of receipt.items) {
		const description = [item.concept, item.periodLabel].filter(Boolean).join(' · ');

		const values = [
			description,
			currency.format(item.baseAmount),
			item.lateFeeAmount > 0 ? currency.format(item.lateFeeAmount) : '-',
			item.discountAmount > 0 ? currency.format(item.discountAmount) : '-',
			currency.format(item.finalAmount)
		];

		for (let index = 0; index < values.length; index += 1) {
			const x = tableX + columns.slice(0, index).reduce((sum, value) => sum + value, 0);

			drawCell(doc, values[index], x, tableY, columns[index], rowHeight, {
				align: index === 0 ? 'left' : 'right',
				fontSize: 8
			});
		}

		tableY += rowHeight;
	}

	const totals = {
		base: receipt.items.reduce((sum, item) => sum + item.baseAmount, 0),
		lateFee: receipt.items.reduce((sum, item) => sum + item.lateFeeAmount, 0),
		discount: receipt.items.reduce((sum, item) => sum + item.discountAmount, 0),
		final: receipt.items.reduce((sum, item) => sum + item.finalAmount, 0)
	};

	const totalValues = [
		'TOTALES',
		currency.format(totals.base),
		totals.lateFee > 0 ? currency.format(totals.lateFee) : '-',
		totals.discount > 0 ? currency.format(totals.discount) : '-',
		currency.format(totals.final)
	];

	for (let index = 0; index < totalValues.length; index += 1) {
		const x = tableX + columns.slice(0, index).reduce((sum, value) => sum + value, 0);

		drawCell(doc, totalValues[index], x, tableY, columns[index], 24, {
			align: index === 0 ? 'right' : 'right',
			bold: true
		});
	}

	doc.y = tableY + 38;

	doc
		.font('Helvetica')
		.fontSize(9)
		.text(
			`FORMA DE PAGO: ${paymentMethodNames[receipt.paymentMethod] || receipt.paymentMethod}`,
			left,
			doc.y,
			{
				continued: true
			}
		)
		.font('Helvetica-Bold')
		.text(`     IMPORTE ABONADO: ${currency.format(receipt.totalAmount)}`);

	if (receipt.paymentReference) {
		doc.font('Helvetica').fontSize(8.5).text(`Referencia: ${receipt.paymentReference}`);
	}

	if (receipt.observations) {
		doc.moveDown(0.5);
		doc.font('Helvetica-Bold').fontSize(8.5).text('Observaciones:');
		doc.font('Helvetica').text(receipt.observations, {
			width: contentWidth,
			height: 48,
			ellipsis: true
		});
	}

	const signatureY = Math.max(doc.y + 45, doc.page.height - 135);

	doc
		.moveTo(left + 25, signatureY)
		.lineTo(left + 210, signatureY)
		.lineWidth(0.6)
		.strokeColor('#111827')
		.stroke();

	doc
		.moveTo(doc.page.width - left - 210, signatureY)
		.lineTo(doc.page.width - left - 25, signatureY)
		.stroke();

	doc
		.font('Helvetica')
		.fontSize(8.5)
		.fillColor('#111827')
		.text(institutional.signatureLeftLabel || 'Firma Secretaría', left + 25, signatureY + 7, {
			width: 185,
			align: 'center'
		});

	doc.text(
		institutional.signatureRightLabel || 'Firma Responsable',
		doc.page.width - left - 210,
		signatureY + 7,
		{
			width: 185,
			align: 'center'
		}
	);

	if (institutional.receiptFooter) {
		doc
			.fontSize(7.5)
			.fillColor('#4b5563')
			.text(institutional.receiptFooter, left, doc.page.height - 75, {
				width: contentWidth,
				align: 'center'
			});
	}

	doc
		.font('Helvetica-Bold')
		.fontSize(8)
		.fillColor('#111827')
		.text(receipt.originalCopy ? 'ORIGINAL' : 'COPIA', left, doc.page.height - 50, {
			width: contentWidth,
			align: 'center'
		});

	doc.end();

	const buffer = await done;

	const fileName = `recibo-${institutional.pointOfSale || '0001'}-${padReceiptNumber(
		receipt.receiptNumber
	)}.pdf`;

	return {
		buffer,
		fileName
	};
}
