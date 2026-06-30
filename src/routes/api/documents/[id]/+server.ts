import { error, json } from '@sveltejs/kit';
import { documentManagementService } from '$lib/server/document-management/document-management.service';
import {
	requireReadDocumentPermission,
	requireDeleteDocumentPermission,
	requireRestoreDocumentPermission
} from '$lib/server/document-management/document-permissions';

/**
 * GET /api/documents/[id]
 * Get document details
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

		// Require read permission
		await requireReadDocumentPermission(user, document);

		// Log VIEW action
		await documentManagementService.logDocumentAccess({
			documentId: document.id,
			userId: user.id,
			action: 'VIEW',
			ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
			userAgent: request.headers.get('user-agent') || undefined
		});

		// Return safe document data (no absolute paths)
		return json({
			id: document.id,
			originalName: document.originalName,
			storedName: document.storedName,
			mimeType: document.mimeType,
			extension: document.extension,
			sizeBytes: document.sizeBytes,
			sha256Hash: document.sha256Hash,
			ownerType: document.ownerType,
			ownerId: document.ownerId,
			category: document.category,
			subType: document.subType,
			status: document.status,
			visibility: document.visibility,
			uploadedById: document.uploadedById,
			createdAt: document.createdAt,
			updatedAt: document.updatedAt,
			deletedAt: document.deletedAt,
			expiresAt: document.expiresAt,
			metadata: document.metadata,
			tags: document.tags
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
		console.error('Error getting document:', e);
		throw error(500, 'Error al obtener documento');
	}
}

/**
 * DELETE /api/documents/[id]
 * Soft delete a document
 */
export async function DELETE({ params, locals }) {
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

		// Require delete permission
		await requireDeleteDocumentPermission(user, document);

		// Soft delete (logs DELETE action automatically)
		const deletedDocument = await documentManagementService.softDeleteDocument(
			document.id,
			user.id
		);

		// Return safe document data (no absolute paths)
		return json({
			id: deletedDocument.id,
			originalName: deletedDocument.originalName,
			storedName: deletedDocument.storedName,
			mimeType: deletedDocument.mimeType,
			extension: deletedDocument.extension,
			sizeBytes: deletedDocument.sizeBytes,
			sha256Hash: deletedDocument.sha256Hash,
			ownerType: deletedDocument.ownerType,
			ownerId: deletedDocument.ownerId,
			category: deletedDocument.category,
			subType: deletedDocument.subType,
			status: deletedDocument.status,
			visibility: deletedDocument.visibility,
			uploadedById: deletedDocument.uploadedById,
			createdAt: deletedDocument.createdAt,
			updatedAt: deletedDocument.updatedAt,
			deletedAt: deletedDocument.deletedAt,
			expiresAt: deletedDocument.expiresAt,
			metadata: deletedDocument.metadata,
			tags: deletedDocument.tags
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
		console.error('Error deleting document:', e);
		throw error(500, 'Error al eliminar documento');
	}
}
