import { error } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

import { checkPermission, requirePermission } from '$lib/server/auth/permissions-granular';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { getReceiptDocumentContext } from '$lib/server/financial/receipt-document-service';
import { isGmailDraftIntegrationConfigured } from '$lib/server/google/gmail-receipt-draft-service';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requirePermission(locals.user, 'RECEIPT', 'read');

	const context = await getReceiptDocumentContext(params.id);

	if (!context) {
		throw error(404, 'Recibo no encontrado');
	}

	/*
	 * RECEIPT:read habilita la capacidad general de lectura.
	 * requireStudentAccess limita a ALUMNO a su propio legajo y conserva
	 * las reglas institucionales/preceptor existentes.
	 */
	await requireStudentAccess(locals.user, context.receipt.studentId);

	const canPrepareGmailDraft = await checkPermission(locals.user, 'RECEIPT', 'update');

	return {
		receipt: context.receipt,
		institutional: context.institutional,
		gmailDraft: {
			recipient: context.recipientEmail,
			configured: isGmailDraftIntegrationConfigured(),
			canPrepare: canPrepareGmailDraft
		}
	};
};
