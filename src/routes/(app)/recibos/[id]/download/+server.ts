import { error } from '@sveltejs/kit';
import { AuditAction } from '@prisma/client';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getPayslipById } from '$lib/server/services/payroll/payslip.service';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { FileStorageService } from '$lib/server/services/storage/file-storage.service';

export const GET: RequestHandler = async ({ params, locals }) => {
	await requirePermission(locals.user, 'PAYSLIP', 'read');

	const payslip = await getPayslipById(params.id);

	if (!payslip || payslip.deletedAt) {
		throw error(404, 'Recibo no encontrado');
	}

	if (!payslip.fileKey) {
		throw error(404, 'El PDF del recibo no está disponible');
	}

	let fileBuffer: Buffer;

	try {
		fileBuffer = await FileStorageService.readFile(payslip.fileKey);
	} catch {
		throw error(404, 'No se pudo recuperar el archivo PDF');
	}

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'PayslipPDF',
			entityId: payslip.id,
			description: `Descarga de recibo ${payslip.id}`,
			userId: locals.user?.id
		});
	} catch {
		// La auditoría no debe impedir la descarga autorizada.
	}

	const fileName =
		payslip.originalFileName || `recibo-${payslip.periodMonth}-${payslip.periodYear}.pdf`;

	return new Response(fileBuffer as unknown as BodyInit, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
