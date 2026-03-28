import { AuditAction } from '@prisma/client';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getFinancialReport } from '$lib/server/services/reports/financial-report.service';

export const GET: RequestHandler = async ({ locals }) => {
    const report = await getFinancialReport();

    const workbook = XLSX.utils.book_new();

    const rows = report.rows.map((row) => ({
        Alumno: row.student,
        Carrera: row.career,
        Periodo: row.periodLabel,
        Concepto: row.concept,
        Pendiente: row.pending,
        Estado: row.pending > 0 ? 'Bloqueado' : 'Al día'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Financiero');

    const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx'
    });

    try {
        await auditLog({
            action: AuditAction.EXPORT,
            entityType: 'FinancialReport',
            description: 'Exportación Excel del reporte financiero de morosidad',
            userId: locals.user?.id
        });
    } catch {
        // noop
    }

    const fileName = `reporte-financiero-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`
        }
    });
};
