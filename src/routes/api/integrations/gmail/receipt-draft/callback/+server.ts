import { AuditAction } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { auditLog } from '$lib/server/audit';
import { requirePermission } from '$lib/server/auth/permissions-granular';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { getReceiptDocumentContext } from '$lib/server/financial/receipt-document-service';
import { generateFinancialReceiptPdf } from '$lib/server/financial/receipt-pdf-service';
import {
	createGmailDraft,
	exchangeGmailAuthorizationCode,
	getGmailProfile,
	verifyGmailOAuthState
} from '$lib/server/google/gmail-receipt-draft-service';

const currency = new Intl.NumberFormat('es-AR', {
	style: 'currency',
	currency: 'ARS',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2
});

function padReceiptNumber(value: number): string {
	return value.toString().padStart(8, '0');
}

export const GET: RequestHandler = async ({ url, locals }) => {
	await requirePermission(locals.user, 'RECEIPT', 'update');

	if (!locals.user?.id) {
		throw error(401, 'No autenticado');
	}

	const googleError = url.searchParams.get('error');

	if (googleError) {
		throw error(400, 'La autorización de Google fue cancelada o rechazada');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code || !state) {
		throw error(400, 'Respuesta OAuth de Google incompleta');
	}

	let receiptId: string;

	try {
		({ receiptId } = verifyGmailOAuthState(state, locals.user.id));
	} catch (stateError) {
		console.warn(
			'Estado OAuth de Gmail rechazado:',
			stateError instanceof Error ? stateError.message : 'Error desconocido'
		);

		throw error(400, 'La autorización de Gmail no es válida o venció');
	}

	const context = await getReceiptDocumentContext(receiptId);

	if (!context) {
		throw error(404, 'Recibo no encontrado');
	}

	await requireStudentAccess(locals.user, context.receipt.studentId);

	if (context.receipt.status !== 'ISSUED') {
		throw error(409, 'Solo se pueden preparar recibos emitidos y vigentes');
	}

	if (!context.recipientEmail) {
		throw error(400, 'El alumno no tiene un correo electrónico registrado');
	}

	const receiptLabel = `${context.institutional.pointOfSale || '0001'}-${padReceiptNumber(
		context.receipt.receiptNumber
	)}`;

	const institutionName = context.institutional.name || 'Instituto Paulo Freire';

	const amount = currency.format(context.receipt.totalAmount);

	let senderEmail: string;
	let draftId: string;

	try {
		const accessToken = await exchangeGmailAuthorizationCode(code);

		const gmailProfile = await getGmailProfile(accessToken);

		senderEmail = gmailProfile.emailAddress;

		const pdf = await generateFinancialReceiptPdf(context);

		const draft = await createGmailDraft(accessToken, {
			from: senderEmail,
			to: context.recipientEmail,
			subject: `Recibo ${receiptLabel} - ${institutionName}`,
			text:
				`Hola ${context.receipt.studentName}.\n\n` +
				`Adjuntamos el recibo Nº ${receiptLabel} correspondiente al pago registrado ` +
				`por ${amount}.\n\n` +
				`El comprobante se encuentra adjunto en formato PDF.\n\n` +
				`${institutionName}`,
			attachment: {
				filename: pdf.fileName,
				content: pdf.buffer,
				contentType: 'application/pdf'
			}
		});

		draftId = draft.draftId;
	} catch (gmailError) {
		console.error(
			'Error al preparar borrador de recibo en Gmail:',
			gmailError instanceof Error ? gmailError.message : 'Error desconocido'
		);

		throw error(502, 'No se pudo preparar el borrador en Gmail. Intentá nuevamente.');
	}

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'FinancialReceiptGmailDraft',
			entityId: context.receipt.id,
			description: `Recibo ${receiptLabel} preparado como borrador en Gmail`,
			userId: locals.user.id,
			metadata: {
				channel: 'gmail-draft',
				sender: senderEmail,
				recipient: context.recipientEmail,
				draftId,
				receiptNumber: context.receipt.receiptNumber,
				pointOfSale: context.institutional.pointOfSale
			}
		});
	} catch {
		/*
		 * El borrador ya existe en Gmail.
		 * Una falla de auditoría no debe provocar una segunda creación.
		 */
	}

	throw redirect(303, 'https://mail.google.com/mail/#drafts');
};
