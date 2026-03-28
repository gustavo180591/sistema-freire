import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getOfficialReport } from '$lib/server/services/reports/official-report.service';

export const GET: RequestHandler = async ({ locals }) => {
    const report = await getOfficialReport();

    const doc = new PDFDocument({
        margin: 40,
        size: 'A4'
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Header institucional
    doc.fontSize(18).text('Instituto Paulo Freire', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text('Reporte Oficial Institucional', {
        align: 'center'
    });
    doc.moveDown();

    // Resumen
    doc.fontSize(10);
    doc.text(`Actas: ${report.metrics.records}`);
    doc.text(`Libro matriz: ${report.metrics.matrix}`);
    doc.text(`Nóminas: ${report.metrics.rosters}`);
    doc.text(`Certificados: ${report.metrics.certificates}`);
    doc.moveDown();

    // Detalle documental
    report.documents.forEach((row, index) => {
        doc.text(
            `${index + 1}. ${row.name} | ${row.type} | ${row.period} | ${row.status}`
        );
    });

    doc.end();

    const buffer = await done;

    try {
        await auditLog({
            action: AuditAction.EXPORT,
            entityType: 'OfficialReportPDF',
            description: 'Exportación PDF de documentación oficial institucional',
            userId: locals.user?.id
        });
    } catch {
        // noop
    }

    const fileName = `reporte-oficial-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`
        }
    });
};