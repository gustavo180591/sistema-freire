import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { join, resolve } from 'path';
import { DocumentCategory, DocumentOwnerType } from '@prisma/client';
import {
	validateDocumentFile,
	validateStorageKey,
	DocumentValidationError,
	type SanitizedFileMetadata
} from './document-file-validation';

/**
 * Base storage directory for documents
 */
const STORAGE_BASE_DIR = resolve(process.cwd(), 'storage/private/documents');

/**
 * Storage service for document files
 */
export class DocumentStorageService {
	/**
	 * Generate a secure storage key for a document
	 * Format: {ownerType}/{ownerId}/{category}/{year}/{month}/{uuid}.{ext}
	 */
	generateStorageKey(params: {
		ownerType: DocumentOwnerType;
		ownerId: string;
		category: DocumentCategory;
		extension: string;
	}): string {
		// Validate ownerId for path traversal
		this.validateOwnerId(params.ownerId);

		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const uuid = crypto.randomUUID();

		const storageKey = `${params.ownerType}/${params.ownerId}/${params.category}/${year}/${month}/${uuid}.${params.extension}`;

		// Validate the generated storage key
		validateStorageKey(storageKey);

		return storageKey;
	}

	/**
	 * Validate ownerId to prevent path traversal
	 */
	private validateOwnerId(ownerId: string): void {
		// Prevent path traversal
		if (ownerId.includes('..') || ownerId.includes('/') || ownerId.includes('\\')) {
			throw new DocumentValidationError(
				'Invalid ownerId: contains path traversal characters',
				'INVALID_FILENAME'
			);
		}

		// Prevent absolute paths
		if (ownerId.startsWith('/')) {
			throw new DocumentValidationError(
				'Invalid ownerId: absolute paths not allowed',
				'INVALID_FILENAME'
			);
		}

		// Ensure ownerId only contains safe characters
		const safePattern = /^[a-zA-Z0-9_-]+$/;
		if (!safePattern.test(ownerId)) {
			throw new DocumentValidationError(
				'Invalid ownerId: contains unsafe characters',
				'INVALID_FILENAME'
			);
		}
	}

	/**
	 * Calculate SHA-256 hash of file content
	 */
	async calculateSha256(file: File): Promise<string> {
		const buffer = await file.arrayBuffer();
		const hash = createHash('sha256');
		hash.update(Buffer.from(buffer));
		return hash.digest('hex');
	}

	/**
	 * Save a document file to storage
	 */
	async saveDocumentFile(params: { file: File; storageKey: string }): Promise<void> {
		// Validate storage key
		validateStorageKey(params.storageKey);

		// Validate file
		validateDocumentFile(params.file);

		// Calculate full file path
		const filePath = this.getFilePath(params.storageKey);

		// Ensure directory exists
		const directory = filePath.substring(0, filePath.lastIndexOf('/'));
		await fs.mkdir(directory, { recursive: true });

		// Check if file already exists
		try {
			await fs.access(filePath);
			throw new Error(`File already exists at ${filePath}`);
		} catch (error) {
			// File doesn't exist, which is what we want
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw error;
			}
		}

		// Write file
		const buffer = Buffer.from(await params.file.arrayBuffer());
		await fs.writeFile(filePath, buffer);
	}

	/**
	 * Get the absolute file path for a storage key
	 */
	getFilePath(storageKey: string): string {
		// Validate storage key
		validateStorageKey(storageKey);

		// Resolve absolute path
		const absolutePath = resolve(STORAGE_BASE_DIR, storageKey);

		// Ensure path is within storage directory (prevent path traversal)
		const resolvedBase = resolve(STORAGE_BASE_DIR);
		if (!absolutePath.startsWith(resolvedBase)) {
			throw new Error(`Path traversal detected: ${storageKey}`);
		}

		return absolutePath;
	}

	/**
	 * Check if a document file exists
	 */
	async documentFileExists(storageKey: string): Promise<boolean> {
		try {
			const filePath = this.getFilePath(storageKey);
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Read a document file
	 */
	async readDocumentFile(storageKey: string): Promise<Buffer> {
		const filePath = this.getFilePath(storageKey);
		return await fs.readFile(filePath);
	}

	/**
	 * Delete a document file (for cleanup only)
	 * This should only be used for test cleanup, not functional user flows
	 */
	async deleteDocumentFileForCleanup(storageKey: string): Promise<void> {
		const filePath = this.getFilePath(storageKey);
		await fs.unlink(filePath);
	}

	/**
	 * Get the storage base directory
	 */
	getStorageBaseDir(): string {
		return STORAGE_BASE_DIR;
	}
}

/**
 * Singleton instance
 */
export const documentStorageService = new DocumentStorageService();
