import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getFinancialReport } from '$lib/server/services/reports/financial-report.service';

export const GET: RequestHandler = async ({ locals }) => {
	const report = await getFinancialReport();

	const doc = new PDFDocument({ margin: 40, size: 'A4' });
	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolve) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
	});

	doc.fontSize(18).text('Instituto Paulo Freire', { align: 'center' });
	doc.moveDown(0.5);
	doc.fontSize(14).text('Reporte Financiero de Morosidad', { align: 'center' });
	doc.moveDown();

	doc.fontSize(10);
	doc.text(`Alumnos con deuda: ${report.metrics.studentsWithDebt}`);
	doc.text(`Deuda total: ${report.metrics.totalDebt}`);
	doc.text(`Pagos registrados: ${report.metrics.paymentsCount}`);
	doc.text(`Importe cobrado: ${report.metrics.totalCollected}`);
	doc.moveDown();

	report.rows.slice(0, 40).forEach((row, index) => {
		doc.text(
			`${index + 1}. ${row.student} | ${row.career} | ${row.periodLabel} | ${row.concept} | Pendiente: ${row.pending}`
		);
	});

	doc.end();

	const buffer = await done;

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'FinancialReportPDF',
			description: 'Exportación PDF del reporte financiero de morosidad',
			userId: locals.user?.id
		});
	} catch {
		// noop
	}

	const fileName = `reporte-financiero-${new Date().toISOString().slice(0, 10)}.pdf`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
