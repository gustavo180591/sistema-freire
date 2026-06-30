import { error, json } from '@sveltejs/kit';
import { documentManagementService } from '$lib/server/document-management/document-management.service';
import { requireCreateDocumentPermission, requireListDocumentsPermission } from '$lib/server/document-management/document-permissions';
import type { DocumentOwnerType, DocumentCategory, DocumentSubType, DocumentVisibility, DocumentStatus } from '@prisma/client';

/**
 * POST /api/documents
 * Upload a new document
 */
export async function POST({ request, locals }) {
	const user = locals.user;

	// Require authentication
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// Require create permission
	await requireCreateDocumentPermission(user);

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			throw error(400, 'No se proporcionó archivo');
		}

		// Get required metadata
		const ownerType = formData.get('ownerType') as DocumentOwnerType;
		const ownerId = formData.get('ownerId') as string;
		const category = formData.get('category') as DocumentCategory;
		const subType = formData.get('subType') as DocumentSubType;
		const visibility = formData.get('visibility') as DocumentVisibility;

		// Validate required fields
		if (!ownerType || !ownerId || !category || !subType || !visibility) {
			throw error(400, 'Faltan campos requeridos: ownerType, ownerId, category, subType, visibility');
		}

		// Parse optional metadata
		let metadata: Record<string, unknown> | undefined;
		const metadataStr = formData.get('metadata') as string | null;
		if (metadataStr) {
			try {
				metadata = JSON.parse(metadataStr);
			} catch (e) {
				throw error(400, 'metadata inválido: debe ser JSON válido');
			}
		}

		// Create document
		const document = await documentManagementService.createDocument({
			file,
			ownerType,
			ownerId,
			category,
			subType,
			visibility,
			uploadedById: user.id,
			metadata
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
		if (e instanceof Error && e.message.includes('400')) {
			throw e;
		}
		console.error('Error creating document:', e);
		throw error(500, 'Error al crear documento');
	}
}

/**
 * GET /api/documents
 * List documents with filters
 */
export async function GET({ url, locals }) {
	const user = locals.user;

	// Require authentication
	if (!user) {
		throw error(401, 'No autenticado');
	}

	// Require list permission
	await requireListDocumentsPermission(user);

	try {
		// Parse query parameters
		const ownerType = url.searchParams.get('ownerType') as DocumentOwnerType | null;
		const ownerId = url.searchParams.get('ownerId');
		const category = url.searchParams.get('category') as DocumentCategory | null;
		const subType = url.searchParams.get('subType') as DocumentSubType | null;
		const status = url.searchParams.get('status');
		const visibility = url.searchParams.get('visibility') as DocumentVisibility | null;
		const uploadedById = url.searchParams.get('uploadedById');
		const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
		const limit = url.searchParams.get('limit');
		const offset = url.searchParams.get('offset');

		const documents = await documentManagementService.listDocuments({
			ownerType: ownerType || undefined,
			ownerId: ownerId || undefined,
			category: category || undefined,
			subType: subType || undefined,
			status: (status as DocumentStatus) || undefined,
			visibility: visibility || undefined,
			uploadedById: uploadedById || undefined,
			includeDeleted,
			limit: limit ? parseInt(limit, 10) : undefined,
			offset: offset ? parseInt(offset, 10) : undefined
		});

		// Return safe document data (no absolute paths)
		return json(
			documents.map((doc) => ({
				id: doc.id,
				originalName: doc.originalName,
				storedName: doc.storedName,
				mimeType: doc.mimeType,
				extension: doc.extension,
				sizeBytes: doc.sizeBytes,
				sha256Hash: doc.sha256Hash,
				ownerType: doc.ownerType,
				ownerId: doc.ownerId,
				category: doc.category,
				subType: doc.subType,
				status: doc.status,
				visibility: doc.visibility,
				uploadedById: doc.uploadedById,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
				deletedAt: doc.deletedAt,
				expiresAt: doc.expiresAt,
				metadata: doc.metadata,
				tags: doc.tags
			}))
		);
	} catch (e) {
		if (e instanceof Error && e.message.includes('401')) {
			throw e;
		}
		if (e instanceof Error && e.message.includes('403')) {
			throw e;
		}
		console.error('Error listing documents:', e);
		throw error(500, 'Error al listar documentos');
	}
}
