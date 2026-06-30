import { error, json } from '@sveltejs/kit';
import { documentManagementService } from '$lib/server/document-management/document-management.service';
import { requireRestoreDocumentPermission } from '$lib/server/document-management/document-permissions';

/**
 * POST /api/documents/[id]/restore
 * Restore a soft-deleted document
 */
export async function POST({ params, locals }) {
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

		// Require restore permission
		await requireRestoreDocumentPermission(user, document);

		// Restore document (logs RESTORE action automatically)
		const restoredDocument = await documentManagementService.restoreDocument(document.id, user.id);

		// Return safe document data (no absolute paths)
		return json({
			id: restoredDocument.id,
			originalName: restoredDocument.originalName,
			storedName: restoredDocument.storedName,
			mimeType: restoredDocument.mimeType,
			extension: restoredDocument.extension,
			sizeBytes: restoredDocument.sizeBytes,
			sha256Hash: restoredDocument.sha256Hash,
			ownerType: restoredDocument.ownerType,
			ownerId: restoredDocument.ownerId,
			category: restoredDocument.category,
			subType: restoredDocument.subType,
			status: restoredDocument.status,
			visibility: restoredDocument.visibility,
			uploadedById: restoredDocument.uploadedById,
			createdAt: restoredDocument.createdAt,
			updatedAt: restoredDocument.updatedAt,
			deletedAt: restoredDocument.deletedAt,
			expiresAt: restoredDocument.expiresAt,
			metadata: restoredDocument.metadata,
			tags: restoredDocument.tags
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
		console.error('Error restoring document:', e);
		throw error(500, 'Error al restaurar documento');
	}
}
