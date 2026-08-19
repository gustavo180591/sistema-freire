import { PrismaClient, DocumentAccessAction, DocumentStatus } from '@prisma/client';
import type {
	DocumentVisibility,
	DocumentCategory,
	DocumentSubType,
	DocumentOwnerType,
	Document,
	DocumentAccessLog,
	Prisma
} from '@prisma/client';
import { documentStorageService } from './document-storage.service';
import { validateDocumentFile, type SanitizedFileMetadata } from './document-file-validation';

const prisma = new PrismaClient();

/**
 * Parameters for creating a document
 */
export interface CreateDocumentParams {
	file: File;
	ownerType: DocumentOwnerType;
	ownerId: string;
	category: DocumentCategory;
	subType: DocumentSubType;
	visibility: DocumentVisibility;
	uploadedById: string;
	metadata?: Record<string, unknown>;
}

/**
 * Parameters for listing documents
 */
export interface ListDocumentsParams {
	ownerType?: DocumentOwnerType;
	ownerId?: string;
	category?: DocumentCategory;
	subType?: DocumentSubType;
	status?: DocumentStatus;
	visibility?: DocumentVisibility;
	uploadedById?: string;
	includeDeleted?: boolean;
	limit?: number;
	offset?: number;
}

/**
 * Parameters for logging document access
 */
export interface LogDocumentAccessParams {
	documentId: string;
	userId: string;
	action: DocumentAccessAction;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Document management service
 * Handles document metadata, storage integration, and access logging
 */
export class DocumentManagementService {
	/**
	 * Create a new document with file storage and audit log
	 * Uses compensating transaction pattern: save file first, then DB, rollback file if DB fails
	 */
	async createDocument(params: CreateDocumentParams): Promise<Document> {
		// Step 1: Validate file
		const fileMetadata = validateDocumentFile(params.file);

		// Step 2: Save file to storage
		const extension = fileMetadata.extension.replace('.', '');
		const storageKey = documentStorageService.generateStorageKey({
			ownerType: params.ownerType,
			ownerId: params.ownerId,
			category: params.category,
			extension
		});

		await documentStorageService.saveDocumentFile({
			file: params.file,
			storageKey
		});

		// Step 3: Calculate SHA-256 hash
		const sha256Hash = await documentStorageService.calculateSha256(params.file);

		// Step 4: Create Document and AccessLog in transaction
		try {
			const document = await prisma.$transaction(async (tx) => {
				// Create document record
				const newDocument = await tx.document.create({
					data: {
						ownerType: params.ownerType,
						ownerId: params.ownerId,
						category: params.category,
						subType: params.subType,
						visibility: params.visibility,
						uploadedById: params.uploadedById,
						originalName: fileMetadata.originalName,
						storedName: storageKey.split('/').pop() || storageKey,
						storageKey,
						mimeType: fileMetadata.mimeType,
						extension: fileMetadata.extension,
						sizeBytes: fileMetadata.sizeBytes,
						sha256Hash,
						metadata: params.metadata as Prisma.InputJsonValue,
						status: DocumentStatus.ACTIVE
					}
				});

				// Create access log for UPLOAD action
				await tx.documentAccessLog.create({
					data: {
						documentId: newDocument.id,
						userId: params.uploadedById,
						action: DocumentAccessAction.UPLOAD,
						metadata: params.metadata as Prisma.InputJsonValue
					}
				});

				return newDocument;
			});

			return document;
		} catch (error) {
			// Step 5: Rollback - delete physical file if DB transaction failed
			try {
				await documentStorageService.deleteDocumentFileForCleanup(storageKey);
			} catch (cleanupError) {
				console.error('Failed to cleanup file after DB error:', cleanupError);
			}
			throw error;
		}
	}

	/**
	 * Get a document by ID
	 */
	async getDocumentById(id: string): Promise<Document | null> {
		return await prisma.document.findUnique({
			where: { id },
			include: {
				uploadedBy: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true
					}
				}
			}
		});
	}

	/**
	 * List documents with optional filters
	 */
	async listDocuments(params: ListDocumentsParams = {}): Promise<Document[]> {
		const where: Record<string, unknown> = {};

		if (params.ownerType) where.ownerType = params.ownerType;
		if (params.ownerId) where.ownerId = params.ownerId;
		if (params.category) where.category = params.category;
		if (params.subType) where.subType = params.subType;
		if (params.visibility) where.visibility = params.visibility;
		if (params.uploadedById) where.uploadedById = params.uploadedById;

		// By default, exclude deleted documents unless explicitly requested
		if (!params.includeDeleted) {
			where.status = DocumentStatus.ACTIVE;
		} else if (params.status) {
			where.status = params.status;
		}

		return await prisma.document.findMany({
			where,
			include: {
				uploadedBy: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			take: params.limit,
			skip: params.offset
		});
	}

	/**
	 * Log document access
	 */
	async logDocumentAccess(params: LogDocumentAccessParams): Promise<DocumentAccessLog> {
		return await prisma.documentAccessLog.create({
			data: {
				documentId: params.documentId,
				userId: params.userId,
				action: params.action,
				ipAddress: params.ipAddress,
				userAgent: params.userAgent,
				metadata: params.metadata as Prisma.InputJsonValue
			}
		});
	}

	/**
	 * Soft delete a document
	 * Does not delete the physical file or access logs
	 */
	async softDeleteDocument(id: string, userId: string): Promise<Document> {
		const document = await prisma.document.update({
			where: { id },
			data: {
				status: DocumentStatus.DELETED,
				deletedAt: new Date()
			}
		});

		// Log the DELETE action
		await this.logDocumentAccess({
			documentId: id,
			userId,
			action: DocumentAccessAction.DELETE
		});

		return document;
	}

	/**
	 * Restore a soft-deleted document
	 */
	async restoreDocument(id: string, userId: string): Promise<Document> {
		const document = await prisma.document.update({
			where: { id },
			data: {
				status: DocumentStatus.ACTIVE,
				deletedAt: null
			}
		});

		// Log the RESTORE action
		await this.logDocumentAccess({
			documentId: id,
			userId,
			action: DocumentAccessAction.RESTORE
		});

		return document;
	}

	/**
	 * Get a document with its access logs
	 */
	async getDocumentWithAccessLogs(
		id: string
	): Promise<{ document: Document; accessLogs: DocumentAccessLog[] } | null> {
		const document = await prisma.document.findUnique({
			where: { id },
			include: {
				uploadedBy: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true
					}
				}
			}
		});

		if (!document) {
			return null;
		}

		const accessLogs = await prisma.documentAccessLog.findMany({
			where: { documentId: id },
			orderBy: { createdAt: 'desc' }
		});

		return { document, accessLogs };
	}

	/**
	 * Cleanup: delete document record and physical file (for tests only)
	 * This should only be used for test cleanup, not functional user flows
	 */
	async cleanupDocumentForTest(documentId: string): Promise<void> {
		const document = await prisma.document.findUnique({
			where: { id: documentId }
		});

		if (!document) {
			return;
		}

		// Delete access logs
		await prisma.documentAccessLog.deleteMany({
			where: { documentId }
		});

		// Delete document record
		await prisma.document.delete({
			where: { id: documentId }
		});

		// Delete physical file
		try {
			await documentStorageService.deleteDocumentFileForCleanup(document.storageKey);
		} catch (error) {
			console.error('Failed to delete physical file during cleanup:', error);
		}
	}
}

/**
 * Singleton instance
 */
export const documentManagementService = new DocumentManagementService();
