import { error } from '@sveltejs/kit';
import { AuditAction } from '@prisma/client';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getPayslipById } from '$lib/server/services/payroll/payslip.service';
import { requireRoleOrOwnership } from '$lib/server/auth/authorization';
import { FileStorageService } from '$lib/server/services/storage/file-storage.service';

export const GET: RequestHandler = async ({ params, locals }) => {
	const payslip = await getPayslipById(params.id);

	if (!payslip) {
		throw error(404, 'Recibo no encontrado');
	}

	// Verificar si está eliminado lógicamente
	if (payslip.deletedAt) {
		throw error(404, 'Recibo no encontrado');
	}

	// ACL híbrido:
	// - DIRECTOR / FINANZAS / LIQUIDADOR acceden por rol
	// - DOCENTE accede solo si es dueño
	requireRoleOrOwnership(
		locals.user,
		['DIRECTOR', 'FINANZAS', 'LIQUIDADOR'],
		payslip.teacher.userId
	);

	if (!payslip.fileKey) {
		throw error(404, 'El PDF del recibo no está disponible');
	}

	// Leer archivo desde almacenamiento privado
	let fileBuffer: Buffer;
	try {
		fileBuffer = await FileStorageService.readFile(payslip.fileKey);
	} catch (err) {
		throw error(404, 'No se pudo recuperar el archivo PDF');
	}

	// Auditoría
	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'PayslipPDF',
			entityId: payslip.id,
			description: `Descarga de recibo ${payslip.id}`,
			userId: locals.user?.id
		});
	} catch {
		// noop
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
