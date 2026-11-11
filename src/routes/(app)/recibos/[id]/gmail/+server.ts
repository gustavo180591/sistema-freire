import { error, redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requirePermission } from '$lib/server/auth/permissions-granular';
import { getReceiptDocumentContext } from '$lib/server/financial/receipt-document-service';
import {
	createGmailAuthorizationUrl,
	isGmailDraftIntegrationConfigured
} from '$lib/server/google/gmail-receipt-draft-service';

export const GET: RequestHandler = async ({ params, locals }) => {
	await requirePermission(locals.user, 'RECEIPT', 'update');

	if (!locals.user?.id) {
		throw error(401, 'No autenticado');
	}

	if (!isGmailDraftIntegrationConfigured()) {
		throw error(503, 'La integración con Gmail todavía no está configurada');
	}

	const context = await getReceiptDocumentContext(params.id);

	if (!context) {
		throw error(404, 'Recibo no encontrado');
	}

	if (context.receipt.status !== 'ISSUED') {
		throw error(409, 'Solo se pueden preparar recibos emitidos y vigentes');
	}

	if (!context.recipientEmail) {
		throw error(400, 'El alumno no tiene un correo electrónico registrado');
	}

	const authorizationUrl = createGmailAuthorizationUrl({
		receiptId: context.receipt.id,
		userId: locals.user.id
	});

	throw redirect(303, authorizationUrl);
};
