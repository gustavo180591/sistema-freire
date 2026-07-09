import { error } from '@sveltejs/kit';
import { documentManagementService } from './document-management.service';
import { documentStorageService } from './document-storage.service';
import {
	requireCreateDocumentPermission,
	requireListDocumentsPermission,
	requireReadDocumentPermission,
	requireDeleteDocumentPermission,
	requireRestoreDocumentPermission
} from './document-permissions';
import type {
	DocumentOwnerType,
	DocumentCategory,
	DocumentSubType,
	DocumentVisibility
} from '@prisma/client';
import { DocumentStatus, Prisma } from '@prisma/client';

/**
 * Server-side helpers for document API operations
 * These can be tested directly without HTTP layer
 */

export interface CreateDocumentApiParams {
	file: File;
	ownerType: DocumentOwnerType;
	ownerId: string;
	category: DocumentCategory;
	subType: DocumentSubType;
	visibility: DocumentVisibility;
	metadata?: Record<string, unknown>;
}

export interface ListDocumentsApiParams {
	ownerType?: DocumentOwnerType;
	ownerId?: string;
	category?: DocumentCategory;
	subType?: DocumentSubType;
	status?: string;
	visibility?: DocumentVisibility;
	uploadedById?: string;
	includeDeleted?: boolean;
	limit?: number;
	offset?: number;
}

export interface DownloadDocumentApiParams {
	documentId: string;
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Safe document response (no absolute paths)
 */
export interface SafeDocumentResponse {
	id: string;
	originalName: string;
	storedName: string;
	mimeType: string;
	extension: string;
	sizeBytes: number;
	sha256Hash: string | null;
	ownerType: DocumentOwnerType;
	ownerId: string;
	category: DocumentCategory;
	subType: DocumentSubType;
	status: string;
	visibility: DocumentVisibility;
	uploadedById: string;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	expiresAt: Date | null;
	metadata: unknown;
	tags: string[];
}

/**
 * Convert Document to safe response
 */
function toSafeDocument(doc: Prisma.DocumentGetPayload<{}>): SafeDocumentResponse {
	return {
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
	};
}

/**
 * Create document via API
 */
export async function createDocumentApi(
	user: App.Locals['user'] | null,
	params: CreateDocumentApiParams
): Promise<SafeDocumentResponse> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	await requireCreateDocumentPermission(user);

	const document = await documentManagementService.createDocument({
		file: params.file,
		ownerType: params.ownerType,
		ownerId: params.ownerId,
		category: params.category,
		subType: params.subType,
		visibility: params.visibility,
		uploadedById: user.id,
		metadata: params.metadata
	});

	return toSafeDocument(document);
}

/**
 * List documents via API
 */
export async function listDocumentsApi(
	user: App.Locals['user'],
	params: ListDocumentsApiParams
): Promise<SafeDocumentResponse[]> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	await requireListDocumentsPermission(user);

	const documents = await documentManagementService.listDocuments({
		ownerType: params.ownerType,
		ownerId: params.ownerId,
		category: params.category,
		subType: params.subType,
		status: params.status as DocumentStatus | undefined,
		visibility: params.visibility,
		uploadedById: params.uploadedById,
		includeDeleted: params.includeDeleted,
		limit: params.limit,
		offset: params.offset
	});

	return documents.map(toSafeDocument);
}

/**
 * Get document detail via API
 */
export async function getDocumentApi(
	user: App.Locals['user'],
	documentId: string,
	ipAddress?: string,
	userAgent?: string
): Promise<SafeDocumentResponse> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const document = await documentManagementService.getDocumentById(documentId);

	if (!document) {
		throw error(404, 'Documento no encontrado');
	}

	await requireReadDocumentPermission(user, document);

	// Log VIEW action
	await documentManagementService.logDocumentAccess({
		documentId: document.id,
		userId: user.id,
		action: 'VIEW',
		ipAddress,
		userAgent
	});

	return toSafeDocument(document);
}

/**
 * Soft delete document via API
 */
export async function deleteDocumentApi(
	user: App.Locals['user'],
	documentId: string
): Promise<SafeDocumentResponse> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const document = await documentManagementService.getDocumentById(documentId);

	if (!document) {
		throw error(404, 'Documento no encontrado');
	}

	await requireDeleteDocumentPermission(user, document);

	const deletedDocument = await documentManagementService.softDeleteDocument(document.id, user.id);

	return toSafeDocument(deletedDocument);
}

/**
 * Restore document via API
 */
export async function restoreDocumentApi(
	user: App.Locals['user'],
	documentId: string
): Promise<SafeDocumentResponse> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const document = await documentManagementService.getDocumentById(documentId);

	if (!document) {
		throw error(404, 'Documento no encontrado');
	}

	await requireRestoreDocumentPermission(user, document);

	const restoredDocument = await documentManagementService.restoreDocument(document.id, user.id);

	return toSafeDocument(restoredDocument);
}

/**
 * Download document via API
 */
export async function downloadDocumentApi(
	user: App.Locals['user'],
	params: DownloadDocumentApiParams
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const document = await documentManagementService.getDocumentById(params.documentId);

	if (!document) {
		throw error(404, 'Documento no encontrado');
	}

	if (document.status === DocumentStatus.DELETED) {
		throw error(410, 'Documento eliminado');
	}

	await requireReadDocumentPermission(user, document);

	const fileExists = await documentStorageService.documentFileExists(document.storageKey);
	if (!fileExists) {
		throw error(404, 'Archivo físico no encontrado');
	}

	const fileBuffer = await documentStorageService.readDocumentFile(document.storageKey);

	// Log DOWNLOAD action
	await documentManagementService.logDocumentAccess({
		documentId: document.id,
		userId: user.id,
		action: 'DOWNLOAD',
		ipAddress: params.ipAddress,
		userAgent: params.userAgent
	});

	return {
		buffer: fileBuffer,
		mimeType: document.mimeType,
		fileName: document.originalName
	};
}
