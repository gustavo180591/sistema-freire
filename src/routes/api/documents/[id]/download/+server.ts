import { error } from '@sveltejs/kit';
import { documentManagementService } from '$lib/server/document-management/document-management.service';
import { documentStorageService } from '$lib/server/document-management/document-storage.service';
import { requireReadDocumentPermission } from '$lib/server/document-management/document-permissions';
import { DocumentStatus } from '@prisma/client';

/**
 * GET /api/documents/[id]/download
 * Download a document file with controlled access
 */
export async function GET({ params, locals, request }) {
	const user = locals.user;

	// Require authentication
	if (!user) {
		throw error(401, 'No autenticado');
	}

	try {
		const document = await documentManagementService.getDocumentById(params.id);

		if (!document) {
			throw error(404, 'Documento no encontrado');
		}

		// Check if document is deleted
		if (document.status === DocumentStatus.DELETED) {
			throw error(410, 'Documento eliminado');
		}

		// Require read permission
		await requireReadDocumentPermission(user, document);

		// Verify physical file exists
		const fileExists = await documentStorageService.documentFileExists(document.storageKey);
		if (!fileExists) {
			throw error(404, 'Archivo físico no encontrado');
		}

		// Read file content
		const fileBuffer = await documentStorageService.readDocumentFile(document.storageKey);

		// Log DOWNLOAD action
		await documentManagementService.logDocumentAccess({
			documentId: document.id,
			userId: user.id,
			action: 'DOWNLOAD',
			ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
			userAgent: request.headers.get('user-agent') || undefined
		});

		// Return file with proper headers
		return new Response(new Uint8Array(fileBuffer), {
			headers: {
				'Content-Type': document.mimeType,
				'Content-Length': fileBuffer.byteLength.toString(),
				'Content-Disposition': `attachment; filename="${encodeURIComponent(document.originalName)}"`,
				'Cache-Control': 'private, max-age=0',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (e) {
		if (e instanceof Error && e.message.includes('401')) {
			throw e;
		}
		if (e instanceof Error && e.message.includes('403')) {
			throw e;
		}
		if (e instanceof Error && e.message.includes('404')) {
			throw e;
		}
		if (e instanceof Error && e.message.includes('410')) {
			throw e;
		}
		console.error('Error downloading document:', e);
		throw error(500, 'Error al descargar documento');
	}
}
