import { DocumentCategory } from '@prisma/client';

/**
 * Allowed MIME types for document uploads
 */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
	'application/pdf': ['.pdf'],
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validation error types
 */
export class DocumentValidationError extends Error {
	constructor(
		message: string,
		public code: 'INVALID_MIME_TYPE' | 'INVALID_EXTENSION' | 'FILE_TOO_LARGE' | 'INVALID_FILENAME'
	) {
		super(message);
		this.name = 'DocumentValidationError';
	}
}

/**
 * Sanitized file metadata
 */
export interface SanitizedFileMetadata {
	originalName: string;
	sanitizedName: string;
	extension: string;
	mimeType: string;
	sizeBytes: number;
}

/**
 * Validate and sanitize a document file
 */
export function validateDocumentFile(file: File): SanitizedFileMetadata {
	// Validate MIME type
	if (!isAllowedMimeType(file.type)) {
		throw new DocumentValidationError(
			`MIME type ${file.type} is not allowed`,
			'INVALID_MIME_TYPE'
		);
	}

	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		throw new DocumentValidationError(
			`File size ${file.size} bytes exceeds maximum ${MAX_FILE_SIZE} bytes`,
			'FILE_TOO_LARGE'
		);
	}

	// Extract and validate extension
	const extension = extractExtension(file.name);
	if (!isAllowedExtension(file.type, extension)) {
		throw new DocumentValidationError(
			`Extension ${extension} is not allowed for MIME type ${file.type}`,
			'INVALID_EXTENSION'
		);
	}

	// Sanitize filename
	const sanitizedName = sanitizeFilename(file.name);

	return {
		originalName: file.name,
		sanitizedName,
		extension,
		mimeType: file.type,
		sizeBytes: file.size
	};
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
	return Object.keys(ALLOWED_MIME_TYPES).includes(mimeType);
}

/**
 * Check if extension is allowed for given MIME type
 */
export function isAllowedExtension(mimeType: string, extension: string): boolean {
	const allowedExtensions = ALLOWED_MIME_TYPES[mimeType];
	if (!allowedExtensions) return false;
	const normalizedExtension = extension.toLowerCase();
	return allowedExtensions.includes(normalizedExtension);
}

/**
 * Extract file extension from filename (includes the dot)
 */
export function extractExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	if (lastDot === -1) {
		return '';
	}
	return filename.slice(lastDot).toLowerCase();
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
	// Remove path separators and dangerous characters
	const sanitized = filename
		.replace(/[\/\\]/g, '_') // Replace path separators
		.replace(/\.\./g, '_') // Prevent path traversal
		.replace(/[<>:"|?*]/g, '_') // Remove Windows invalid characters
		.replace(/[\x00-\x1f\x80-\x9f]/g, '_') // Remove control characters
		.trim();

	// Ensure filename is not empty after sanitization
	if (!sanitized) {
		return 'unnamed';
	}

	return sanitized;
}

/**
 * Validate storage key for path traversal
 */
export function validateStorageKey(storageKey: string): void {
	// Prevent path traversal
	if (storageKey.includes('..') || storageKey.includes('\\')) {
		throw new DocumentValidationError(
			'Invalid storage key: potential path traversal detected',
			'INVALID_FILENAME'
		);
	}

	// Prevent absolute paths
	if (storageKey.startsWith('/')) {
		throw new DocumentValidationError(
			'Invalid storage key: absolute paths not allowed',
			'INVALID_FILENAME'
		);
	}

	// Ensure storage key only contains safe characters
	const safePattern = /^[a-zA-Z0-9_\-\/.]+$/;
	if (!safePattern.test(storageKey)) {
		throw new DocumentValidationError(
			'Invalid storage key: contains unsafe characters',
			'INVALID_FILENAME'
		);
	}
}
