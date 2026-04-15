import { error } from '@sveltejs/kit';
import { AuditAction } from '@prisma/client';
import type { RequestHandler } from './$types';
import { auditLog } from '$lib/server/audit';
import { getPayslipById } from '$lib/server/services/payroll/payslip.service';
import { requireRoleOrOwnership } from '$lib/server/auth/authorization';

export const GET: RequestHandler = async ({ params, locals }) => {
	const payslip = await getPayslipById(params.id);

	if (!payslip) {
		throw error(404, 'Recibo no encontrado');
	}

	// ACL híbrido:
	// - DIRECTOR / FINANZAS acceden por rol
	// - DOCENTE accede solo si es dueño
	requireRoleOrOwnership(locals.user, ['DIRECTOR', 'FINANZAS'], payslip.teacher.userId);

	if (!payslip.fileUrl) {
		throw error(404, 'El PDF del recibo no está disponible');
	}

	const fileResponse = await fetch(payslip.fileUrl);

	if (!fileResponse.ok) {
		throw error(404, 'No se pudo recuperar el archivo PDF');
	}

	const arrayBuffer = await fileResponse.arrayBuffer();

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

	const fileName = `recibo-${payslip.periodMonth}-${payslip.periodYear}.pdf`;

	return new Response(arrayBuffer, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
