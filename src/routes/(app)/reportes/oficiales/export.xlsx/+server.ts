import { AuditAction } from '@prisma/client';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getOfficialReport } from '$lib/server/services/reports/official-report.service';

export const GET: RequestHandler = async ({ locals }) => {
	const report = await getOfficialReport();

	const workbook = XLSX.utils.book_new();

	const rows = report.documents.map((doc) => ({
		Documento: doc.name,
		Tipo: doc.type,
		Periodo: doc.period,
		Estado: doc.status
	}));

	const worksheet = XLSX.utils.json_to_sheet(rows);
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Oficiales');

	const buffer = XLSX.write(workbook, {
		type: 'buffer',
		bookType: 'xlsx'
	});

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'OfficialReport',
			description: 'Exportación Excel de documentación oficial institucional',
			userId: locals.user?.id
		});
	} catch {
		// noop
	}

	const fileName = `reporte-oficial-${new Date().toISOString().slice(0, 10)}.xlsx`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
